// @vitest-environment jsdom
/// <reference types="node" />

import '@testing-library/jest-dom/vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LangProvider } from '../i18n/LangContext'
import { SettingsScreen } from '../screens/SettingsScreen'
import { ThemeProvider, useTheme } from './ThemeContext'

vi.mock('../data-layer/workouts', () => ({ getWorkoutHistory: vi.fn().mockResolvedValue([]) }))

class MatchMediaStub extends EventTarget {
  readonly media = '(prefers-color-scheme: dark)'
  readonly onchange = null
  matches: boolean

  constructor(matches: boolean) {
    super()
    this.matches = matches
  }

  addListener(listener: (event: MediaQueryListEvent) => void) {
    this.addEventListener('change', listener as EventListener)
  }

  removeListener(listener: (event: MediaQueryListEvent) => void) {
    this.removeEventListener('change', listener as EventListener)
  }

  setMatches(matches: boolean) {
    this.matches = matches
    this.dispatchEvent(new Event('change'))
  }
}

function ThemeProbe() {
  const { mode, resolved, setMode } = useTheme()
  return (
    <div>
      <output aria-label="theme state">{mode}:{resolved}</output>
      <button type="button" onClick={() => setMode('system')}>Системная</button>
      <button type="button" onClick={() => setMode('dark')}>Тёмная</button>
      <button type="button" onClick={() => setMode('light')}>Светлая</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  let media: MatchMediaStub

  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    media = new MatchMediaStub(true)
    vi.stubGlobal('matchMedia', vi.fn(() => media))
  })

  it('persists light mode and applies it to the document', async () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>)

    await userEvent.click(screen.getByRole('button', { name: 'Светлая' }))

    expect(localStorage.getItem('theme-mode')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.getByLabelText('theme state')).toHaveTextContent('light:light')
  })

  it('restores a valid persisted preference', () => {
    localStorage.setItem('theme-mode', 'dark')

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>)

    expect(screen.getByLabelText('theme state')).toHaveTextContent('dark:dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('falls back to system mode for an invalid persisted preference', () => {
    localStorage.setItem('theme-mode', 'sepia')

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>)

    expect(screen.getByLabelText('theme state')).toHaveTextContent('system:dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('tracks operating system changes while system mode is selected', () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>)
    expect(screen.getByLabelText('theme state')).toHaveTextContent('system:dark')

    act(() => media.setMatches(false))

    expect(screen.getByLabelText('theme state')).toHaveTextContent('system:light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it.each([
    { label: 'Тёмная', mode: 'dark', initialSystemDark: true, nextSystemDark: false },
    { label: 'Светлая', mode: 'light', initialSystemDark: false, nextSystemDark: true },
  ] as const)('keeps explicit $mode mode when the operating system changes', async ({ label, mode, initialSystemDark, nextSystemDark }) => {
    media.matches = initialSystemDark
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>)
    await userEvent.click(screen.getByRole('button', { name: label }))

    act(() => media.setMatches(nextSystemDark))

    expect(screen.getByLabelText('theme state')).toHaveTextContent(`${mode}:${mode}`)
    expect(document.documentElement.dataset.theme).toBe(mode)
  })

  it('exposes an accessible three-way theme control in settings', async () => {
    render(
      <ThemeProvider>
        <LangProvider>
          <SettingsScreen />
        </LangProvider>
      </ThemeProvider>,
    )

    const systemButton = screen.getByRole('button', { name: 'Системная' })
    const lightButton = screen.getByRole('button', { name: 'Светлая' })
    expect(systemButton).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(lightButton)

    expect(systemButton).toHaveAttribute('aria-pressed', 'false')
    expect(lightButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('maps the approved foundations and named mastery tiers to semantic tokens', () => {
    const themeCss = readFileSync('src/theme.css', 'utf8')
    expect(themeCss).toContain('--color-bg: #eef1f2')
    expect(themeCss).toContain('--color-surface: #ffffff')
    expect(themeCss).toContain('--color-text: #121517')
    expect(themeCss).toContain('--color-mastery-novice:')
    expect(themeCss).toContain('--color-mastery-master:')
  })

  it('keeps application components free of embedded theme-specific colors', () => {
    const consumers = [
      'src/App.tsx',
      'src/components/LevelBar.tsx',
      'src/components/NavBar.tsx',
      'src/components/Stepper.tsx',
      'src/screens/ExercisePicker.tsx',
      'src/screens/HistoryScreen.tsx',
      'src/screens/HomeScreen.tsx',
      'src/screens/ProgressScreen.tsx',
    ]

    for (const path of consumers) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(source, path).not.toMatch(/\b(?:bg|border|divide|fill|from|ring|shadow|stroke|text|to|via)-(?:black|white)(?:\/\d+)?\b/)
      expect(source, path).not.toMatch(/rgba?\(/i)
    }
  })
})
