# Backend Migration (Django → Node/Express) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Django REST backend with a production Node/Express + TypeScript + Prisma backend that preserves the HTTP API contract exactly (paths, payloads, response shapes, status codes), so the React frontend needs zero API-layer changes.

**Architecture:** Layered Express app — routes → controllers (thin) → services (all business logic) → Prisma. A presenter layer reproduces each DRF serializer's JSON exactly (snake_case keys, decimals-as-strings, nested reads). Zod validates input; central error middleware emits DRF-style error bodies. JWT (HS256) access/refresh with a blacklist table; bcrypt password hashing.

**Tech Stack:** Node 20, Express 4, TypeScript, Prisma + PostgreSQL, Zod, jsonwebtoken, bcrypt, multer, csv-parse/csv-stringify, pdfkit, nodemailer, Vitest + Supertest.

**Reference:** The legacy Django source is the behavioral spec. Read it before each module:
- Auth: `backend/apps/accounts/{models,views,serializers}.py`
- Transactions: `backend/apps/transactions/{models,views,serializers}.py`
- Categories/Budgets: `backend/apps/categories/{models,views,serializers,services}.py`
- Splits: `backend/apps/splits/{models,views,serializers}.py`
- Reports: `backend/apps/reports/{models,views}.py`
- Settings: `backend/config/settings.py`
- Design spec: `docs/superpowers/specs/2026-06-09-node-redux-migration-design.md`

> **Working location:** Build the new backend in a temporary sibling dir `backend-node/` to keep the Django source readable as reference. The final task moves it into place and deletes Python. This avoids destroying the reference mid-build.

---

## Phase 0 — Scaffold

### Task 1: Project init + tooling

**Files:**
- Create: `backend-node/package.json`
- Create: `backend-node/tsconfig.json`
- Create: `backend-node/vitest.config.ts`
- Create: `backend-node/.env.example`
- Create: `backend-node/.gitignore`
- Create: `backend-node/.env` (local, gitignored)

- [ ] **Step 1: Init package and install deps**

Run:
```bash
cd backend-node && npm init -y
npm i express cors cookie-parser morgan helmet jsonwebtoken bcrypt zod @prisma/client multer csv-parse csv-stringify pdfkit nodemailer
npm i -D typescript tsx prisma vitest supertest @types/express @types/node @types/cors @types/cookie-parser @types/morgan @types/jsonwebtoken @types/bcrypt @types/multer @types/supertest @types/nodemailer
npx tsc --init
```

- [ ] **Step 2: Write `package.json` scripts**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "prisma migrate dev",
    "seed": "tsx prisma/seed.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: `tsconfig.json`** — set `"module": "ES2022"`, `"moduleResolution": "Bundler"`, `"target": "ES2022"`, `"strict": true`, `"esModuleInterop": true`, `"outDir": "dist"`, `"rootDir": "src"`, `"skipLibCheck": true`, `"resolveJsonModule": true`.

