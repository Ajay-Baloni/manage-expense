# Node/Express Backend Migration — Design

**Date:** 2026-06-10
**Status:** Approved
**Goal:** Port the existing Django REST backend to a new `backend-node/` directory as an idiomatic TypeScript/Express/Prisma application. Full 1:1 feature port of all five domains. Clean (camelCase, idiomatic REST) redesign — the frontend API client will be updated afterward.

## Decisions

| Topic | Decision |
|-------|----------|
| Scope | Full 1:1 port of all modules (auth, categories, transactions, splits, reports) |
| API contract | Clean redesign — camelCase JSON, idiomatic REST routes, JWT auth. Frontend updated to match (follow-up). |
| Database | Fresh Prisma schema + fresh Postgres DB. Existing Django dev data is disposable. |
| Background jobs | In-process, no Redis. `node-cron` daily for recurring; synchronous budget-alert checks; `nodemailer` (console transport in dev). |
| Location | New sibling dir `backend-node/`; Django `backend/` left untouched until removed. |

## Stack

TypeScript · Express 4 · Prisma (PostgreSQL) · Zod · `jsonwebtoken` · `bcrypt` · `nodemailer` · `node-cron` · `multer` · `pdfkit`. Tests: Vitest + Supertest.

## Directory structure

```
backend-node/
├── src/
│   ├── app.ts                  # express app (middleware, route mounting), exported for tests
│   ├── server.ts               # listen() + start cron
│   ├── config/env.ts           # Zod-validated process.env
│   ├── lib/
│   │   ├── prisma.ts           # singleton PrismaClient
│   │   ├── jwt.ts              # sign/verify access & refresh
│   │   └── mailer.ts          # nodemailer transport
│   ├── middleware/
│   │   ├── auth.ts             # requireAuth → req.user
│   │   ├── error.ts            # central error handler
│   │   └── upload.ts           # multer instances
│   ├── types/express.d.ts      # augment Request.user
│   ├── utils/
│   │   ├── asyncHandler.ts
│   │   └── AppError.ts
│   ├── modules/                # routes + controller + service + schema per domain
│   │   ├── auth/
│   │   ├── categories/         # categories + budgets
│   │   ├── transactions/       # transactions + tags + recurring
│   │   ├── splits/
│   │   └── reports/            # import/export/dashboard
│   └── jobs/
│       ├── recurring.job.ts
│       └── budgetAlerts.ts
├── prisma/schema.prisma
├── .env.example · tsconfig.json · package.json · vitest.config.ts
```

Grouped by module (each owns `routes.ts`, `controller.ts`, `service.ts`, `schema.ts`) rather than global `services/`/`validators/` folders — same layering, feature files stay together. Business logic in services; controllers parse/validate/respond only.

## Data model (Prisma)

Same entities as Django, camelCase fields, `cuid` string IDs, money as `Decimal(12,2)`:

- `User`, `UserProfile` (1:1), `PasswordResetToken`
- `Category` (default categories = `userId = null`), `Budget`, `BudgetAlert`
- `Tag`, `Transaction` (implicit M:N to `Tag`), `RecurringRule`
- `SplitGroup`, `GuestUser`, `SplitGroupMember`, `SplitExpense`, `SplitExpenseShare`, `SplitSettlement`
- `ImportJob`

Enums: transaction/category type, budget period, recurring frequency, split type, import status, theme, currency. Unique constraints preserved: `Tag(userId, name)`, `Budget(userId, categoryId, period)`. Indexes mirror Django.

## API surface (mounted at `/api`)

- **auth:** `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/password-reset`, `/auth/password-reset/confirm`, `/auth/change-password`; `GET|PATCH /auth/profile`
- **categories:** `GET/POST/PATCH/DELETE /categories` (default categories read-only); `GET/POST/PATCH/DELETE /budgets` (+ `?month=`) serialized with `spentAmount`/`percentageUsed`/`periodStart`/`periodEnd`
- **transactions:** CRUD with filters (`type, category, dateFrom, dateTo, amountMin, amountMax, tags, search, ordering`); `GET /transactions/dashboard-summary`; `/tags` CRUD; `/recurring` CRUD
- **splits:** `/split-groups` CRUD (+ `POST /:id/members`, `GET /:id/balances`, `POST /:id/settle`); `/split-expenses` (with `sharesData`; equal-split fallback)
- **reports:** `POST /reports/import` (CSV via multer), `GET /reports/export.csv`, `GET /reports/export.pdf`, `GET /reports/import-jobs`

Ported faithfully: greedy debt-settlement, budget period math (weekly = Mon–Sun, monthly = calendar month), dashboard 6-month breakdown + %-change, CSV date/amount/type parsing.

## Auth & jobs

- **Tokens:** short-lived access JWT in JSON body; refresh JWT in httpOnly cookie (always; `rememberMe` extends to 30d). `/auth/refresh` reads cookie. Passwords via bcrypt. `requireAuth` verifies `Authorization: Bearer`.
- **Budget alerts:** after expense create/update, `budgetAlerts.ts` runs synchronously (never throws into request), dedup per `(budget, periodStart, level)`, emails via nodemailer.
- **Recurring:** daily `node-cron` job materializes due `RecurringRule`s into transactions, advances `nextRun`.
- **Errors:** central middleware: `ZodError` → 400 with field detail; `AppError` → its status; unknown → 500.

## Testing & DX

Vitest + Supertest integration tests per module against a test Postgres DB. Scripts: `dev` (tsx watch), `build`, `start`, `db:migrate`, `db:seed` (default categories), `test`.

## Follow-up (out of scope here)

Update the frontend API client to the new camelCase routes/shapes.
