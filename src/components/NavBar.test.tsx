/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LangProvider } from '../i18n/LangContext'
import { NavBar } from './NavBar'

describe('NavBar', () => {
  it('uses a gear icon for the settings tab', () => {
    render(<LangProvider><NavBar active="workout" onChange={vi.fn()} /></LangProvider>)

    const settings = screen.getByRole('button', { name: 'Настройки' })
    expect(settings.querySelector('svg')).toHaveAttribute('data-icon', 'gear')
  })
})
