# 💰 Manage Expense

A full-stack personal finance manager with expense/income tracking, bill splitting (Splitwise-style), visual charts, import/export, and dark/light/system theme.

**Stack:** React 18 + Vite + Redux Toolkit · Node.js + Express + Prisma · PostgreSQL · JWT Auth

---

## 📋 What This Project Does

| Feature | Description |
|---|---|
| 🔐 Auth | Email + password login, JWT tokens, "remember me" (30-day auto-login) |
| 💸 Expenses | Add/edit/delete expenses with category, tags, receipt upload, recurring rules |
| 💵 Income | Track income sources with descriptions and dates |
| 📊 Dashboard | Summary cards + income vs expense chart + category pie chart |
| 🗂 Categories | Default + custom categories with icons and colors |
| 💰 Budgets | Monthly budget limits per category with % usage alerts |
| 🤝 Splits | Splitwise-style bill splitting — works with both registered and guest users |
| 📤 Export | Download transactions as CSV or PDF report |
| 📥 Import | Upload a CSV file to bulk-import transactions |
| 🌙 Theme | Dark / Light / System mode |
| 📱 Mobile | Fully responsive, mobile-first design |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:

- **Node.js** 18+ (both frontend and backend run on Node)
- **PostgreSQL** 14+
- **npm**

---

## ⚙️ Backend Setup (Node.js + Express + Prisma)

### 1. Navigate to backend

```bash
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the `.env` file

```bash
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/expense_manager

# Server
PORT=8000

# JWT
JWT_SECRET=any-long-random-string-here
JWT_ACCESS_EXPIRES_MIN=15
JWT_REFRESH_EXPIRES_DAYS=7
JWT_REFRESH_REMEMBER_DAYS=30

# CORS — allow frontend to talk to backend
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

> **JWT_SECRET tip:** Generate a strong secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### 4. Create the PostgreSQL database

Open your PostgreSQL shell (`psql`) and run:

```sql
CREATE DATABASE expense_manager;
```

Or from the terminal:

```bash
createdb expense_manager
```

Make sure the username/password in your `DATABASE_URL` matches your Postgres setup.

### 5. Run Prisma migrations (creates all tables)

```bash
npx prisma migrate dev --name init
```

This reads `prisma/schema.prisma` and creates all 16 tables. It also generates the Prisma client.

> If you only want to generate the client without migrating: `npm run prisma:generate`

### 6. Seed default categories

```bash
npm run seed
```

This creates the 17 default categories (Food, Transport, Shopping, etc.) shared by all users.

### 7. Start the backend server

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

Backend runs at: **http://localhost:8000**
Health check: **http://localhost:8000/api/health**

---

## 🎨 Frontend Setup (React + Redux Toolkit)

### 1. Navigate to frontend

```bash
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the `.env` file

Create a file called `.env` inside the `frontend/` folder:

```env
VITE_API_URL=http://localhost:8000/api
```

### 4. Start the frontend dev server

```bash
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🗂 Project Structure

```
manage-expense/
├── backend/                      # Node.js + Express + Prisma
│   ├── package.json
│   ├── .env                      ← you create this
│   ├── .env.example              ← template
│   ├── prisma/
│   │   └── schema.prisma         ← all 16 database models
│   └── src/
│       ├── server.js             ← entry point
│       ├── app.js                ← express app + middleware
│       ├── config/               ← prisma client
│       ├── middleware/           ← auth (JWT), error handler
│       ├── utils/                ← jwt, password, pagination, serialize
│       ├── controllers/          ← auth, transaction, category, split, report
│       ├── routes/               ← route definitions (mounted under /api)
│       └── seed/                 ← default categories seeder
│
└── frontend/                     # React + Vite + Redux Toolkit
    ├── package.json
    ├── .env                      ← you create this
    ├── vite.config.js
    └── src/
        ├── pages/                ← all route pages
        ├── components/           ← reusable UI components
        ├── store/                ← Redux Toolkit slices + store
        │   ├── index.js          ← configureStore + redux-persist
        │   ├── authSlice.js
        │   ├── transactionsSlice.js
        │   ├── categoriesSlice.js
        │   ├── splitsSlice.js
        │   └── uiSlice.js
        ├── api/                  ← Axios API calls (with JWT refresh)
        └── context/              ← Theme context
```

---

