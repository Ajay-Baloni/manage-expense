# Frontend Migration (Zustand → Redux Toolkit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5 Zustand stores with Redux Toolkit slices (+ redux-persist), preserving every piece of state, every action's behavior, and all side-effects, then migrate all component call sites — with no change to the `src/api/` axios layer or the API contract.

**Architecture:** `configureStore` with 5 slices (auth, transaction, category, split, ui). Async store actions become `createAsyncThunk`; synchronous setters become reducers. `redux-persist` replaces zustand `persist` for the auth and ui slices using the same whitelists. Components swap `useXxxStore()` destructuring for `useAppSelector` + `useAppDispatch(thunk)`.

**Tech Stack:** React 18, Redux Toolkit, react-redux, redux-persist, Vite.

**Reference:**
- Current stores: `frontend/src/store/{authStore,transactionStore,categoryStore,splitStore,uiStore}.js`
- Design spec: `docs/superpowers/specs/2026-06-09-node-redux-migration-design.md`
- Backend must be running (Node or Django — contract identical) to smoke-test.

> **Migration order rationale:** Build the store + all slices first (Tasks 1–6), then migrate call sites slice-by-slice (Tasks 7–11). The app won't compile cleanly until call sites are migrated, so do the whole sequence before the final smoke test. Commit per task.

---

### Task 1: Install Redux, remove Zustand, wire the Provider

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/store/index.js`
- Create: `frontend/src/store/hooks.js`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Deps**

Run:
```bash
cd frontend && npm i @reduxjs/toolkit react-redux redux-persist && npm rm zustand
```

- [ ] **Step 2: `src/store/index.js`** (slices added in later tasks; start with empty reducer map + persist scaffolding)

```js
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

import authReducer from './slices/authSlice'
import transactionReducer from './slices/transactionSlice'
import categoryReducer from './slices/categorySlice'
import splitReducer from './slices/splitSlice'
import uiReducer from './slices/uiSlice'

const authPersist = persistReducer(
  { key: 'auth', storage, whitelist: ['user', 'accessToken', 'refreshToken', 'isAuthenticated'] },
  authReducer,
)
const uiPersist = persistReducer(
  { key: 'ui', storage, whitelist: ['theme', 'sidebarOpen'] },
  uiReducer,
)

const rootReducer = combineReducers({
  auth: authPersist,
  transaction: transactionReducer,
  category: categoryReducer,
  split: splitReducer,
  ui: uiPersist,
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault({ serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] } }),
})
export const persistor = persistStore(store)
```

- [ ] **Step 3: `src/store/hooks.js`**

```js
import { useDispatch, useSelector } from 'react-redux'
export const useAppDispatch = () => useDispatch()
export const useAppSelector = useSelector
```

- [ ] **Step 4: `src/main.jsx`** — wrap App in Provider + PersistGate

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
)
```

- [ ] **Step 5:** This won't compile until slices exist (Tasks 2–6). Don't run dev yet. **Commit** after Task 6.

---

### Task 2: authSlice

**Files:**
- Create: `frontend/src/store/slices/authSlice.js`
- Delete: `frontend/src/store/authStore.js` (after call sites migrated — Task 7; for now create the slice)

- [ ] **Step 1: Implement `authSlice.js`** — preserve thunks + localStorage side-effects from `authStore.js`:

```js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../api/auth'

export const login = createAsyncThunk('auth/login', async (credentials) => {
  const res = await authApi.login(credentials)
  const { user, access, refresh } = res.data
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
  return { user, access, refresh }
})

export const register = createAsyncThunk('auth/register', async (data) => {
  const res = await authApi.register(data)
  const { user, access, refresh } = res.data
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
  return { user, access, refresh }
})

export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const refreshToken = getState().auth.refreshToken
  try { if (refreshToken) await authApi.logout(refreshToken) } catch {}
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
})

export const loadProfile = createAsyncThunk('auth/loadProfile', async () => {
  const res = await authApi.getProfile()
  return res.data
})

const initialState = { user: null, accessToken: null, refreshToken: null, isAuthenticated: false }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateUser: (state, action) => { state.user = action.payload },
  },
  extraReducers: (builder) => {
    const auth = (state, { payload }) => {
      state.user = payload.user; state.accessToken = payload.access
      state.refreshToken = payload.refresh; state.isAuthenticated = true
    }
    builder
      .addCase(login.fulfilled, auth)
      .addCase(register.fulfilled, auth)
      .addCase(logout.fulfilled, (state) => Object.assign(state, initialState))
      .addCase(loadProfile.fulfilled, (state, { payload }) => { state.user = payload })
  },
})
export const { updateUser } = authSlice.actions
export default authSlice.reducer
```

- [ ] **Step 2:** No standalone run yet (call sites in Task 7). Proceed.

---

### Task 3: transactionSlice

**Files:**
- Create: `frontend/src/store/slices/transactionSlice.js`