- [ ] **Step 4: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'node', globals: true, fileParallelism: false, hookTimeout: 30000 },
})
```

- [ ] **Step 5: `.env.example`** — copy the env block from the design spec (DATABASE_URL, JWT_SECRET, JWT_ACCESS_TTL_MIN=15, JWT_REFRESH_TTL_DAYS=7, CORS_ALLOWED_ORIGINS, PORT=8000, EMAIL_* , DEFAULT_FROM_EMAIL). Create `.env` with real local values (Postgres `expense_manager`). `.gitignore`: `node_modules`, `dist`, `.env`.

- [ ] **Step 6: Commit**

```bash
git add backend-node && git commit -m "chore(backend): scaffold node/express project"
```

---

### Task 2: Prisma schema + client singleton

**Files:**
- Create: `backend-node/prisma/schema.prisma`
- Create: `backend-node/src/lib/prisma.ts`

- [ ] **Step 1: Write `schema.prisma`** (model parity with Django; snake_case columns via `@map`, snake_case tables via `@@map`)

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  firstName   String   @default("") @map("first_name")
  lastName    String   @default("") @map("last_name")
  password    String
  isActive    Boolean  @default(true) @map("is_active")
  isStaff     Boolean  @default(false) @map("is_staff")
  dateJoined  DateTime @default(now()) @map("date_joined")
  profile          UserProfile?
  resetTokens      PasswordResetToken[]
  refreshTokens    RefreshToken[]
  categories       Category[]
  budgets          Budget[]
  tags             Tag[]
  transactions     Transaction[]
  recurringRules   RecurringRule[]
  createdGroups    SplitGroup[]        @relation("GroupCreator")
  groupMemberships SplitGroupMember[]
  paidExpenses     SplitExpense[]
  importJobs       ImportJob[]
  @@map("accounts_user")
}

model UserProfile {
  id        Int     @id @default(autoincrement())
  userId    Int     @unique @map("user_id")
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  avatarUrl String  @default("") @map("avatar_url")
  currency  String  @default("INR")
  timezone  String  @default("UTC")
  theme     String  @default("system")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("accounts_userprofile")
}

model PasswordResetToken {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique @default(uuid())
  createdAt DateTime @default(now()) @map("created_at")
  expiresAt DateTime @map("expires_at")
  isUsed    Boolean  @default(false) @map("is_used")
  @@map("accounts_passwordresettoken")
}

model RefreshToken {
  id          Int      @id @default(autoincrement())
  jti         String   @unique
  userId      Int      @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  blacklisted Boolean  @default(false)
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")
  @@map("accounts_refreshtoken")
}

model Category {
  id        Int      @id @default(autoincrement())
  userId    Int?     @map("user_id")
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  icon      String   @default("tag")
  color     String   @default("#6366f1")
  type      String   @default("both")   // income | expense | both
  isDefault Boolean  @default(false) @map("is_default")
  createdAt DateTime @default(now()) @map("created_at")
  budgets       Budget[]
  transactions  Transaction[]
  recurringRules RecurringRule[]
  @@map("categories_category")
}

model Budget {
  id             Int      @id @default(autoincrement())
  userId         Int      @map("user_id")
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId     Int      @map("category_id")
  category       Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  period         String   @default("monthly")  // weekly | monthly
  month          DateTime @db.Date
  limitAmount    Decimal  @map("limit_amount") @db.Decimal(12, 2)
  alertThreshold Int      @default(80) @map("alert_threshold")
  alerts         BudgetAlert[]
  @@unique([userId, categoryId, period])
  @@map("categories_budget")
}

model BudgetAlert {
  id             Int      @id @default(autoincrement())
  budgetId       Int      @map("budget_id")
  budget         Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  triggeredAt    DateTime @default(now()) @map("triggered_at")
  percentageUsed Decimal  @map("percentage_used") @db.Decimal(6, 2)
  periodStart    DateTime? @map("period_start") @db.Date
  level          String   @default("warning") // warning | exceeded
  @@map("categories_budgetalert")
}

model Tag {
  id     Int    @id @default(autoincrement())
  userId Int    @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  name   String
  color  String @default("#6366f1")
  transactions Transaction[] @relation("TransactionTags")
  @@unique([userId, name])
  @@map("transactions_tag")
}

model Transaction {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        String   // income | expense
  amount      Decimal  @db.Decimal(12, 2)
  categoryId  Int?     @map("category_id")
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  date        DateTime @db.Date
  description String
  receiptUrl  String   @default("") @map("receipt_url")
  receiptFile String?  @map("receipt_file")
  notes       String   @default("")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  tags        Tag[]    @relation("TransactionTags")
  @@index([userId, date])
  @@map("transactions_transaction")
}

model RecurringRule {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        String
  amount      Decimal  @db.Decimal(12, 2)
  categoryId  Int?     @map("category_id")
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  description String
  frequency   String   // daily|weekly|monthly|yearly
  startDate   DateTime @map("start_date") @db.Date
  nextRun     DateTime @map("next_run") @db.Date
  endDate     DateTime? @map("end_date") @db.Date
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  @@map("transactions_recurringrule")
}

model SplitGroup {
  id          Int      @id @default(autoincrement())
  name        String
  createdById Int      @map("created_by_id")
  createdBy   User     @relation("GroupCreator", fields: [createdById], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now()) @map("created_at")
  members     SplitGroupMember[]
  expenses    SplitExpense[]
  settlements SplitSettlement[]
  @@map("splits_splitgroup")
}

model GuestUser {
  id    Int    @id @default(autoincrement())
  name  String
  email String @default("")
  memberships  SplitGroupMember[]
  paidExpenses SplitExpense[]
  @@map("splits_guestuser")
}

model SplitGroupMember {
  id          Int        @id @default(autoincrement())
  groupId     Int        @map("group_id")
  group       SplitGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  userId      Int?       @map("user_id")
  user        User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  guestUserId Int?       @map("guest_user_id")
  guestUser   GuestUser? @relation(fields: [guestUserId], references: [id], onDelete: Cascade)
  joinedAt    DateTime   @default(now()) @map("joined_at")
  shares             SplitExpenseShare[]
  settlementsPaid    SplitSettlement[] @relation("PayerMember")
  settlementsRecv    SplitSettlement[] @relation("ReceiverMember")
  @@map("splits_splitgroupmember")
}

model SplitExpense {
  id          Int        @id @default(autoincrement())
  groupId     Int        @map("group_id")
  group       SplitGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidByUserId  Int?     @map("paid_by_user_id")
  paidByUser    User?    @relation(fields: [paidByUserId], references: [id], onDelete: SetNull)
  paidByGuestId Int?     @map("paid_by_guest_id")
  paidByGuest   GuestUser? @relation(fields: [paidByGuestId], references: [id], onDelete: SetNull)
  amount      Decimal    @db.Decimal(12, 2)
  description String
  date        DateTime   @db.Date
  splitType   String     @default("equal") @map("split_type")
  createdAt   DateTime   @default(now()) @map("created_at")
  shares      SplitExpenseShare[]
  @@map("splits_splitexpense")
}

model SplitExpenseShare {
  id          Int      @id @default(autoincrement())
  expenseId   Int      @map("expense_id")
  expense     SplitExpense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  memberId    Int      @map("member_id")
  member      SplitGroupMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  shareAmount Decimal  @map("share_amount") @db.Decimal(12, 2)
  isSettled   Boolean  @default(false) @map("is_settled")
  @@map("splits_splitexpenseshare")
}

model SplitSettlement {
  id               Int      @id @default(autoincrement())
  groupId          Int      @map("group_id")
  group            SplitGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  payerMemberId    Int      @map("payer_member_id")
  payerMember      SplitGroupMember @relation("PayerMember", fields: [payerMemberId], references: [id], onDelete: Cascade)
  receiverMemberId Int      @map("receiver_member_id")
  receiverMember   SplitGroupMember @relation("ReceiverMember", fields: [receiverMemberId], references: [id], onDelete: Cascade)
  amount           Decimal  @db.Decimal(12, 2)
  settledAt        DateTime @default(now()) @map("settled_at")
  note             String   @default("")
  @@map("splits_splitsettlement")
}

model ImportJob {
  id           Int      @id @default(autoincrement())
  userId       Int      @map("user_id")
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fileName     String   @map("file_name")
  status       String   @default("pending")
  totalRows    Int      @default(0) @map("total_rows")
  importedRows Int      @default(0) @map("imported_rows")
  errorsJson   Json     @default("[]") @map("errors_json")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  @@map("reports_importjob")
}
```

