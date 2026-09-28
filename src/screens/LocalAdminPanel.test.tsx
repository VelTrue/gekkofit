// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { db } from '../db/schema'
import { initExerciseCatalog } from '../db/seedExercises'
import { LangProvider } from '../i18n/LangContext'
import { LocalAdminPanel } from './LocalAdminPanel'
import { ProgressScreen } from './ProgressScreen'

beforeEach(async () => {
  localStorage.clear()
  await db.delete(); await db.open(); await initExerciseCatalog(db)
})
afterEach(() => cleanup())

it('edits a level, shows it in mastery and restores automatic calculation', async () => {
  const user = userEvent.setup()
  const view = render(<LangProvider><LocalAdminPanel /></LangProvider>)
  await user.click(screen.getByRole('button', { name: 'Админ-панель (локальная)' }))
  await user.selectOptions(await screen.findByLabelText('Упражнение'), '19')
  const level = screen.getByLabelText('Уровень')
  await user.clear(level); await user.type(level, '4')
  expect(screen.getByLabelText('Очки мастерства')).toHaveValue(120)
  await user.click(screen.getByRole('button', { name: 'Сохранить мастерство' }))
  expect(await screen.findByText('Сохранено. Результат доступен во вкладке «Мастерство».')).toBeVisible()
  view.unmount()
  const progress = render(<LangProvider><ProgressScreen /></LangProvider>)
  expect(await screen.findByRole('button', { name: /уровень 4/ })).toBeVisible()
  progress.unmount()
  render(<LangProvider><LocalAdminPanel /></LangProvider>)
  await user.click(screen.getByRole('button', { name: 'Админ-панель (локальная)' }))
  await user.selectOptions(await screen.findByLabelText('Упражнение'), '19')
  expect(screen.getByLabelText('Уровень')).toHaveValue(4)
  await user.click(screen.getByRole('button', { name: 'Вернуть автоматический расчёт' }))
  await waitFor(() => expect(screen.getByLabelText('Уровень')).toHaveValue(0))
})
