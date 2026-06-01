import { Menu, Sun, Moon, Monitor } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { useTheme } from '../../context/ThemeContext'
import { Button } from '../ui/button'

// Mobile-only header: provides the menu toggle + theme toggle on small screens.
// On desktop (lg+) it is hidden — the sidebar holds the theme toggle and the
// page's own header provides the title.
export function Topbar({ title }) {
  const { toggleSidebar } = useUiStore()
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <header className="lg:hidden sticky top-0 z-10 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
      <Button variant="ghost" size="icon" onClick={cycleTheme} className="h-8 w-8 text-muted-foreground">
        <ThemeIcon className="h-4 w-4" />
      </Button>
    </header>
  )
}
