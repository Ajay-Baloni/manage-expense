import { Menu, Sun, Moon, Monitor } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { useTheme } from '../../context/ThemeContext'
import { Button } from '../ui/button'

export function Topbar({ title }) {
  const { toggleSidebar } = useUiStore()
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <header className="sticky top-0 z-10 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md hover:bg-accent transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="font-semibold text-lg flex-1">{title}</h1>
      <Button variant="ghost" size="icon" onClick={cycleTheme}>
        <ThemeIcon className="h-5 w-5" />
      </Button>
    </header>
  )
}
