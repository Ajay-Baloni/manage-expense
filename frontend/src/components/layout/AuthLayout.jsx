import { Outlet } from 'react-router-dom'
import { BarChart2 } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <BarChart2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight">FinTrack</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-sm p-8">
          <Outlet />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Secure financial management for individuals and teams
        </p>
      </div>
    </div>
  )
}