- [ ] **Step 1: Implement** — port every action from `transactionStore.js`. State: `transactions, pagination, filters (same defaults), tags, summary, loading`. Reducers: `setFilters` (merge + reset page to 1), `resetFilters`. Thunks: `fetchTransactions(extraParams)` (reads `getState().transaction.filters`, strips empty values, sets transactions+pagination, toggles loading in pending/fulfilled/rejected), `createTransaction` (prepend), `updateTransaction` (map replace), `deleteTransaction` (filter out), `fetchTags`, `fetchSummary`. Mirror the existing logic precisely (including `res.data.results || res.data`).

```js
// filters initial (copy exactly):
const emptyFilters = { type:'', category:'', date_from:'', date_to:'', amount_min:'', amount_max:'', search:'', ordering:'-date', page:1 }
// fetchTransactions strips '' and null before calling transactionsApi.list(params)
```

- [ ] **Step 2:** Proceed (call sites Task 8).

---

### Task 4: categorySlice

**Files:**
- Create: `frontend/src/store/slices/categorySlice.js`

- [ ] **Step 1: Implement** — port `categoryStore.js`. State: `categories, budgets, loading`. Thunks: `fetchCategories(params)`, `createCategory`, `updateCategory`, `deleteCategory`, `fetchBudgets(params)`, `fetchCurrentMonthBudgets`, `createBudget`, `updateBudget`, `deleteBudget`. Reducers update arrays exactly as the store does (push/map/filter). `loading` toggled in fetchCategories.

- [ ] **Step 2:** Proceed (call sites Task 9).

---

### Task 5: splitSlice

**Files:**
- Create: `frontend/src/store/slices/splitSlice.js`

- [ ] **Step 1: Implement** — port `splitStore.js`. State: `groups, currentGroup, expenses, balances, loading`. Thunks: `fetchGroups`, `fetchGroup`, `createGroup`, `fetchExpenses(groupId)`, `createExpense`, `deleteExpense`, `fetchBalances(groupId)`, `settle({groupId,data})`, `addMember({groupId,data})`. `addMember.fulfilled` appends to `currentGroup.members` (guard when null), mirroring the store.

- [ ] **Step 2:** Proceed (call sites Task 10).

---

### Task 6: uiSlice + compile check

**Files:**
- Create: `frontend/src/store/slices/uiSlice.js`

- [ ] **Step 1: Implement** — port `uiStore.js`. State: `theme:'system', sidebarOpen:true, modals:{}`. Reducers: `setTheme`, `toggleSidebar`, `setSidebarOpen`, `openModal(name,data)`, `closeModal(name)`. (The zustand `getModal` selector becomes a plain selector used in components, e.g. `useAppSelector(s => s.ui.modals[name] || {open:false,data:{}})`.)

- [ ] **Step 2: Compile check** — `npm run build` will still fail because components import the old stores. That's expected; the slices themselves must be syntactically valid. Run `npx vite build 2>&1 | head` and confirm errors are only "Cannot find module store/...Store" from component imports, not syntax errors in slices.

- [ ] **Step 3: Commit** the whole store layer.

```bash
git add frontend/src/store frontend/src/main.jsx frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add redux toolkit store + slices (parity with zustand)"
```

---

### Task 7: Migrate auth call sites

**Files:**
- Modify: `frontend/src/App.jsx`, `frontend/src/pages/auth/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/pages/settings/Settings.jsx`, `frontend/src/pages/Dashboard.jsx`, `Transactions.jsx`, `Categories.jsx`, any other `useAuthStore` consumer
- Delete: `frontend/src/store/authStore.js`

- [ ] **Step 1: Find all consumers**

Run: `grep -rl "useAuthStore" frontend/src`

- [ ] **Step 2: Migrate each** — pattern:

```jsx
// before
import { useAuthStore } from '../store/authStore'
const { user, login } = useAuthStore()
await login(form)

// after
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { login } from '../store/slices/authSlice'
const user = useAppSelector((s) => s.auth.user)
const dispatch = useAppDispatch()
await dispatch(login(form)).unwrap()   // .unwrap() preserves throw-on-error for try/catch + toast
```

- `App.jsx` `ProtectedRoute`/`PublicRoute`: `const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated)`.
- `Sidebar.jsx`: `logout` → `dispatch(logout())`; `user` via selector.
- `Settings.jsx`: `updateUser` → `dispatch(updateUser(...))`; `loadProfile` → `dispatch(loadProfile()).unwrap()`.
- Login/Register: `login/register` thunks via `dispatch(...).unwrap()` inside existing try/catch.

- [ ] **Step 3: Delete** `frontend/src/store/authStore.js`.

- [ ] **Step 4: Run** `grep -rl "useAuthStore" frontend/src` → no results. Commit `refactor(frontend): migrate auth to redux`.

---

### Task 8: Migrate transaction call sites