## 🔌 API Endpoints Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <access_token>`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login (returns JWT tokens; `remember_me` sets 30-day cookie) |
| POST | `/api/auth/logout/` | Logout (revokes refresh token) |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET/PUT | `/api/auth/profile/` | Get / update profile |
| POST | `/api/auth/change-password/` | Change password |
| GET/POST | `/api/transactions/` | List / create transactions |
| GET | `/api/transactions/dashboard_summary/` | Dashboard stats |
| GET/POST | `/api/transactions/tags/` | List / create tags |
| GET/POST | `/api/transactions/recurring/` | Recurring rules |
| GET/POST | `/api/categories/` | List / create categories |
| GET/POST | `/api/categories/budgets/` | List / create budgets |
| GET | `/api/categories/budgets/current_month/` | Current month budgets |
| GET/POST | `/api/splits/groups/` | List / create split groups |
| POST | `/api/splits/groups/:id/add_member/` | Add a member (user or guest) |
| GET | `/api/splits/groups/:id/balances/` | Who owes whom |
| POST | `/api/splits/groups/:id/settle/` | Record a settlement |
| GET/POST | `/api/splits/expenses/` | List / create split expenses |
| POST | `/api/reports/import/csv/` | Import CSV |
| GET | `/api/reports/export/csv/` | Export CSV |
| GET | `/api/reports/export/pdf/` | Export PDF |

---

## 🌐 Deployment (Free / Minimal Cost)

### Recommended Free Stack

| Service | Purpose | Cost |
|---|---|---|
| **Vercel** | React frontend | Free |
| **Railway** | Node/Express backend | Free tier / ~$5/mo |
| **Railway** | PostgreSQL database | Included |
| **Cloudflare R2** | Receipt image storage | Free up to 10GB |

### Deploy Frontend to Vercel

```bash
cd frontend
npm run build
# Push to GitHub → connect repo on vercel.com → auto-deploys
```

Set environment variable on Vercel:
```
VITE_API_URL=https://your-backend.railway.app/api
```

### Deploy Backend to Railway

1. Go to **railway.app** → New Project → Deploy from GitHub
2. Set the root directory to `backend/`
3. Add a **PostgreSQL** plugin — Railway provides a `DATABASE_URL` automatically
4. Set environment variables:
   - `DATABASE_URL` (provided by the Railway Postgres plugin)
   - `JWT_SECRET=your-production-secret`
   - `PORT=8000` (or leave Railway's `$PORT`)
   - `CORS_ORIGINS=https://your-frontend.vercel.app`
5. Build command: `npm install && npx prisma generate`
6. Start command: `npx prisma migrate deploy && npm start`
   - `prisma migrate deploy` applies migrations on the production DB
   - Run the seed once after first deploy: `npm run seed`

---

## 🧪 Quick Test After Setup

1. Open **http://localhost:5173**
2. Click **Register** → create an account
3. You'll land on the **Dashboard**
4. Click **+ Add Transaction** to add your first expense
5. Check **Categories** page to set budgets
6. Try **Splits** to create a group expense

---

## 🛠 Common Issues

**`Can't reach database server` / Prisma connection error:**
Make sure PostgreSQL is running and `DATABASE_URL` in `backend/.env` is correct (host, port, user, password, database name).

**`prisma migrate` fails with database does not exist:**
Create the database first: `createdb expense_manager`.

**CORS error in browser:**
Make sure `CORS_ORIGINS` in `backend/.env` matches exactly where your frontend runs (`http://localhost:5173`).

**401 errors after login / not staying logged in:**
The access token lives 15 min; the axios layer auto-refreshes it. Ensure the backend is reachable at `VITE_API_URL` and cookies/localStorage aren't blocked.

**Frontend shows blank page:**
Check that `VITE_API_URL` in `frontend/.env` points to your running backend.

**Port already in use:**
Change `PORT` in `backend/.env` (backend) or run `npm run dev -- --port 5174` (frontend).

---

## 🧱 Tech Notes

- **State management:** Redux Toolkit with `createAsyncThunk` for API calls; `redux-persist` keeps auth + theme across reloads.
- **Auth:** JWT access tokens (short-lived) + opaque refresh tokens stored in the DB. "Remember me" issues a 30-day HttpOnly refresh cookie. Logout revokes the refresh token.
- **ORM:** Prisma — schema in `backend/prisma/schema.prisma`, migrations via `prisma migrate`.
- **File uploads:** Multer (receipts) stored under `backend/uploads/`.
- **Reports:** CSV via `csv-parse`/`csv-stringify`, PDF via `pdfkit`.

---

## 📄 License

MIT — free to use, modify, and deploy.
