// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { addSet } from '../data-layer/sets'
import { addExerciseToWorkout, updateSet } from '../data-layer/workoutEditor'
import { finishWorkout, startWorkout } from '../data-layer/workouts'
import { db } from '../db/schema'
import { initExerciseCatalog } from '../db/seedExercises'
import { LangProvider } from '../i18n/LangContext'
import { HistoryScreen } from './HistoryScreen'

function renderHistory() {
  return render(<LangProvider><HistoryScreen /></LangProvider>)
}

async function completedWorkout() {
  const workout = await startWorkout(db, 'ru')
  await db.workouts.update(workout.id, {
    title: 'Грудь и трицепс',
    startedAt: '2026-09-10T10:00:00.000Z',
    finishedAt: '2026-09-10T10:48:00.000Z',
  })
  await addExerciseToWorkout(db, workout.id, 19)
  for (const [weight, reps] of [[14, 12], [14, 10], [16, 7]] as const) {
    const set = await addSet(db, workout.id, 19, weight, reps)
    await updateSet(db, set.id, { completed: true })
  }
  await addExerciseToWorkout(db, workout.id, 1)
  await addSet(db, workout.id, 1, 50, 8)
  await finishWorkout(db, workout.id)
  await db.workouts.update(workout.id, { finishedAt: '2026-09-10T10:48:00.000Z' })
  return workout.id
}

describe('workout history', () => {
  beforeEach(async () => {
    localStorage.clear()
    history.replaceState(null, '', '/')
    await db.delete()
    await db.open()
    await initExerciseCatalog(db)
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
    HTMLDialogElement.prototype.close = function () { this.open = false }
  })

  it('shows real exercise names, set counts, repetitions, duration, and volume', async () => {
    await completedWorkout()
    renderHistory()

    expect(await screen.findByText('Жим гантелей под наклоном')).toBeVisible()
    expect(screen.getByText('3 подхода, 29 повторений')).toBeVisible()
    expect(screen.getByText(/48 минут/)).toBeVisible()
    expect(screen.getByText(/420 кг/)).toBeVisible()
    expect(screen.queryByText('Жим лежа')).not.toBeInTheDocument()
  })

  it('opens the same editable detail from list and calendar and browser Back returns to its origin', async () => {
    const workoutId = await completedWorkout()
    renderHistory()
    const listEntry = await screen.findByRole('button', { name: /Грудь и трицепс/ })
    await userEvent.click(listEntry)
    expect(await screen.findByRole('heading', { name: 'Грудь и трицепс' })).toBeVisible()
    await userEvent.clear(screen.getByLabelText('Вес, подход 1'))
    await userEvent.type(screen.getByLabelText('Вес, подход 1'), '18')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить подход 1' }))
    await waitFor(async () => expect((await db.sets.where('workoutId').equals(workoutId).filter((set) => set.exerciseId === 19).sortBy('setOrder'))[0].weight).toBe(18))

    await act(async () => { history.back() })
    await waitFor(() => expect(screen.queryByLabelText('Вес, подход 1')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: /Грудь и трицепс/ })).toHaveFocus())

    await userEvent.click(screen.getByRole('button', { name: 'Календарь' }))
    await userEvent.click(screen.getByRole('button', { name: /10 сентября/ }))
    expect(await screen.findByRole('heading', { name: 'Грудь и трицепс' })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Назад к календарю' }))
    expect(screen.getByRole('button', { name: /10 сентября/ })).toBeVisible()
  })

  it('renames a completed workout without reopening it as active', async () => {
    const workoutId = await completedWorkout()
    renderHistory()
    await userEvent.click(await screen.findByRole('button', { name: /Грудь и трицепс/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Изменить название тренировки' }))
    const title = screen.getByLabelText('Название тренировки')
    await userEvent.clear(title)
    await userEvent.type(title, 'Силовая грудь')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить название' }))
    await waitFor(async () => expect((await db.workouts.get(workoutId))?.title).toBe('Силовая грудь'))
    expect((await db.workouts.get(workoutId))?.finishedAt).not.toBeNull()
    expect(await db.workouts.get(workoutId)).toBeDefined()
  })
})