**Files:**
- Modify: `Dashboard.jsx`, `pages/transactions/Transactions.jsx`, `pages/transactions/Income.jsx`, `components/TransactionModal.jsx`, any other consumer
- Delete: `frontend/src/store/transactionStore.js`

- [ ] **Step 1:** `grep -rl "useTransactionStore" frontend/src`.

- [ ] **Step 2: Migrate** — selectors for `transactions, filters, pagination, loading, tags, summary`; dispatch for `fetchTransactions, setFilters, createTransaction, updateTransaction, deleteTransaction, fetchTags, fetchSummary`. `setFilters` is a plain reducer → `dispatch(setFilters({...}))`. Thunks that returned data (create/update) → `await dispatch(...).unwrap()`. Note `Transactions.jsx` reads `filters` in a `useEffect` dep array — keep the selector reference stable (select the slice field, not a new object).

- [ ] **Step 3: Delete** `transactionStore.js`. Run grep → empty. Commit `refactor(frontend): migrate transactions to redux`.

---

### Task 9: Migrate category call sites

**Files:**
- Modify: `Dashboard.jsx`, `pages/categories/Categories.jsx`, `pages/transactions/Transactions.jsx`, `components/BudgetProgressBar.jsx` (if it consumes), any other
- Delete: `frontend/src/store/categoryStore.js`

- [ ] **Step 1:** `grep -rl "useCategoryStore" frontend/src`.
- [ ] **Step 2: Migrate** selectors (`categories, budgets, loading`) + dispatch (all 9 thunks). CRUD thunks that returned data → `.unwrap()`.
- [ ] **Step 3: Delete** `categoryStore.js`. grep → empty. Commit `refactor(frontend): migrate categories to redux`.

---

### Task 10: Migrate split call sites

**Files:**
- Modify: `pages/splits/Splits.jsx`, `pages/splits/SplitDetail.jsx`, `components/SplitGroupCard.jsx` (if consumer), any other
- Delete: `frontend/src/store/splitStore.js`

- [ ] **Step 1:** `grep -rl "useSplitStore" frontend/src`.
- [ ] **Step 2: Migrate** selectors (`groups, currentGroup, expenses, balances, loading`) + dispatch. Thunks taking 2 args now take an object: `settle(groupId,data)` → `dispatch(settle({groupId,data}))`; `addMember(groupId,data)` → `dispatch(addMember({groupId,data}))`. Update those call sites accordingly. Data-returning thunks → `.unwrap()`.
- [ ] **Step 3: Delete** `splitStore.js`. grep → empty. Commit `refactor(frontend): migrate splits to redux`.

---

### Task 11: Migrate ui call sites + final smoke

**Files:**
- Modify: `components/layout/Sidebar.jsx`, `Topbar.jsx`, `AppLayout.jsx`, `context/ThemeContext.jsx`, any modal consumers
- Delete: `frontend/src/store/uiStore.js`

- [ ] **Step 1:** `grep -rl "useUiStore" frontend/src`.
- [ ] **Step 2: Migrate** — `sidebarOpen`/`theme` via selectors; `toggleSidebar/setSidebarOpen/setTheme` via dispatch; modal helpers: `openModal/closeModal` via dispatch, `getModal(name)` → `useAppSelector(s => s.ui.modals[name] || {open:false,data:{}})`. Check `ThemeContext.jsx` — if it read `useUiStore` for theme, switch to selector + dispatch(setTheme).
- [ ] **Step 3: Delete** `uiStore.js`. Run `grep -rl "Store'" frontend/src/store ; grep -rl "use.*Store" frontend/src` → only hooks/slices remain, no `store/xStore` imports.

- [ ] **Step 4: Build** `cd frontend && npm run build` → succeeds with no missing-module errors.

- [ ] **Step 5: Manual smoke** (backend running): login persists across reload (redux-persist), theme + sidebar persist, transactions list/filter/create/delete, dashboard charts, categories+budgets, splits create/expense/settle, CSV import + PDF export download. Confirm no console errors and that a hard refresh keeps you logged in.

- [ ] **Step 6: Commit** `refactor(frontend): migrate ui to redux; remove zustand`.

---

## Self-Review Notes (coverage map)

- Store + persist scaffolding (same whitelists as zustand persist) → Task 1 ✓
- All 5 slices with state + actions preserved 1:1 → Tasks 2–6 ✓
- localStorage token side-effects kept in auth thunks; axios layer untouched → Task 2 ✓
- `setFilters`/`resetFilters` as reducers; filters selector stability for useEffect dep → Tasks 3, 8 ✓
- 2-arg thunks (settle/addMember) converted to object payloads + call-site updates → Tasks 5, 10 ✓
- `getModal` → inline selector → Tasks 6, 11 ✓
- `.unwrap()` preserves throw-for-toast behavior in every try/catch call site → Tasks 7–10 ✓
- redux-persist `<PersistGate>` + login-survives-reload verified → Tasks 1, 11 ✓
- Zustand fully removed (dep + all 5 store files) → Tasks 7–11 ✓
