import { Outlet } from 'react-router-dom'
import { DollarSign } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">ExpenseManager</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