- [ ] **Step 2: `src/lib/prisma.ts`**

```ts
import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()
```

- [ ] **Step 3: Create DB + migrate**

Run: `cd backend-node && npx prisma migrate dev --name init`
Expected: migration applied, client generated.

- [ ] **Step 4: Commit**

```bash
git add backend-node/prisma backend-node/src/lib/prisma.ts && git commit -m "feat(backend): prisma schema + client"
```

---

### Task 3: Env config, error utils, app factory

**Files:**
- Create: `backend-node/src/config/env.ts`
- Create: `backend-node/src/utils/apiError.ts`
- Create: `backend-node/src/utils/asyncHandler.ts`
- Create: `backend-node/src/utils/paginate.ts`
- Create: `backend-node/src/middleware/error.ts`
- Create: `backend-node/src/middleware/validate.ts`
- Create: `backend-node/src/types/express.d.ts`
- Create: `backend-node/src/app.ts`
- Create: `backend-node/src/index.ts`
- Create: `backend-node/src/routes/index.ts`

- [ ] **Step 1: `config/env.ts`** — Zod-validate `process.env`, coerce numbers, split `CORS_ALLOWED_ORIGINS` on comma. Export typed `env`. Throw on missing `DATABASE_URL`/`JWT_SECRET`.

- [ ] **Step 2: `utils/apiError.ts`**

```ts
export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(typeof body === 'string' ? body : JSON.stringify(body))
  }
  static detail(status: number, detail: string) { return new ApiError(status, { detail }) }
}
```

- [ ] **Step 3: `utils/asyncHandler.ts`**

```ts
import type { Request, Response, NextFunction } from 'express'
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)
```

- [ ] **Step 4: `utils/paginate.ts`** — DRF PageNumberPagination parity.

```ts
import type { Request } from 'express'
export const PAGE_SIZE = 20
export function paginate<T>(req: Request, count: number, results: T[], page: number) {
  const base = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const q = (p: number) => { const s = new URLSearchParams(req.query as Record<string,string>); s.set('page', String(p)); return `${base}?${s}` }
  return {
    count,
    next: page < totalPages ? q(page + 1) : null,
    previous: page > 1 ? q(page - 1) : null,
    results,
  }
}
```

- [ ] **Step 5: `middleware/error.ts`** — if `err instanceof ApiError` send `err.status`/`err.body`; if Zod error → 400 with `{field:[msgs]}` built from `err.flatten().fieldErrors`; else 500 `{detail:"Internal server error"}` (log it).

- [ ] **Step 6: `middleware/validate.ts`** — `validate(schema, source='body')` returns middleware that parses `req[source]` with Zod and assigns parsed back; throws ZodError (caught by error mw).

- [ ] **Step 7: `types/express.d.ts`**

```ts
import 'express'
declare global {
  namespace Express {
    interface Request { user?: { id: number; email: string } }
  }
}
```

- [ ] **Step 8: `src/app.ts`** — `createApp()`: helmet, cors (origins from env, credentials true), json, urlencoded, cookieParser, morgan('dev'); mount `routes` at `/api`; then error middleware last. Export `createApp`.

- [ ] **Step 9: `src/index.ts`** — `createApp().listen(env.PORT)`.

- [ ] **Step 10: `src/routes/index.ts`** — Router that will mount sub-routers (empty for now, add a `GET /health` → `{status:'ok'}`).

- [ ] **Step 11: Smoke test**

Run: `npm run dev` then `curl -s localhost:8000/api/health`
Expected: `{"status":"ok"}`

- [ ] **Step 12: Commit**

```bash
git add backend-node/src && git commit -m "feat(backend): app factory, env, error+validate middleware"
```

---

## Phase 1 — Auth (unblocks everything)

### Task 4: JWT lib + auth middleware

**Files:**
- Create: `backend-node/src/lib/jwt.ts`
- Create: `backend-node/src/middleware/auth.ts`
- Test: `backend-node/tests/jwt.test.ts`

- [ ] **Step 1: Write failing test `tests/jwt.test.ts`**

```ts
import { signAccess, signRefresh, verifyAccess, verifyRefresh } from '../src/lib/jwt.js'
test('access token round-trips', () => {
  const t = signAccess({ id: 1, email: 'a@b.com' })
  expect(verifyAccess(t).id).toBe(1)
})
test('refresh token carries jti', () => {
  const { token, jti } = signRefresh(1, false)
  expect(verifyRefresh(token).jti).toBe(jti)
})
```

- [ ] **Step 2: Run** `npx vitest run tests/jwt.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/jwt.ts`**

```ts
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { env } from '../config/env.js'

export function signAccess(user: { id: number; email: string }) {
  return jwt.sign({ sub: user.id, email: user.email, type: 'access' }, env.JWT_SECRET,
    { expiresIn: `${env.JWT_ACCESS_TTL_MIN}m`, algorithm: 'HS256' })
}
export function verifyAccess(token: string) {
  const p = jwt.verify(token, env.JWT_SECRET) as any
  return { id: Number(p.sub), email: p.email as string }
}
export function signRefresh(userId: number, remember: boolean) {
  const jti = randomUUID()
  const days = remember ? 30 : env.JWT_REFRESH_TTL_DAYS
  const token = jwt.sign({ sub: userId, jti, type: 'refresh' }, env.JWT_SECRET,
    { expiresIn: `${days}d`, algorithm: 'HS256' })
  const expiresAt = new Date(Date.now() + days * 86400_000)
  return { token, jti, expiresAt }
}
export function verifyRefresh(token: string) {
  const p = jwt.verify(token, env.JWT_SECRET) as any
  return { userId: Number(p.sub), jti: p.jti as string }
}
```

