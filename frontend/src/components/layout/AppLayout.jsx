import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const pageTitles = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/income': 'Income',
  '/categories': 'Categories',
  '/splits': 'Split Expenses',
  '/reports': 'Reports & Import/Export',
  '/settings': 'Settings',
}

export function AppLayout() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || (pathname.startsWith('/splits/') ? 'Split Group' : 'Expense Manager')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
