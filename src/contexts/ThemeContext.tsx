import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('ecosphere-theme') as Theme | null
    return stored ?? 'dark'
  })

  const getResolved = (t: Theme): 'dark' | 'light' => {
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return t
  }

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => getResolved(theme))

  useEffect(() => {
    const root = document.documentElement
    const resolved = getResolved(theme)
    setResolvedTheme(resolved)
    root.classList.remove('dark', 'light')
    root.classList.add(resolved)

    // Listen to system changes if 'system' mode
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (theme === 'system') {
        const newResolved = mql.matches ? 'dark' : 'light'
        setResolvedTheme(newResolved)
        root.classList.remove('dark', 'light')
        root.classList.add(newResolved)
      }
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem('ecosphere-theme', t)
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