- [ ] **Step 4: Run test** → PASS.

- [ ] **Step 5: `src/middleware/auth.ts`** — read `Authorization: Bearer <t>`; on missing/invalid throw `ApiError.detail(401, 'Authentication credentials were not provided.')`; else `verifyAccess`, set `req.user`, `next()`. (401 body keys the frontend axios refresh interceptor.)

- [ ] **Step 6: Commit**

```bash
git add backend-node/src/lib/jwt.ts backend-node/src/middleware/auth.ts backend-node/tests/jwt.test.ts && git commit -m "feat(backend): jwt lib + auth middleware"
```

---

### Task 5: User presenter + auth validators

**Files:**
- Create: `backend-node/src/presenters/user.presenter.ts`
- Create: `backend-node/src/validators/auth.schema.ts`

- [ ] **Step 1: `presenters/user.presenter.ts`** — reproduce `UserSerializer`:

```ts
export function presentUser(u: any) {
  return {
    id: u.id, email: u.email, first_name: u.firstName, last_name: u.lastName,
    full_name: `${u.firstName} ${u.lastName}`.trim() || u.email,
    profile: u.profile ? {
      avatar_url: u.profile.avatarUrl, currency: u.profile.currency,
      timezone: u.profile.timezone, theme: u.profile.theme,
    } : null,
    date_joined: u.dateJoined,
  }
}
```

- [ ] **Step 2: `validators/auth.schema.ts`** — Zod for register (email, first_name?, last_name?, password min 8, password_confirm, currency default 'INR'; `.refine` passwords match → error on `password_confirm`), login (email, password, remember_me default false), passwordReset (email), passwordResetConfirm (token uuid, new_password min 8, new_password_confirm; refine match), changePassword (current_password, new_password min 8, new_password_confirm; refine match), profileUpdate (first_name?, last_name?, profile?{avatar_url?,currency?,timezone?,theme?}).

- [ ] **Step 3: Commit**

```bash
git add backend-node/src/presenters/user.presenter.ts backend-node/src/validators/auth.schema.ts && git commit -m "feat(backend): user presenter + auth validators"
```

---

### Task 6: Auth service + controller + routes (TDD)

**Files:**
- Create: `backend-node/src/services/auth.service.ts`
- Create: `backend-node/src/controllers/auth.controller.ts`
- Create: `backend-node/src/routes/auth.routes.ts`
- Create: `backend-node/tests/helpers/db.ts`
- Test: `backend-node/tests/auth.test.ts`
- Modify: `backend-node/src/routes/index.ts` (mount `auth`)

- [ ] **Step 1: `tests/helpers/db.ts`** — export `resetDb()` that truncates all tables (raw SQL `TRUNCATE ... RESTART IDENTITY CASCADE`) and `request` = `supertest(createApp())`. Call `resetDb()` in `beforeEach`.

- [ ] **Step 2: Write failing `tests/auth.test.ts`**

```ts
import { request, resetDb } from './helpers/db.js'
beforeEach(resetDb)
const creds = { email: 'a@b.com', password: 'secret123', password_confirm: 'secret123', first_name: 'Al', currency: 'INR' }

test('register returns user+tokens and creates profile', async () => {
  const r = await request.post('/api/auth/register/').send(creds)
  expect(r.status).toBe(201)
  expect(r.body.user.email).toBe('a@b.com')
  expect(r.body.user.profile.currency).toBe('INR')
  expect(r.body.access).toBeTruthy(); expect(r.body.refresh).toBeTruthy()
})
test('login then access protected profile', async () => {
  await request.post('/api/auth/register/').send(creds)
  const l = await request.post('/api/auth/login/').send({ email: creds.email, password: creds.password })
  expect(l.status).toBe(200)
  const p = await request.get('/api/auth/profile/').set('Authorization', `Bearer ${l.body.access}`)
  expect(p.body.email).toBe('a@b.com')
})
test('refresh issues new access; logout blacklists', async () => {
  await request.post('/api/auth/register/').send(creds)
  const l = await request.post('/api/auth/login/').send({ email: creds.email, password: creds.password })
  const rf = await request.post('/api/auth/refresh/').send({ refresh: l.body.refresh })
  expect(rf.body.access).toBeTruthy()
  await request.post('/api/auth/logout/').set('Authorization', `Bearer ${l.body.access}`).send({ refresh: l.body.refresh })
  const after = await request.post('/api/auth/refresh/').send({ refresh: l.body.refresh })
  expect(after.status).toBe(401)
})
test('login rejects bad password with 400', async () => {
  await request.post('/api/auth/register/').send(creds)
  const l = await request.post('/api/auth/login/').send({ email: creds.email, password: 'wrong' })
  expect(l.status).toBe(400)
})
```

- [ ] **Step 3: Run** `npx vitest run tests/auth.test.ts` → FAIL.

