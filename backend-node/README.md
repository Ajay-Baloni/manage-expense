# Manage Expense — Node/Express backend

TypeScript · Express · Prisma (PostgreSQL) · Zod · JWT. A clean-redesign port of the
original Django backend. All money values are JSON numbers; all fields are camelCase.

## Setup

```bash
cp .env.example .env          # then edit secrets / DATABASE_URL
docker compose up -d          # start local PostgreSQL (or use your own)
npm install
npm run db:migrate            # create/apply Prisma migrations
npm run db:seed               # insert default categories
npm run dev                   # tsx watch on http://localhost:8000
```

Production: `npm run build && npm start`.

## Layout

```
src/
  app.ts / server.ts          # express app + bootstrap (starts cron)
  config/env.ts               # Zod-validated environment
  lib/                        # prisma, jwt, mailer singletons
  middleware/                 # auth, error handler, multer upload
  utils/                      # asyncHandler, AppError, serialize, period
  modules/<domain>/           # routes + controller + service + schema per feature
  jobs/                       # recurring cron, synchronous budget alerts
prisma/                       # schema.prisma, migrations, seed.ts
```

Controllers parse/validate (Zod) and shape responses; services hold business logic.

## API (mounted at `/api`)

| Area | Routes |
|------|--------|
| auth | `POST /auth/{register,login,logout,refresh,password-reset,password-reset/confirm,change-password}`, `GET\|PATCH /auth/profile` |
| categories | `GET/POST/PATCH/DELETE /categories` (defaults read-only) |
| budgets | `GET/POST/PATCH/DELETE /budgets` (+ `?month=YYYY-MM`, `GET /budgets/current-month`) |
| transactions | `GET/POST/GET:id/PATCH/DELETE /transactions` (filters: type, category, dateFrom/To, amountMin/Max, tags, search, ordering), `GET /transactions/dashboard-summary` |
| tags | `GET/POST/PATCH/DELETE /tags` |
| recurring | `GET/POST/PATCH/DELETE /recurring` |
| splits | `/split-groups` CRUD + `POST /:id/members`, `GET /:id/balances`, `POST /:id/settle`; `/split-expenses` (GET/POST/DELETE) |
| reports | `POST /reports/import` (CSV multipart), `GET /reports/export.csv`, `GET /reports/export.pdf`, `GET /reports/import-jobs` |

## Auth

Access JWT in the JSON body (`Authorization: Bearer <token>`), refresh JWT in an
httpOnly cookie (`rememberMe` extends it to 30 days). `POST /auth/refresh` reads the
cookie (or a `refresh` body field) and returns a fresh access token.

## Background work (in-process, no Redis)

- **Budget alerts** run synchronously after an expense write; dedup'd per
  `(budget, periodStart, level)`; emailed via nodemailer (console transport in dev).
- **Recurring rules** are materialized into transactions by a daily `node-cron` job.
