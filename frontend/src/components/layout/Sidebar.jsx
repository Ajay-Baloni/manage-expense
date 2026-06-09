import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowUpDown, Tag, Users, FileText,
  Settings, LogOut, TrendingUp, X, BarChart2, Sun, Moon, Monitor
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { selectUser, logout as logoutAction } from '../../store/authSlice'
import { toggleSidebar as toggleSidebarAction } from '../../store/uiSlice'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
  { to: '/income', icon: TrendingUp, label: 'Income' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/splits', icon: Users, label: 'Splits' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen)
  const toggleSidebar = () => dispatch(toggleSidebarAction())
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  const handleLogout = async () => {
    await dispatch(logoutAction())
    toast.success('Logged out')
    navigate('/auth/login')
  }

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`
    : (user?.email?.[0]?.toUpperCase() || 'U')

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-30 h-full w-60 transform flex flex-col',
          'bg-card border-r border-border',
          'transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight">FinTrack</span>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden p-1 rounded-md hover:bg-accent text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
              onClick={() => window.innerWidth < 1024 && toggleSidebar()}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-2 py-3 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md mb-0.5">
            <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.full_name || user?.first_name || 'User'}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm flex-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
            <button
              onClick={cycleTheme}
              title={`Theme: ${theme}`}
              className="flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