- [ ] **Step 4: Implement `services/auth.service.ts`** — functions:
  - `register(data)`: bcrypt.hash(password,12); create User + nested UserProfile (currency); return `{ user(withProfile), access, refresh }` using jwt + persist RefreshToken row.
  - `login(email,password,remember)`: find user w/ profile; `bcrypt.compare`; if no user/bad → throw `ApiError(400, {non_field_errors:['Invalid email or password']})`; if `!isActive` → 400 disabled; issue tokens (remember → 30d), persist RefreshToken.
  - `refresh(token)`: `verifyRefresh`; look up RefreshToken by jti; if missing/blacklisted/expired → throw `ApiError.detail(401,'Token is invalid or expired')`; return `{access}` for the user.
  - `logout(token)`: best-effort verify + mark RefreshToken blacklisted.
  - `requestPasswordReset(email)`: if user exists create PasswordResetToken (expires +2h); always resolve (no enumeration).
  - `confirmReset(token,newPw)`: load token; validate not used & not expired else `ApiError(400,{token:['Invalid or expired']})`; set bcrypt hash; mark used.
  - `getProfile(userId)` / `updateProfile(userId,data)` (nested first_name/last_name + profile fields) / `changePassword(userId,current,next)` (verify current via bcrypt else `ApiError(400,{current_password:['Current password is incorrect']})`).

- [ ] **Step 5: `controllers/auth.controller.ts`** — thin handlers calling the service, `presentUser` for user output. `login` sets httpOnly `refresh_token` cookie (maxAge 30d, sameSite 'lax') when `remember_me`. `logout` clears cookie. `refresh` also reads `req.cookies.refresh_token` as fallback. All wrapped in `asyncHandler`.

- [ ] **Step 6: `routes/auth.routes.ts`** — wire each path from the spec's Auth table; apply `validate(schema)` on POSTs; `requireAuth` on profile/logout/change-password. Mount in `routes/index.ts` at `/auth`.

- [ ] **Step 7: Run** `npx vitest run tests/auth.test.ts` → PASS.

- [ ] **Step 8: Commit**

```bash
git add backend-node/src backend-node/tests && git commit -m "feat(backend): auth module (register/login/refresh/logout/profile/reset)"
```

---

## Phase 2 — Categories + Budgets

### Task 7: Category presenter + service + CRUD (TDD)

**Files:**
- Create: `backend-node/src/presenters/category.presenter.ts`
- Create: `backend-node/src/services/category.service.ts`
- Create: `backend-node/src/validators/category.schema.ts`
- Create: `backend-node/src/controllers/category.controller.ts`
- Create: `backend-node/src/routes/category.routes.ts`
- Test: `backend-node/tests/category.test.ts`
- Modify: `backend-node/src/routes/index.ts`

- [ ] **Step 1: `presenters/category.presenter.ts`** — `presentCategory(c)` → `{id,name,icon,color,type,is_default,created_at}`.

- [ ] **Step 2: Failing `tests/category.test.ts`** — register+login helper (extract to `tests/helpers/auth.ts` returning `{access}`); test: list returns global defaults + own; create category; PATCH own; DELETE own; PATCH a default (userId null) → 403; filter shows both own and defaults.

```ts
test('cannot modify default category', async () => {
  const { access } = await authed()  // helper
  // seed a default category directly via prisma in the test
  const def = await prisma.category.create({ data: { name: 'Food', isDefault: true, userId: null } })
  const r = await request.patch(`/api/categories/${def.id}/`).set(auth(access)).send({ name: 'X' })
  expect(r.status).toBe(403)
})
```

- [ ] **Step 3: Run** → FAIL.

- [ ] **Step 4: `services/category.service.ts`** — `list(userId)`: `where: { OR: [{userId}, {userId:null}] }` order by name. `create(userId,data)`. `update(userId,id,data)`: load; if `category.userId === null` throw `ApiError.detail(403,'Cannot modify default categories')`; update. `remove(userId,id)`: same default guard → 403; delete.

- [ ] **Step 5: validators** — category schema (name, icon?, color?, type∈{income,expense,both}).

- [ ] **Step 6: controller + routes** — `requireAuth`; routes `GET '/'`, `POST '/'`, `PATCH '/:id/'`, `DELETE '/:id/'`. **Do not** register budgets here yet. Mount at `/categories`.

- [ ] **Step 7: Run** → PASS. Commit `feat(backend): categories CRUD with default-category guard`.

---

### Task 8: Budget service (period math) — pure unit first

**Files:**
- Create: `backend-node/src/services/budget.service.ts`
- Test: `backend-node/tests/budget-period.test.ts`

- [ ] **Step 1: Failing `tests/budget-period.test.ts`**

