import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const options = [
  { value: 'light',  icon: Sun,     label: 'Light'  },
  { value: 'dark',   icon: Moon,    label: 'Dark'   },
  { value: 'system', icon: Monitor, label: 'System' },
] as const

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()

  if (compact) {
    // Single-button cycle: light → dark → system
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    const Current = options.find(o => o.value === theme)?.icon ?? Moon
    return (
      <button
        onClick={() => setTheme(next)}
        title={`Theme: ${theme} — click to switch`}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
      >
        <Current className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted border border-border">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
