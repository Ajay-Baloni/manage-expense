# 💰 Manage Expense

A full-stack personal finance manager with expense/income tracking, bill splitting (Splitwise-style), visual charts, import/export, and dark/light/system theme.

**Stack:** React 18 + Vite · Node + Express + TypeScript · Prisma · PostgreSQL · JWT Auth

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

- **Node.js** 18+
- **npm**
- **PostgreSQL** 14+ (or Docker, to use the bundled compose file)

---

## ⚙️ Backend Setup (Node + Express)

### 1. Navigate to backend

```bash
cd backend-node
```

### 2. Start PostgreSQL

Use the bundled Docker Compose file (creates the `manage_expense_node` database):

```bash
docker compose up -d
```

Or point `DATABASE_URL` (next step) at your own PostgreSQL instance.

### 3. Create the `.env` file

```bash
cp .env.example .env
```

Then open `.env` and adjust values as needed:

```env
NODE_ENV=development
PORT=8000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manage_expense_node?schema=public"

JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
REFRESH_TOKEN_TTL_REMEMBER=30d

# CORS — allow frontend to talk to backend
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Mail (console transport in dev when MAIL_HOST is empty)
MAIL_HOST=
MAIL_FROM="Manage Expense <no-reply@manage-expense.local>"
```

### 4. Install dependencies

```bash
npm install
```

### 5. Run migrations

```bash
npm run db:migrate
```

### 6. Seed default categories

```bash
npm run db:seed
```

This creates the default categories (Food, Transport, Shopping, etc.) available to all users.

### 7. Start the backend server

```bash
npm run dev      # tsx watch (development)
# or: npm run build && npm start   (production)
```

Backend runs at: **http://localhost:8000**

> See [backend-node/README.md](backend-node/README.md) for the full API reference and architecture.

---

## 🎨 Frontend Setup (React)

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
├── backend-node/
│   ├── package.json
│   ├── docker-compose.yml      ← local PostgreSQL
│   ├── .env                    ← you create this
│   ├── .env.example            ← template
│   ├── prisma/
│   │   ├── schema.prisma       ← data model
│   │   ├── migrations/
│   │   └── seed.ts             ← default categories
│   └── src/
│       ├── app.ts / server.ts  ← express app + bootstrap
│       ├── config / lib / middleware / utils
│       ├── jobs/               ← recurring cron, budget alerts
│       └── modules/
│           ├── auth/           ← auth, user profile
│           ├── transactions/   ← income, expenses, tags, recurring
│           ├── categories/     ← categories & budgets
│           ├── splits/         ← bill splitting
│           └── reports/        ← import & export
│
└── frontend/
    ├── package.json
    ├── .env                    ← you create this
    ├── vite.config.js
    └── src/
        ├── pages/              ← all route pages
        ├── components/         ← reusable UI components
        ├── store/              ← Zustand state management
        ├── api/                ← Axios API calls
        └── context/            ← Theme context
```

---

## 🔌 API Endpoints Reference

All payloads are camelCase JSON. The frontend's Axios layer converts to/from
snake_case automatically, so React components keep their existing field names.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT tokens) |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/refresh` | Refresh access token |
| GET/PATCH | `/api/auth/profile` | Get / update profile |
| GET/POST | `/api/transactions` | List / create transactions |
| GET | `/api/transactions/dashboard-summary` | Dashboard stats |
| GET/POST | `/api/categories` | List / create categories |
| GET/POST | `/api/budgets` | List / create budgets |
| GET/POST | `/api/split-groups` | List / create split groups |
| GET | `/api/split-groups/:id/balances` | Who owes whom |
| POST | `/api/reports/import` | Import CSV |
| GET | `/api/reports/export.csv` | Export CSV |
| GET | `/api/reports/export.pdf` | Export PDF |

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
2. Select the `backend-node/` folder
3. Add a PostgreSQL plugin
4. Set environment variables (same as your `.env` but with production values):
   - `NODE_ENV=production`
   - `DATABASE_URL` (Railway provides this for its PostgreSQL plugin)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (long random strings)
   - `CORS_ORIGINS=https://your-frontend.vercel.app`
5. Build command: `npm install && npm run build && npm run db:deploy`
6. Start command: `npm start`

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

**Prisma can't reach the database:**  
Confirm PostgreSQL is running (`docker compose up -d` in `backend-node/`) and that
`DATABASE_URL` in `backend-node/.env` matches its host, port, user, and database.

**CORS error in browser:**  
Make sure `CORS_ORIGINS` in `backend-node/.env` matches exactly where your frontend is running (`http://localhost:5173`).

**`PrismaClient is not generated`:**
```bash
npm run db:generate
```

**Frontend shows blank page:**  
Check that `VITE_API_URL` in `frontend/.env` points to your running backend.

---

## 📄 License

MIT — free to use, modify, and deploy.