```ts
import { periodRange } from '../src/services/budget.service.js'
test('weekly = Monday..Sunday', () => {
  const [s, e] = periodRange('weekly', new Date('2026-06-10')) // Wed
  expect(s.toISOString().slice(0,10)).toBe('2026-06-08')
  expect(e.toISOString().slice(0,10)).toBe('2026-06-14')
})
test('monthly = 1st..last', () => {
  const [s, e] = periodRange('monthly', new Date('2026-06-10'))
  expect(s.toISOString().slice(0,10)).toBe('2026-06-01')
  expect(e.toISOString().slice(0,10)).toBe('2026-06-30')
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `periodRange(period, today=new Date())`** in `budget.service.ts` — weekly: Monday (today - ((day+6)%7)) to +6 days; monthly: first to last day of month. Return `[start, end]` as UTC dates (use date-only construction to avoid TZ drift). Mirror `backend/apps/categories/models.py::period_range`.

- [ ] **Step 4: Run** → PASS. Commit `feat(backend): budget period range`.

---

### Task 9: Budget presenter + service + CRUD + alerts (TDD)

**Files:**
- Create: `backend-node/src/presenters/budget.presenter.ts`
- Modify: `backend-node/src/services/budget.service.ts`
- Create: `backend-node/src/lib/mailer.ts`
- Create: `backend-node/templates/emails/budget_alert.{html,txt}` (copy from Django templates)
- Modify: category routes/controller to add budgets sub-resource
- Test: `backend-node/tests/budget.test.ts`

- [ ] **Step 1: `lib/mailer.ts`** — Nodemailer transport from env (`console` backend → `jsonTransport`/stream; `smtp` → real). Export `sendMail({to,subject,html,text})`. Render templates by simple `{{var}}` replace (no Django template engine needed); load the two files.

- [ ] **Step 2: `budget.service.ts` additions**:
  - `spentForBudget(userId, categoryId, start, end)`: Prisma `aggregate _sum.amount` of expense txns in range → number.
  - `presentBudget` inputs need spent/pct/period — compute in service then hand to presenter, OR presenter takes precomputed values. Choose: service builds a plain object via `buildBudgetView(budget)` that the presenter formats.
  - `checkBudgetThresholds(userId, categoryId)`: for each budget on (user,category): compute pct; level exceeded(>=100)/warning(>=threshold) else skip; dedup via `BudgetAlert` find on `(budgetId, periodStart, level)`; create alert; `sendMail` (wrap in try/catch, never throw). Mirror `services.py`.
- [ ] **Step 3: `presenters/budget.presenter.ts`** — `{id,category,category_name,category_color,category_icon,period,month,limit_amount:String,alert_threshold,spent_amount:Number,percentage_used:Number,period_start,period_end,alerts:[{id,triggered_at,percentage_used,level}]}`.

- [ ] **Step 4: Failing `tests/budget.test.ts`** — create category+budget; create an expense ≥ threshold via service; assert a BudgetAlert row exists and is not duplicated on a second expense in the same period; `GET /categories/budgets/current_month/` returns the budget with numeric `spent_amount` and `percentage_used`.

- [ ] **Step 5: Run** → FAIL.

- [ ] **Step 6: Implement budget controller actions + routes** — **route order matters**: register `GET '/budgets/current_month/'`, then `GET/POST '/budgets/'`, `PATCH/DELETE '/budgets/:id/'`, and these MUST be declared before `'/:id/'` category routes so `budgets` isn't swallowed (spec watch-item #2). `list` supports `?month=YYYY-MM` filter. `current_month` returns all user budgets (each serialized over its own current period).

- [ ] **Step 7: Run** → PASS. Commit `feat(backend): budgets CRUD + threshold alerts`.

---

## Phase 3 — Transactions

### Task 10: Tag + Transaction presenters + validators

**Files:**
- Create: `backend-node/src/presenters/transaction.presenter.ts`
- Create: `backend-node/src/validators/transaction.schema.ts`

- [ ] **Step 1: presenter** — `presentTag(t)`→`{id,name,color}`. `presentTransaction(t)`→ `{id,type,amount:String,category,category_detail:presentCategory|null,date,description,tags:tags.map(presentTag),tag_ids? omitted,receipt_url,receipt_file,notes,created_at,updated_at}`. (amount as string.)

- [ ] **Step 2: validators** — transaction create/update (type∈{income,expense}, amount numeric>0 as string/number coerce, category nullable int, date YYYY-MM-DD, description, tag_ids int[] optional, receipt_url?, notes?), tag (name, color?), recurring (type, amount, category?, description, frequency∈{daily,weekly,monthly,yearly}, start_date, end_date?, is_active?).

- [ ] **Step 3: Commit** `feat(backend): transaction presenters + validators`.

---

### Task 11: Transaction service + CRUD + filters (TDD)

**Files:**
- Create: `backend-node/src/services/transaction.service.ts`
- Create: `backend-node/src/controllers/transaction.controller.ts`
- Create: `backend-node/src/routes/transaction.routes.ts`
- Test: `backend-node/tests/transaction.test.ts`
- Modify: `backend-node/src/routes/index.ts`

- [ ] **Step 1: Failing `tests/transaction.test.ts`** — create txn (with tag_ids); list paginated returns `{count,next,previous,results}` with page size 20; filters `type`, `category`, `date_from/date_to`, `amount_min/max`, `search` (description/notes), `ordering=-date` default & `amount`; PATCH updates + re-sets tags; DELETE; creating an expense over budget threshold creates an alert (integration with budget.service).

```ts
test('list is paginated DRF-style', async () => {
  const { access } = await authed()
  for (let i=0;i<25;i++) await createTxn(access, { amount: '1.00' })
  const r = await request.get('/api/transactions/').set(auth(access))
  expect(r.body.count).toBe(25)
  expect(r.body.results).toHaveLength(20)
  expect(r.body.next).toContain('page=2')
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: `services/transaction.service.ts`**:
  - `list(userId, query)`: build Prisma `where` from filters (type; categoryId; date gte/lte; amount gte/lte; tags id `in`; `search` → `OR` description/notes `contains` insensitive); `orderBy` from `ordering` (`-date`→{date:'desc'}, `date`, `amount`, `created_at`, default `[{date:'desc'},{createdAt:'desc'}]`); page from `query.page`; `skip/take` = PAGE_SIZE; include category + tags; return `{count, results}`.
  - `create(userId, data)`: extract `tag_ids`; create txn with `tags: { connect }`; include category+tags; then `if type==='expense' && categoryId` call `checkBudgetThresholds`.
  - `update(userId,id,data)`: ensure ownership (404 if not); update; re-set tags via `set` when `tag_ids` provided; budget check.
  - `remove(userId,id)`: ownership; delete.

- [ ] **Step 4: controller + routes** — `requireAuth`; routes order: `GET '/dashboard_summary/'` (Task 12) placeholder later, tags & recurring sub-routers BEFORE `'/:id/'`. For now: `GET '/'`, `POST '/'`, `GET/PATCH/PUT/DELETE '/:id/'`. Mount at `/transactions`.

- [ ] **Step 5: Run** → PASS. Commit `feat(backend): transactions CRUD + filters + budget hook`.

---

### Task 12: Dashboard summary (TDD)

**Files:**
- Modify: `backend-node/src/services/transaction.service.ts`
- Modify: transaction controller + routes
- Test: `backend-node/tests/dashboard.test.ts`

- [ ] **Step 1: Failing `tests/dashboard.test.ts`** — seed income/expense in current & previous month; assert `total_income/total_expense/net_balance`, `income_change_pct` formula (prev==0 & cur>0 → 100.0), `monthly_breakdown` length 6 with `{month:'YYYY-MM',income,expense}`, `top_categories` sorted desc with name/color/icon.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `dashboardSummary(userId)`** — mirror `transactions/views.py::dashboard_summary`. Use proper month arithmetic (not the `i*28` hack — produce the last 6 calendar months ending this month). `pctChange(cur,prev)` exactly as Django. Numbers (not strings) for all amounts here. `route GET '/dashboard_summary/'` declared before `'/:id/'`.

- [ ] **Step 4: Run** → PASS. Commit `feat(backend): dashboard summary`.

---

### Task 13: Tags + Recurring sub-resources (TDD)

**Files:**
- Modify: transaction service/controller/routes (or split into `tag.*`/`recurring.*` — keep in transaction module per Django grouping)
- Test: `backend-node/tests/tags-recurring.test.ts`

- [ ] **Step 1: Failing test** — CRUD `/transactions/tags/` (list/create/patch/delete, scoped to user, unique per user); CRUD `/transactions/recurring/` (create seeds `next_run = start_date`).

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** tag service (list/create/update/delete by user) + recurring service (create sets nextRun=startDate). Routes mounted BEFORE `'/:id/'` so `tags`/`recurring` aren't captured as ids.

- [ ] **Step 4: Run** → PASS. Commit `feat(backend): tags + recurring rules`.

---

## Phase 4 — Splits

### Task 14: Split presenters + member/group service (TDD)

**Files:**
- Create: `backend-node/src/presenters/split.presenter.ts`
- Create: `backend-node/src/services/split.service.ts`
- Create: `backend-node/src/validators/split.schema.ts`
- Create: `backend-node/src/controllers/split.controller.ts`
- Create: `backend-node/src/routes/split.routes.ts`
- Test: `backend-node/tests/split-group.test.ts`
- Modify: `routes/index.ts`

- [ ] **Step 1: presenters** — `memberDisplayName(m)`; `presentMember`, `presentGroup` (members[], expense_count, created_by_email), `presentExpense` (paid_by_name, shares[], amount string), `presentSettlement`.

- [ ] **Step 2: Failing `tests/split-group.test.ts`** — create group (creator auto-added as member, `expense_count:0`); list groups returns groups where user is creator or member; `add_member` with `guest_user:{name}` adds a guest member; `add_member` with `user_id` adds a user member.

- [ ] **Step 3: Run** → FAIL.

- [ ] **Step 4: service** — `createGroup(userId,name)` (create group + creator member in a `$transaction`); `listGroups(userId)` (`OR` createdBy/members.some.user); `getGroup`; `addMember(groupId, {user_id|guest_user})` (mirror views.py: user_id→get-or-create member; guest→create GuestUser+member; else 400). validators for group(name) + addMember.

- [ ] **Step 5: routes** — groups: `GET/POST '/groups/'`, `GET/PATCH/DELETE '/groups/:id/'`, `POST '/groups/:id/add_member/'`, plus balances/settle (next task). Mount at `/splits`.

- [ ] **Step 6: Run** → PASS. Commit `feat(backend): split groups + members`.

---

### Task 15: Split expenses + share creation (TDD)

**Files:**
- Modify: split service/controller/routes
- Test: `backend-node/tests/split-expense.test.ts`

- [ ] **Step 1: Failing test** — create expense with no `shares_data` → equal shares across all members (sum == amount); create with explicit `shares_data:[{member_id,share_amount}]` → those shares; list expenses filtered by `?group=`; delete expense.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: `createExpense(data)`** — `$transaction`: create SplitExpense; if no `shares_data`: count members, `perPerson = amount/count`, create a share per member; else create one share per entry. `listExpenses(userId, groupId?)` scoped to groups the user belongs to; include shares+member. Mirror `splits/serializers.py::create`.

- [ ] **Step 4: Run** → PASS. Commit `feat(backend): split expenses + shares`.

---

### Task 16: Balances (greedy settlement) + settle (TDD)

**Files:**
- Modify: split service/controller/routes
- Test: `backend-node/tests/split-balances.test.ts`

- [ ] **Step 1: Failing `tests/split-balances.test.ts`**

```ts
test('two members, one pays 100 split equally → other owes 50', async () => {
  // setup group with members A(creator) + guest B; expense 100 paid by A, equal split
  const bal = await request.get(`/api/splits/groups/${gid}/balances/`).set(auth(access))
  const owe = bal.body.suggested_settlements
  expect(owe).toHaveLength(1)
  expect(owe[0].amount).toBe(50)
  expect(owe[0].from_name).toBeTruthy()
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `computeBalances(groupId)`** — port `views.py::balances` exactly: net per member = sum paid (match payer member by paidByUser/paidByGuest) − unsettled shares owed; apply settlements (payer −, receiver +); greedy match positives↔negatives → `suggested_settlements:[{from_member,from_name,to_member,to_name,amount:Number}]`; `member_balances:[{member_id,member_name,balance:Number}]`. Use a cents-integer or `Decimal` accumulator to avoid float drift, but output `Number` to match Django's `float()`.
  - `settle(groupId, body)`: validate payer/receiver members + amount; create SplitSettlement; return presented settlement (201).

- [ ] **Step 4: Run** → PASS. Commit `feat(backend): split balances + settlements`.

---

## Phase 5 — Reports

### Task 17: CSV import (TDD)

**Files:**
- Create: `backend-node/src/services/report.service.ts`
- Create: `backend-node/src/controllers/report.controller.ts`
- Create: `backend-node/src/routes/report.routes.ts`
- Test: `backend-node/tests/report-import.test.ts`
- Modify: `routes/index.ts`

- [ ] **Step 1: Failing `tests/report-import.test.ts`** — POST multipart CSV with rows (mixed date formats, a missing-amount row, a credit row → income, a new category name); assert response `{job_id,total_rows,imported_rows,error_count,errors}`, that transactions were created, that the unknown category was auto-created, and an ImportJob row recorded.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `importCsv(userId, fileBuffer, fileName)`** — port `reports/views.py::ImportCSVView`: utf-8-sig strip BOM; `csv-parse` with header; normalize keys (trim+lower); per row require date+amount; multi-format date parse (`yyyy-MM-dd, MM/dd/yyyy, dd/MM/yyyy, dd-MM-yyyy, MM-dd-yyyy`); amount strip `$ ,` + abs; type credit/income/deposit→income else expense; category resolve (own or default, name iexact) else create; create Transaction; collect per-row errors (`{row:i+2,error}`); persist ImportJob; return first 20 errors. Use `multer` memoryStorage in the route.

- [ ] **Step 4: Run** → PASS. Commit `feat(backend): csv import`.

---

### Task 18: CSV + PDF export + import jobs (TDD)

**Files:**
- Modify: report service/controller/routes
- Test: `backend-node/tests/report-export.test.ts`

- [ ] **Step 1: Failing test** — `GET /reports/export/csv/` returns `text/csv` with header row + filtered rows; `GET /reports/export/pdf/` returns `application/pdf` (assert `content-type` + nonempty body + `%PDF` magic); `GET /reports/import/jobs/` returns recent jobs with `error_count`.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**:
  - `exportCsv(userId, filters)` → `csv-stringify` header `date,type,amount,category,description,notes`, filters date_from/date_to/type/category. Controller sets `Content-Type: text/csv` + `Content-Disposition`.
  - `exportPdf(userId, filters)` → `pdfkit`: title, summary table (income/expense/net), first 200 txns. **Currency:** load user's profile currency symbol (fix the Django `$` hardcode per spec decision) and use it. Stream to buffer.
  - `listImportJobs(userId)` → recent 20 with computed `error_count`.

- [ ] **Step 4: Run** → PASS. Commit `feat(backend): csv/pdf export + import jobs`.

---

## Phase 6 — Seed, finalize, swap

### Task 19: Seed default categories

**Files:**
- Create: `backend-node/prisma/seed.ts`

- [ ] **Step 1: Implement `seed.ts`** — upsert the 17 default categories (copy the list from `backend/apps/categories/management/commands/create_default_categories.py`) with `userId:null, isDefault:true`, keyed on `name` (find-or-create since name isn't unique in schema — query first).

- [ ] **Step 2: Run** `npm run seed` → prints created count. Verify `GET /categories/` (authed) includes them.

- [ ] **Step 3: Commit** `feat(backend): seed default categories`.

---

### Task 20: Full suite + manual smoke, then swap out Python

**Files:**
- Delete: `backend/` (Python) ; Move: `backend-node/` → `backend/`
- Modify: root README / any scripts referencing Django (if present)

- [ ] **Step 1: Run full test suite** `cd backend-node && npm run test` → all green.

- [ ] **Step 2: Manual smoke** — start `npm run dev`; with the **existing frontend** (`cd frontend && npm run dev`) register → login → add transaction → see dashboard → create category/budget → create split group/expense/settle → import CSV → export PDF. Confirm no console/network errors.

- [ ] **Step 3: Swap directories**

```bash
cd /home/ajay/Documents/projects/manage-expense
git rm -r backend
mv backend-node backend
git add backend
```
(Verify `.env`, `prisma/migrations` moved; re-run `npm run test` from new path.)

- [ ] **Step 4: Commit** `refactor: replace Django backend with Node/Express`.

---

## Self-Review Notes (coverage map)

- Auth (all 8 endpoints) → Tasks 4–6 ✓
- Categories + default guard → Task 7 ✓
- Budgets + periods + alerts + dedup + current_month → Tasks 8–9 ✓
- Transactions CRUD + filters/search/ordering + pagination → Tasks 10–11 ✓
- Dashboard summary (pct_change, 6-month, top categories) → Task 12 ✓
- Tags + recurring (next_run seed) → Task 13 ✓
- Splits: groups/members/expenses/shares/balances/settle → Tasks 14–16 ✓
- Reports: CSV import (date/amount parsing, category auto-create), CSV export, PDF, jobs → Tasks 17–18 ✓
- Seed defaults → Task 19 ✓
- Decimal-as-string, route ordering, underscore action URLs, pagination shape → enforced in presenters + route order across tasks ✓
- Delete Python, preserve API → Task 20 ✓
