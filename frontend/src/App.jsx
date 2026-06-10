import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { ThemeProvider } from './context/ThemeContext'

import { AppLayout } from './components/layout/AppLayout'
import { AuthLayout } from './components/layout/AuthLayout'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/transactions/Transactions'
import Income from './pages/transactions/Income'
import Categories from './pages/categories/Categories'
import Splits from './pages/splits/Splits'
import SplitDetail from './pages/splits/SplitDetail'
import Reports from './pages/reports/Reports'
import Settings from './pages/settings/Settings'

function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  return children
}

function PublicRoute({ children }) {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* App routes */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/income" element={<Income />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/splits" element={<Splits />} />
            <Route path="/splits/:id" element={<SplitDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </ThemeProvider>
  )
}
