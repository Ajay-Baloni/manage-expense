# Migration: Django → Node/Express Backend + Zustand → Redux Frontend

**Date:** 2026-06-09
**Status:** Approved (architecture), pending spec review

## Goal

Replace the Python/Django REST backend with a production-grade Node/Express +
TypeScript + Prisma backend, and replace the frontend's Zustand stores with
Redux Toolkit. The HTTP API contract (paths, request bodies, response shapes,
status codes) is preserved exactly so the migration is invisible to API
consumers and requires **no changes to the frontend `src/api/` axios layer**.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Backend runtime | Node.js + Express 4 |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (existing instance, **fresh schema** — Django tables dropped) |
| State mgmt (frontend) | Redux Toolkit + redux-persist |
| Auth | `jsonwebtoken` (HS256) + `bcrypt`; refresh-token blacklist table |
| Validation | Zod schemas per route |
| Password reset | Token table; email via Nodemailer (console transport in dev) |

## Non-Goals

- No change to React components' UI/markup beyond swapping store hooks.
- No change to API URLs or payload shapes.
- No data migration (fresh DB per decision).
- Django admin has no replacement (was not used by the app).

---

## Part 1 — Backend (Node/Express)

### Directory structure

```
backend/
├── src/
│   ├── index.ts                    # Express app bootstrap, mounts /api routes
│   ├── app.ts                      # express() factory (testable, no listen)
│   ├── routes/
│   │   ├── index.ts                # mounts all routers under /api
│   │   ├── auth.routes.ts
│   │   ├── transaction.routes.ts
│   │   ├── category.routes.ts
│   │   ├── split.routes.ts
│   │   └── report.routes.ts
│   ├── controllers/                # thin: parse req → call service → send res
│   │   ├── auth.controller.ts
│   │   ├── transaction.controller.ts
│   │   ├── category.controller.ts
│   │   ├── split.controller.ts
│   │   └── report.controller.ts
│   ├── services/                   # ALL business logic lives here
│   │   ├── auth.service.ts
│   │   ├── transaction.service.ts
│   │   ├── category.service.ts
│   │   ├── budget.service.ts       # threshold checks + alert dedup
│   │   ├── split.service.ts        # balance/settlement greedy algorithm
│   │   └── report.service.ts       # CSV import/export, PDF export
│   ├── presenters/                 # Prisma row → exact API JSON shape (DRF parity)
│   │   ├── user.presenter.ts
│   │   ├── transaction.presenter.ts
│   │   ├── category.presenter.ts
│   │   ├── budget.presenter.ts
│   │   └── split.presenter.ts
│   ├── validators/                 # Zod schemas
│   │   ├── auth.schema.ts
│   │   ├── transaction.schema.ts
│   │   ├── category.schema.ts
│   │   └── split.schema.ts
│   ├── middleware/
│   │   ├── auth.ts                 # Bearer JWT → req.user
│   │   ├── error.ts                # central error handler → DRF-style bodies
│   │   ├── validate.ts            # runs a Zod schema against req
│   │   └── pagination.ts          # parses page/page_size
│   ├── lib/
│   │   ├── prisma.ts               # singleton PrismaClient
│   │   ├── jwt.ts                  # sign/verify access & refresh
│   │   └── mailer.ts               # Nodemailer transport (console|smtp)
│   ├── config/
│   │   └── env.ts                  # Zod-validated process.env
│   ├── types/
│   │   └── express.d.ts            # augment Express.Request with `user`
│   └── utils/
│       ├── asyncHandler.ts         # wrap async handlers → next(err)
│       ├── apiError.ts             # ApiError class (status + body)
│       └── paginate.ts            # build {count,next,previous,results}
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                     # default categories (17 rows)
├── templates/emails/
│   ├── budget_alert.html
│   └── budget_alert.txt
├── tests/
│   ├── auth.test.ts
│   ├── transaction.test.ts
│   ├── split.test.ts
│   └── helpers/
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Tech / dependencies

- **Runtime:** `express`, `cors`, `cookie-parser`, `morgan` (logging), `helmet`
- **Auth:** `jsonwebtoken`, `bcrypt`
- **ORM:** `prisma`, `@prisma/client`
- **Validation:** `zod`
- **Files/reports:** `multer` (CSV upload), `csv-parse` + `csv-stringify`, `pdfkit` (replaces ReportLab)
- **Email:** `nodemailer`
- **Dev/test:** `typescript`, `tsx` (dev runner), `vitest` + `supertest`, `@types/*`

### Prisma schema (model parity with Django)

IDs are `Int @id @default(autoincrement())` (Django used BigAutoField).
Column names map to the existing snake_case via `@map`/`@@map` so the DB is
conventional. Enums become Prisma enums or `String` with a Zod-validated set.

| Prisma model | Source Django model | Notes |
|---|---|---|
| `User` | accounts.User | email unique; `password` (bcrypt hash); `isActive`, `isStaff`, `dateJoined` |
| `UserProfile` | accounts.UserProfile | 1-1; currency default `INR`, timezone `UTC`, theme `system` |
| `PasswordResetToken` | accounts.PasswordResetToken | `token` uuid, `expiresAt`, `isUsed` |
| `RefreshToken` | *(new)* | replaces simplejwt blacklist: stores issued/blacklisted refresh JTIs |
| `Category` | categories.Category | `userId` nullable (null = global default); `isDefault` |
| `Budget` | categories.Budget | unique `(userId, categoryId, period)`; `month` anchor |
| `BudgetAlert` | categories.BudgetAlert | `periodStart`, `level` for per-period dedup |
| `Tag` | transactions.Tag | unique `(userId, name)` |
| `Transaction` | transactions.Transaction | M2M `tags`; `category` SET NULL on delete |
| `RecurringRule` | transactions.RecurringRule | `nextRun` seeded from `startDate` |
| `SplitGroup` | splits.SplitGroup | |
| `GuestUser` | splits.GuestUser | |
| `SplitGroupMember` | splits.SplitGroupMember | `user` xor `guestUser` |
| `SplitExpense` | splits.SplitExpense | `paidByUser` xor `paidByGuest`; SET NULL |
| `SplitExpenseShare` | splits.SplitExpenseShare | `isSettled` |
| `SplitSettlement` | splits.SplitSettlement | payer/receiver members |
| `ImportJob` | reports.ImportJob | `errorsJson` Json, status enum |

### API contract — preserved exactly

All routes keep the **trailing slash** and **snake_case** payloads the frontend
already sends. Express default (non-strict routing) treats `/x` and `/x/` alike;
we mount with trailing slashes to match.

**Auth** — `/api/auth/`
| Method | Path | Body → Response |
|---|---|---|
| POST | `register/` | `{email,first_name,last_name,password,password_confirm,currency}` → `{user, access, refresh}` (201) |
| POST | `login/` | `{email,password,remember_me}` → `{user, access, refresh}`; `remember_me` sets 30-day httpOnly `refresh_token` cookie + 30-day refresh |
| POST | `logout/` | `{refresh}` → blacklist; clears cookie |
| POST | `refresh/` | `{refresh}` or cookie → `{access}` |
| POST | `password-reset/` | `{email}` → always 200 `{detail}` (no user enumeration) |
| POST | `password-reset/confirm/` | `{token,new_password,new_password_confirm}` → `{detail}` |
| GET/PATCH | `profile/` | `UserSerializer` shape; PATCH nests `{first_name,last_name,profile:{...}}` |
| POST | `change-password/` | `{current_password,new_password,new_password_confirm}` |

**Transactions** — `/api/transactions/` (DRF-router parity)
- `GET ''` (paginated list, filters: `type, category, date_from, date_to, amount_min, amount_max, tags, search, ordering, page`), `POST ''`, `GET/PATCH/PUT/DELETE :id/`
- `GET dashboard_summary/`
- Tags sub-resource: `tags/`, `tags/:id/`
- Recurring sub-resource: `recurring/`, `recurring/:id/`

**Categories** — `/api/categories/`
- `GET ''` (user's + global defaults), `POST ''`, `PATCH/DELETE :id/` (defaults are read-only → 403 on modify/delete)
- Budgets: `budgets/`, `budgets/:id/`, `budgets/current_month/` — **`budgets` prefix must be matched before the `:id` catch-all** (Django comment notes this ordering bug; preserve via route order)

**Splits** — `/api/splits/`
- Groups: `groups/`, `groups/:id/`, `groups/:id/add_member/`, `groups/:id/balances/`, `groups/:id/settle/`
- Expenses: `expenses/` (filter `group`), `expenses/:id/`

**Reports** — `/api/reports/`
- `POST import/csv/` (multipart `file`), `GET export/csv/` (blob), `GET export/pdf/` (blob), `GET import/jobs/`

### Response-shape parity (presenter layer)

Each presenter reproduces a DRF serializer's JSON exactly. Critical details:

- **Pagination:** list endpoints return `{count, next, previous, results}` with
  `PAGE_SIZE = 20`. The frontend reads `res.data.results || res.data` and
  `res.data.count/next/previous`.
- **Decimals as strings:** DRF's default `COERCE_DECIMAL_TO_STRING=True` renders
  `amount`/`limit_amount`/`share_amount` as strings (`"123.45"`). Presenters
  output strings for these to preserve the contract. (Computed floats in
  `dashboard_summary`/`balances` stay numbers — Django used `float()` there.)
- **Nested reads:** `transaction.category_detail`, `transaction.tags[]`,
  `budget.category_name/color/icon` + `spent_amount/percentage_used/period_*`,
  `split_group.members[]` + `expense_count`, `member.display_name`,
  `expense.paid_by_name`, `expense.shares[]`.
- **Write-only inputs:** `tag_ids` (transactions), `shares_data` (split
  expense), `password_confirm`, `currency` (register).

### Business logic to port (faithfully)

1. **Dashboard summary** (`transaction.service`): current-vs-previous-month
   income/expense, `pct_change` (100.0 if prev==0 & cur>0 else 0; else rounded
   %), 6-month `monthly_breakdown` (the Django `day - i*28` month walk →
   reimplement with proper month arithmetic), top-6 expense categories this
   month with name/color/icon fallbacks.
2. **Budget periods** (`budget.service`): `period_range(period)` — weekly =
   Mon–Sun of current week; monthly = 1st–last of current month. `spent_amount`
   = sum of expense txns for (user, category) in current period.
   `percentage_used` = spent/limit*100 (0 if limit<=0).
3. **Budget alerts** (`budget.service`): on expense create/update, for each
   budget on that category compute pct; level `exceeded` (>=100) or `warning`
   (>=threshold); dedup one alert per `(budget, period_start, level)`; create
   `BudgetAlert` + send email. Never let alerting throw into the request.
4. **Split balances** (`split.service`): net per member = paid − unsettled
   shares owed; apply settlements; greedy creditor/debtor matching →
   `suggested_settlements`. Output `{member_balances, suggested_settlements}`
   exactly as today.
5. **Split expense creation**: if no `shares_data`, equal split across all
   members; else one share per `{member_id, share_amount}`. Group create also
   adds the creator as a member.
6. **CSV import** (`report.service`): utf-8-sig decode; normalize header keys;
   require date+amount; multi-format date parse (`%Y-%m-%d, %m/%d/%Y, %d/%m/%Y,
   %d-%m-%Y, %m-%d-%Y`); amount strip `$ ,` + abs; type from
   income/credit/deposit→income else expense; resolve/create category by name;
   per-row error capture; persist `ImportJob`; return first 20 errors.
7. **CSV export**: header `date,type,amount,category,description,notes`, filters
   `date_from/date_to/type/category`.
8. **PDF export** (pdfkit): title, summary table (income/expense/net), first 200
   transactions table. (Currency symbol: Django hardcoded `$`; preserve.)

### Auth implementation

- **Access token:** 15 min; **refresh:** 7 days (30 days if `remember_me`).
  HS256 signed with `JWT_SECRET`. Payload `{sub: userId, jti}`.
- **bcrypt** for password hashing (cost 12). Fresh DB ⇒ no Django hash compat.
- **Refresh/blacklist:** `refresh/` verifies signature + expiry + not
  blacklisted; `logout/` inserts the refresh `jti` into `RefreshToken`
  (blacklisted). (Django rotated tokens; we keep the simpler verify-and-blacklist
  the frontend's interceptor already expects — it only ever calls `refresh/` to
  swap an access token.)
- **Middleware** reads `Authorization: Bearer <access>` → `req.user`; 401 JSON
  `{detail: "..."}` on failure (matches simplejwt body the axios interceptor
  keys off).

### Error & validation behavior

- Zod failures → 400 with DRF-style `{field: [messages]}` (the frontend's
  `getErrorMessage` walks these). Non-field → `{detail}` or
  `{non_field_errors:[...]}`.
- `asyncHandler` forwards rejections to the central error middleware.
- Auth/permission failures → 401/403 `{detail}`.

### Config / env (`.env.example`)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_manager
JWT_SECRET=change-me
JWT_ACCESS_TTL_MIN=15
JWT_REFRESH_TTL_DAYS=7
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=8000
EMAIL_BACKEND=console        # console | smtp
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
DEFAULT_FROM_EMAIL=FinTrack <no-reply@fintrack.local>
```

`config/env.ts` validates these with Zod and exits on missing required vars.
Server listens on `PORT=8000` (Django's port) so the frontend's `/api` proxy is
unchanged.

### Tests

Vitest + Supertest integration tests against a test database: auth flow
(register/login/refresh/logout), transaction CRUD + dashboard summary, budget
threshold/alert dedup, split balance algorithm, CSV import parsing. Unit tests
for the greedy settlement and `period_range`.

### Removal

Delete `backend/apps/`, `backend/config/`, `backend/manage.py`,
`backend/venv/`, `requirements.txt`, migrations, `*.py`. Replace with the Node
tree above.

---

## Part 2 — Frontend (Zustand → Redux Toolkit)

### Structure

```
frontend/src/
├── store/
│   ├── index.js               # configureStore + redux-persist
│   ├── hooks.js               # typed useAppDispatch/useAppSelector (JS: re-export)
│   └── slices/
│       ├── authSlice.js
│       ├── transactionSlice.js
│       ├── categorySlice.js
│       ├── splitSlice.js
│       └── uiSlice.js
```

### Dependencies

- Add `@reduxjs/toolkit`, `react-redux`, `redux-persist`.
- Remove `zustand`.

### Slice mapping (state + thunks preserved 1:1)

| Zustand store | Redux slice | Async thunks (from current store actions) |
|---|---|---|
| `authStore` | `authSlice` | `login, register, logout, loadProfile`; reducer `updateUser`. Persisted (user, tokens, isAuthenticated). |
| `transactionStore` | `transactionSlice` | `fetchTransactions, createTransaction, updateTransaction, deleteTransaction, fetchTags, fetchSummary`; reducers `setFilters, resetFilters`. State: transactions, pagination, filters, tags, summary, loading. |
| `categoryStore` | `categorySlice` | `fetchCategories, createCategory, updateCategory, deleteCategory, fetchBudgets, fetchCurrentMonthBudgets, createBudget, updateBudget, deleteBudget`. |
| `splitStore` | `splitSlice` | `fetchGroups, fetchGroup, createGroup, fetchExpenses, createExpense, deleteExpense, fetchBalances, settle, addMember`. State: groups, currentGroup, expenses, balances, loading. |
| `uiStore` | `uiSlice` | reducers `setTheme, toggleSidebar, setSidebarOpen, openModal, closeModal`. Persisted (theme, sidebarOpen). |

- Token side-effects (writing `access_token`/`refresh_token` to localStorage)
  stay inside the auth thunks, exactly as today. The axios interceptor in
  `src/api/axios.js` is unchanged.
- `redux-persist` replaces zustand `persist`: two persisted slices (auth, ui)
  with the same `partialize` whitelists. `<PersistGate>` wraps the app.

### Component call-site migration (mechanical)

Every `const { x, action } = useXxxStore()` becomes:
```js
const x = useAppSelector((s) => s.xxx.x)
const dispatch = useAppDispatch()
// action(args)  →  dispatch(action(args))   (await dispatch(thunk(args)).unwrap() when a return/throw is needed)
```
Files touched: `App.jsx` (isAuthenticated selector), all `pages/**`, and layout
components (`Sidebar`, `Topbar`, `AppLayout`). `main.jsx` wraps `<App/>` in
`<Provider store>` + `<PersistGate>`. `ThemeContext` keeps working (reads theme
via uiSlice/selector).

### Behavior parity

- Thunks that currently `return res.data` → `createAsyncThunk` returns the
  payload; call sites use `.unwrap()` where they relied on the return value or
  on a throw (login/register/CRUD in try/catch with toasts).
- `getErrorMessage` and toast usage unchanged.

---

## Build / run

- Backend: `npm run dev` (tsx watch), `npm run build` (tsc), `npm start`,
  `npx prisma migrate dev`, `npm run seed`.
- Frontend: unchanged (`npm run dev` on Vite :5173, proxy `/api` → :8000).

## Risks / watch-items

1. **Decimal-as-string** contract — verify the frontend formats amounts via
   `Number(...)`; if any component does math on raw `amount`, confirm it still
   works (it did with DRF strings already).
2. **Route ordering** for `categories/budgets/` vs `:id` — replicate.
3. **DRF action URLs use underscores** (`dashboard_summary`, `current_month`,
   `add_member`) — keep underscores, not kebab-case.
4. **Filter/ordering/search** semantics on transactions must match django-filter
   (`-date` default ordering, `tags` in-filter, `search` over description+notes).
5. **Pagination** default page size 20 and `count/next/previous` shape.

## Build sequence (high level)

1. Scaffold backend (package.json, tsconfig, env, prisma schema, prisma client).
2. Auth module end-to-end (+ tests) — unblocks everything.
3. Categories + budgets (+ budget service) — needed by transactions.
4. Transactions + tags + recurring + dashboard summary (+ budget alert hook).
5. Splits (members, expenses, balances, settlements).
6. Reports (CSV import/export, PDF).
7. Seed default categories; mailer + templates.
8. Frontend Redux store + slices; migrate call sites; PersistGate.
9. End-to-end smoke test full app; delete Python backend.
