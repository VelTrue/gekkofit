// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import { initExerciseCatalog } from '../db/seedExercises'
import { addSet } from '../data-layer/sets'
import { addExerciseToWorkout, updateSet } from '../data-layer/workoutEditor'
import { finishWorkout, startWorkout } from '../data-layer/workouts'
import { LangProvider } from '../i18n/LangContext'
import { HomeScreen } from './HomeScreen'

function renderHome() { return render(<LangProvider><HomeScreen /></LangProvider>) }

async function activeFixture(completed = true) {
  const workout = await startWorkout(db, 'ru')
  await addExerciseToWorkout(db, workout.id, 19)
  const set = await addSet(db, workout.id, 19, 14, 12)
  await updateSet(db, set.id, { completed })
  return { workout, set }
}

describe('active workout', () => {
  beforeEach(async () => {
    localStorage.clear()
    await db.delete()
    await db.open()
    await initExerciseCatalog(db)
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
    HTMLDialogElement.prototype.close = function () { this.open = false }
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('switches to an editable note, remembers it, and saves an edited set', async () => {
    const { set } = await activeFixture()
    const view = renderHome()
    await userEvent.click(await screen.findByRole('button', { name: 'Список' }))
    expect(screen.getByText('14 кг × 12')).toBeVisible()
    expect(localStorage.getItem('workout-view-mode')).toBe('list')
    await userEvent.click(screen.getByRole('button', { name: /Редактировать подход 1/ }))
    const editor = screen.getByRole('dialog')
    await userEvent.clear(within(editor).getByLabelText('Вес, подход 1'))
    await userEvent.type(within(editor).getByLabelText('Вес, подход 1'), '16')
    await userEvent.click(within(editor).getByRole('button', { name: 'Сохранить подход 1' }))
    await waitFor(async () => expect((await db.sets.get(set.id))?.weight).toBe(16))
    await userEvent.click(within(editor).getByRole('button', { name: 'Назад к списку' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('16 кг × 12')).toBeVisible()
    view.unmount()
    renderHome()
    expect(await screen.findByRole('button', { name: 'Список' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('starts rest on completion but does not restart it when editing a completed set', async () => {
    await activeFixture(false)
    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: 'Завершить подход 1' }))
    expect(await screen.findByLabelText('Таймер отдыха')).toHaveTextContent('1:30')
    await waitFor(() => expect(screen.getByLabelText('Таймер отдыха')).toHaveTextContent('1:29'), { timeout: 2000 })
    await userEvent.clear(screen.getByLabelText('Вес, подход 1'))
    await userEvent.type(screen.getByLabelText('Вес, подход 1'), '16')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить подход 1' }))
    await screen.findByText('Сохранено')
    expect(screen.getByLabelText('Таймер отдыха')).not.toHaveTextContent('1:30')
  })

  it('keeps an exercise without sets after reloading and opens its editor in list mode', async () => {
    const workout = await startWorkout(db, 'ru')
    await addExerciseToWorkout(db, workout.id, 19)
    localStorage.setItem('workout-view-mode', 'list')
    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: /Редактировать упражнение Жим гантелей под наклоном/ }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Добавить подход' }))
    expect(await screen.findByLabelText('Вес, подход 1')).toBeVisible()
    await waitFor(async () => expect(await db.sets.count()).toBe(1))
  })

  it('requires named confirmation before discarding and deletes the workout', async () => {
    const { workout } = await activeFixture()
    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: 'Удалить тренировку' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(workout.title)
    expect(await db.workouts.get(workout.id)).toBeDefined()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))
    await waitFor(async () => expect(await db.workouts.get(workout.id)).toBeUndefined())
    expect(await screen.findByRole('button', { name: 'Начать тренировку' })).toBeVisible()
  })

  it('finishes only after confirmation and retains logged records', async () => {
    const { workout, set } = await activeFixture()
    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: 'Завершить тренировку' }))
    expect((await db.workouts.get(workout.id))?.finishedAt).toBeNull()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Завершить' }))
    await waitFor(async () => expect((await db.workouts.get(workout.id))?.finishedAt).not.toBeNull())
    expect(await db.sets.get(set.id)).toBeDefined()
  })

  it('closes only the top confirmation on browser back and restores its opener', async () => {
    await activeFixture()
    localStorage.setItem('workout-view-mode', 'list')
    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: /Редактировать подход 1/ }))
    const deleteButton = within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить подход 1' })
    await userEvent.click(deleteButton)
    expect(screen.getAllByRole('dialog')).toHaveLength(2)
    await act(async () => { history.back() })
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
    expect(deleteButton).toHaveFocus()
    expect(await db.sets.count()).toBe(1)
  })

  it('focuses the selected note set when opening its editor', async () => {
    const { workout } = await activeFixture()
    const second = await addSet(db, workout.id, 19, 16, 10)
    await updateSet(db, second.id, { completed: true })
    localStorage.setItem('workout-view-mode', 'list')
    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: /Редактировать подход 2/ }))
    expect(within(screen.getByRole('dialog')).getByLabelText('Вес, подход 2')).toHaveFocus()
  })

  it('reorders and removes exercises through persistent editor operations', async () => {
    const { workout } = await activeFixture()
    await addExerciseToWorkout(db, workout.id, 1)
    renderHome()
    await userEvent.click(await screen.findByRole('button', { name: 'Следующее' }))
    await userEvent.click(screen.getByRole('button', { name: 'Переместить выше' }))
    await waitFor(async () => expect((await db.workoutExercises.where('[workoutId+exerciseId]').equals([workout.id, 1]).first())?.order).toBe(0))
    const remove = screen.getByRole('button', { name: 'Удалить упражнение' })
    await waitFor(() => expect(remove).toBeEnabled())
    await userEvent.click(remove)
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Удалить' }))
    await waitFor(async () => expect(await db.workoutExercises.where('[workoutId+exerciseId]').equals([workout.id, 1]).count()).toBe(0))
    expect(await db.sets.count()).toBe(1)
  })

  it('shows the previous completed session separately from active set values', async () => {
    const previous = await activeFixture()
    await finishWorkout(db, previous.workout.id)
    const active = await startWorkout(db, 'ru')
    await addExerciseToWorkout(db, active.id, 19)
    await addSet(db, active.id, 19, 18, 8)
    renderHome()
    expect(await screen.findByText('14 кг × 12')).toBeVisible()
    expect(screen.getByLabelText('Вес, подход 1')).toHaveValue('18')
  })

  it('retries a failed initial load', async () => {
    await activeFixture()
    vi.spyOn(db.workouts, 'toArray').mockRejectedValueOnce(new Error('read failed'))
    renderHome()
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить')
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByLabelText('Вес, подход 1')).toHaveValue('14')
  })
})
