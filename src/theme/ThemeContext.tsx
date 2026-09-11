/* eslint-disable react-refresh/only-export-components -- provider and hook form one public context API */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'system' | 'dark' | 'light'
type ResolvedTheme = Exclude<ThemeMode, 'system'>

interface ThemeContextValue {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

const themeStorageKey = 'theme-mode'
const darkModeQuery = '(prefers-color-scheme: dark)'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'dark' || value === 'light'
}

function readInitialMode(): ThemeMode {
  const stored = localStorage.getItem(themeStorageKey)
  return isThemeMode(stored) ? stored : 'system'
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia(darkModeQuery).matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readInitialMode)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(readSystemTheme)
  const resolved = mode === 'system' ? systemTheme : mode

  useEffect(() => {
    const query = window.matchMedia(darkModeQuery)
    const updateSystemTheme = () => setSystemTheme(query.matches ? 'dark' : 'light')
    updateSystemTheme()
    query.addEventListener('change', updateSystemTheme)
    return () => query.removeEventListener('change', updateSystemTheme)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  }, [resolved])

  const setMode = useCallback((nextMode: ThemeMode) => {
    localStorage.setItem(themeStorageKey, nextMode)
    setModeState(nextMode)
  }, [])

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
