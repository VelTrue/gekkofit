// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, type Exercise } from '../db/schema'
import { initExerciseCatalog } from '../db/seedExercises'
import { addSet } from '../data-layer/sets'
import { startWorkout } from '../data-layer/workouts'
import { LangProvider } from '../i18n/LangContext'
import { ExercisePicker } from './ExercisePicker'

function Harness({ onPick = vi.fn() }: { onPick?: (exercise: Exercise) => void }) {
  const [open, setOpen] = useState(false)
  return <LangProvider><button onClick={() => setOpen(true)}>Добавить упражнение</button>
    {open && <ExercisePicker onPick={(exercise) => { onPick(exercise); setOpen(false) }} onClose={() => setOpen(false)} />}
  </LangProvider>
}

async function openPicker(onPick = vi.fn()) {
  render(<Harness onPick={onPick} />)
  await userEvent.click(screen.getByRole('button', { name: 'Добавить упражнение' }))
  await screen.findByRole('heading', { name: 'Группы мышц' })
  return onPick
}

async function search(query: string) {
  const user = userEvent.setup()
  const input = screen.getByRole('searchbox', { name: 'Поиск упражнений' })
  await user.clear(input)
  await user.click(input)
  await user.paste(query)
  return screen.findByRole('region', { name: 'Результаты поиска' })
}

