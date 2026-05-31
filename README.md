# 💰 Manage Expense

A full-stack personal finance manager with expense/income tracking, bill splitting (Splitwise-style), visual charts, import/export, and dark/light/system theme.

**Stack:** React 18 + Vite · Django 4 + DRF · PostgreSQL · JWT Auth

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

- **Python** 3.10+
- **Node.js** 18+
- **PostgreSQL** 14+
- **pip** and **npm**

---

## ⚙️ Backend Setup (Django)

### 1. Navigate to backend

```bash
cd backend
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Activate it:
# On Mac/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create the `.env` file

Create a file called `.env` inside the `backend/` folder:

```bash
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
# Django
SECRET_KEY=any-long-random-string-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# PostgreSQL Database
DB_NAME=expense_manager
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432

# CORS — allow frontend to talk to backend
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# JWT token lifetimes
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# File uploads
MEDIA_ROOT=media/
```

> **SECRET_KEY tip:** Generate one by running:
> ```bash
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

### 5. Create the PostgreSQL database

Open your PostgreSQL shell (`psql`) and run:

```sql
CREATE DATABASE expense_manager;
CREATE USER postgres WITH PASSWORD 'your_postgres_password';
GRANT ALL PRIVILEGES ON DATABASE expense_manager TO postgres;
```

Or if you already have a postgres superuser, just create the DB:

```bash
createdb expense_manager
```

### 6. Run migrations

```bash
python manage.py makemigrations accounts transactions categories splits reports
python manage.py migrate
```

### 7. Seed default categories

```bash
python manage.py create_default_categories
```

This creates 17 default categories (Food, Transport, Shopping, etc.) available to all users.

### 8. Create a superuser (optional, for admin panel)

```bash
python manage.py createsuperuser
```

### 9. Start the backend server

```bash
python manage.py runserver
```

Backend runs at: **http://localhost:8000**  
Admin panel at: **http://localhost:8000/admin**

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
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env                    ← you create this
│   ├── .env.example            ← template
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── apps/
│       ├── accounts/           ← auth, user profile
│       ├── transactions/       ← income & expenses
│       ├── categories/         ← categories & budgets
│       ├── splits/             ← bill splitting
│       └── reports/            ← import & export
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

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login (returns JWT tokens) |
| POST | `/api/auth/logout/` | Logout |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET/PUT | `/api/auth/profile/` | Get / update profile |
| GET/POST | `/api/transactions/` | List / create transactions |
| GET | `/api/transactions/dashboard_summary/` | Dashboard stats |
| GET/POST | `/api/categories/` | List / create categories |
| GET/POST | `/api/budgets/` | List / create budgets |
| GET/POST | `/api/splits/groups/` | List / create split groups |
| GET | `/api/splits/groups/:id/balances/` | Who owes whom |
| POST | `/api/reports/import/csv/` | Import CSV |
| GET | `/api/reports/export/csv/` | Export CSV |
| GET | `/api/reports/export/pdf/` | Export PDF |

---

## 🌐 Deployment (Free / Minimal Cost)

### Recommended Free Stack

| Service | Purpose | Cost |
|---|---|---|
| **Vercel** | React frontend | Free |
| **Railway** | Django backend | Free tier / ~$5/mo |
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
2. Select the `backend/` folder
3. Add a PostgreSQL plugin
4. Set environment variables (same as your `.env` but with production values):
   - `DEBUG=False`
   - `SECRET_KEY=your-production-secret`
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` (Railway provides these)
   - `ALLOWED_HOSTS=your-backend.railway.app`
   - `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app`
5. Add start command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

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

**`psycopg2` install fails:**
```bash
pip install psycopg2-binary
```

**CORS error in browser:**  
Make sure `CORS_ALLOWED_ORIGINS` in `.env` matches exactly where your frontend is running (`http://localhost:5173`).

**`ModuleNotFoundError: No module named 'environ'`:**
```bash
pip install django-environ
```

**Frontend shows blank page:**  
Check that `VITE_API_URL` in `frontend/.env` points to your running backend.

---

## 📄 License

MIT — free to use, modify, and deploy.