describe('visual exercise picker', () => {
  beforeEach(async () => {
    localStorage.clear()
    history.replaceState({ screen: 'workout' }, '')
    await db.delete()
    await db.open()
    await initExerciseCatalog(db)
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
    HTMLDialogElement.prototype.close = function () { this.open = false }
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('shows anatomy and supporting metadata, and selects only from the row', async () => {
    const onPick = await openPicker()
    const results = await search('жим лежа наклон гантели')
    const select = await within(results).findByRole('button', { name: 'Добавить Жим гантелей под наклоном' })
    expect(within(select.closest('li')!).getByRole('img', { name: /Основные мышцы: грудь/ })).toBeVisible()
    expect(within(select).getByText('гантели')).toBeVisible()
    expect(within(select).getByText('грудь')).toBeVisible()
    await userEvent.click(select)
    await waitFor(() => expect(onPick).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 19 })))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(history.state).toEqual({ screen: 'workout' })
    expect(screen.getByRole('button', { name: 'Добавить упражнение' })).toHaveFocus()
  })

  it('opens the full detail sheet without selecting and restores focus on visible Back and Escape', async () => {
    const workout = await startWorkout(db, 'ru')
    const set = await addSet(db, workout.id, 19, 16, 10)
    await db.sets.update(set.id, { completed: true })
    const onPick = await openPicker()
    const results = await search('жим лежа наклон гантели')
    const info = await within(results).findByRole('button', { name: 'Об упражнении Жим гантелей под наклоном' })
    await userEvent.click(info)
    const detail = screen.getByRole('dialog', { name: 'Жим гантелей под наклоном' })
    expect(detail).toHaveClass('mastery-sheet')
    const back = within(detail).getByRole('button', { name: 'Назад к упражнениям' })
    expect(back).toHaveFocus()
    const alternatives = within(detail).getByRole('button', { name: /Если оборудование занято/ })
    expect(alternatives).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(alternatives)
    const alternativesList = within(detail).getByRole('list', { name: 'Альтернативы' })
    expect(alternativesList.children.length).toBeGreaterThanOrEqual(2)
    expect(alternativesList.children.length).toBeLessThanOrEqual(3)
    expect(onPick).not.toHaveBeenCalled()
    expect(detail.querySelectorAll('[data-body-view]')).toHaveLength(2)
    expect(within(detail).getByText('Основные мышцы')).toBeVisible()
    expect(within(detail).getByText('Вспомогательные мышцы')).toBeVisible()
    expect(within(detail).getByText('гантели')).toBeVisible()
    expect(await within(detail).findByText('16 кг × 10')).toBeVisible()
    await userEvent.click(back)
    await waitFor(() => expect(detail).not.toBeInTheDocument())
    expect(info).toHaveFocus()
    expect(screen.getByRole('searchbox')).toHaveValue('жим лежа наклон гантели')
    await userEvent.click(info)
    fireEvent(screen.getByRole('dialog', { name: 'Жим гантелей под наклоном' }), new Event('cancel', { bubbles: false, cancelable: true }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Жим гантелей под наклоном' })).not.toBeInTheDocument())
    expect(info).toHaveFocus()
  })

  it('closes detail before picker on browser Back, preserving the filter', async () => {
    await openPicker()
    const results = await search('жим лежа наклон гантели')
    const info = await within(results).findByRole('button', { name: 'Об упражнении Жим гантелей под наклоном' })
    await userEvent.click(info)
    await act(async () => { history.back() })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Жим гантелей под наклоном' })).not.toBeInTheDocument())
    expect(info).toHaveFocus()
    expect(screen.getByRole('searchbox')).toHaveValue('жим лежа наклон гантели')
    await act(async () => { history.back() })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Добавить упражнение' })).toHaveFocus()
  })

  it('separates recent and frequent recommendations without repeating exercises', async () => {
    const workout = await startWorkout(db, 'ru')
    for (const exerciseId of [1, 19, 2, 3, 4]) {
      const set = await addSet(db, workout.id, exerciseId, 20, 8)
      await db.sets.update(set.id, { completed: true })
    }
    await openPicker()
    const recent = screen.getByRole('region', { name: 'Недавние' })
    const frequent = screen.getByRole('region', { name: 'Часто используемые' })
    const recentIds = Array.from(recent.querySelectorAll('[data-exercise-id]')).map((row) => row.getAttribute('data-exercise-id'))
    const frequentIds = Array.from(frequent.querySelectorAll('[data-exercise-id]')).map((row) => row.getAttribute('data-exercise-id'))
    expect(recentIds).toEqual(['4', '3', '2'])
    expect(frequentIds).toEqual(['19', '1'])
    expect(recentIds.some((id) => frequentIds.includes(id))).toBe(false)
    expect(screen.getByRole('region', { name: 'Все упражнения' })).toBeVisible()
  })

  it('filters the full results by muscle group and clears the filter', async () => {
    await openPicker()
    const group = screen.getByRole('button', { name: 'Грудь' })
    await userEvent.click(group)
    expect(group).toHaveAttribute('aria-pressed', 'true')
    const results = screen.getByRole('region', { name: 'Все упражнения' })
    const ids = Array.from(results.querySelectorAll('[data-exercise-id]')).map((row) => Number(row.getAttribute('data-exercise-id')))
    const expected = await db.exercises.where('muscle_group').equals('ГРУДЬ').primaryKeys()
    expect(ids).toEqual(expected)
    await userEvent.click(screen.getByRole('button', { name: 'Все группы' }))
    expect(group).toHaveAttribute('aria-pressed', 'false')
  })

  it('reveals the complete catalog in accessible batches and resets the batch on a new query', async () => {
    await openPicker()
    const results = screen.getByRole('region', { name: 'Все упражнения' })
    expect(results.querySelectorAll('[data-exercise-id]').length).toBe(40)
    await userEvent.click(within(results).getByRole('button', { name: 'Показать ещё' }))
    expect(results.querySelectorAll('[data-exercise-id]').length).toBe(80)
    const matches = await search('жим лежа наклон гантели')
    expect(matches.querySelectorAll('[data-exercise-id]').length).toBe(1)
    await userEvent.click(screen.getByRole('button', { name: 'Очистить поиск' }))
    expect(screen.getByRole('region', { name: 'Все упражнения' }).querySelectorAll('[data-exercise-id]').length).toBe(40)
  })

  it('shows a recoverable catalog load error and a useful empty search', async () => {
    vi.spyOn(db.exercises, 'toArray').mockRejectedValueOnce(new Error('read failed'))
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Добавить упражнение' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить упражнения')
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await screen.findByRole('heading', { name: 'Группы мышц' })
    await search('zzzzzz')
    expect(await screen.findByText('Ничего не найдено')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Очистить поиск' }))
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })

  it('localizes controls, groups, metadata, and empty history in English', async () => {
    localStorage.setItem('lang', 'en')
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Добавить упражнение' }))
    await screen.findByRole('heading', { name: 'Muscle groups' })
    expect(screen.getByRole('button', { name: 'Chest' })).toBeVisible()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search exercises' }), 'Dumbbell Incline Bench Press')
    await userEvent.click(await screen.findByRole('button', { name: 'About Dumbbell Incline Bench Press' }))
    const detail = screen.getByRole('dialog', { name: 'Dumbbell Incline Bench Press' })
    expect(within(detail).getByText('Dumbbells')).toBeVisible()
    expect(await within(detail).findByText('No logged sets yet')).toBeVisible()
  })
})
