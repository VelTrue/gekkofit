// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: /Жим гантелей под наклоном, 3 подхода, 29 повторений, Объем 420 кг, Личные рекорды 2/ })).toBeVisible()
  })

  it('keeps history detail open when browser Back closes a nested workout editor', async () => {
    await completedWorkout()
    localStorage.setItem('workout-view-mode', 'list')
    renderHistory()
    await userEvent.click(await screen.findByRole('button', { name: /Грудь и трицепс/ }))
    await userEvent.click(screen.getByRole('button', { name: /Редактировать подход 1: 14/ }))
    expect(screen.getByRole('dialog')).toBeVisible()

    await act(async () => { history.back() })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Грудь и трицепс' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Назад к истории' })).toBeVisible()
  })

  it('closes the picker after selection without leaving history detail', async () => {
    await completedWorkout()
    renderHistory()
    await userEvent.click(await screen.findByRole('button', { name: /Грудь и трицепс/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Добавить упражнение' }))
    const picker = await screen.findByRole('dialog', { name: 'Выберите упражнение' })
    await userEvent.click(within(picker).getAllByRole('button', { name: 'Добавить Жим гантелей лежа' })[0])

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Выберите упражнение' })).not.toBeInTheDocument())
    await waitFor(async () => expect(await db.workoutExercises.count()).toBe(3))
    await userEvent.click(await screen.findByRole('button', { name: /Добавленные/ }))
    expect(await screen.findByRole('button', { name: /Жим гантелей лежа/ })).toBeVisible()
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Добавленные' })).getByRole('button', { name: 'Назад' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Добавленные' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Грудь и трицепс' })).toBeVisible()
    expect(history.state?.modal).toBe('workout-history-detail')
  })

  it('returns one level after deleting a workout from nested confirmation', async () => {
    await completedWorkout()
    renderHistory()
    await userEvent.click(await screen.findByRole('button', { name: /Грудь и трицепс/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Удалить тренировку' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Удалить тренировку?' })).getByRole('button', { name: 'Удалить' }))

    expect(await screen.findByText('Завершенные тренировки появятся здесь.')).toBeVisible()
    await waitFor(() => expect(history.state).toBeNull())
  })

  it('consumes confirmation and deleted detail history before the next detail visit', async () => {
    await completedWorkout()
    await db.workouts.add({ id: 'remaining', title: 'Оставшаяся тренировка', startedAt: '2026-09-09T17:00:00.000Z', finishedAt: '2026-09-09T17:30:00.000Z', createdAt: '2026-09-09T17:00:00.000Z', updatedAt: '2026-09-09T17:30:00.000Z' })
    renderHistory()
    await userEvent.click(await screen.findByRole('button', { name: /Грудь и трицепс/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Удалить тренировку' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Удалить тренировку?' })).getByRole('button', { name: 'Удалить' }))
    await screen.findByRole('button', { name: /Оставшаяся тренировка/ })
    await waitFor(() => expect(history.state).toBeNull())

    await userEvent.click(screen.getByRole('button', { name: /Оставшаяся тренировка/ }))
    expect(await screen.findByRole('heading', { name: 'Оставшаяся тренировка' })).toBeVisible()
    await act(async () => { history.back() })
    expect(await screen.findByRole('button', { name: /Оставшаяся тренировка/ })).toBeVisible()
  })

  it('exposes every workout recorded on the same calendar date', async () => {
    await completedWorkout()
    const second = await db.workouts.add({ id: 'same-day', title: 'Вечерняя тяга', startedAt: '2026-09-10T17:00:00.000Z', finishedAt: '2026-09-10T17:30:00.000Z', createdAt: '2026-09-10T17:00:00.000Z', updatedAt: '2026-09-10T17:30:00.000Z' })
    expect(second).toBe('same-day')
    renderHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Календарь' }))
    await userEvent.click(screen.getByRole('button', { name: /10 сентября.*2 тренировки/ }))

    expect(screen.getByRole('button', { name: /Грудь и трицепс/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /Вечерняя тяга/ })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: /Вечерняя тяга/ }))
    expect(await screen.findByRole('heading', { name: 'Вечерняя тяга' })).toBeVisible()
  })

  it('restores the selected calendar date and originating workout focus after detail Back', async () => {
    await completedWorkout()
    await db.workouts.add({ id: 'same-day', title: 'Вечерняя тяга', startedAt: '2026-09-10T17:00:00.000Z', finishedAt: '2026-09-10T17:30:00.000Z', createdAt: '2026-09-10T17:00:00.000Z', updatedAt: '2026-09-10T17:30:00.000Z' })
    renderHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Календарь' }))
    await userEvent.click(screen.getByRole('button', { name: /10 сентября.*2 тренировки/ }))
    await userEvent.click(screen.getByRole('button', { name: /Вечерняя тяга/ }))
    await act(async () => { history.back() })

    const origin = await screen.findByRole('button', { name: /Вечерняя тяга/ })
    expect(screen.getByRole('button', { name: /Грудь и трицепс/ })).toBeVisible()
    await waitFor(() => expect(origin).toHaveFocus())
  })

  it('restores an adjacent calendar month, selected day, and workout focus after detail Back', async () => {
    await completedWorkout()
    await db.workouts.bulkAdd([
      { id: 'august-one', title: 'Утро в августе', startedAt: '2026-08-12T08:00:00.000Z', finishedAt: '2026-08-12T08:30:00.000Z', createdAt: '2026-08-12T08:00:00.000Z', updatedAt: '2026-08-12T08:30:00.000Z' },
      { id: 'august-two', title: 'Вечер в августе', startedAt: '2026-08-12T18:00:00.000Z', finishedAt: '2026-08-12T18:30:00.000Z', createdAt: '2026-08-12T18:00:00.000Z', updatedAt: '2026-08-12T18:30:00.000Z' },
    ])
    renderHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Календарь' }))
    await userEvent.click(screen.getByRole('button', { name: 'Предыдущий месяц' }))
    expect(screen.getByText(/август 2026/)).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: /12 августа.*2 тренировки/ }))
    await userEvent.click(screen.getByRole('button', { name: /Вечер в августе/ }))
    await act(async () => { history.back() })

    expect(await screen.findByText(/август 2026/)).toBeVisible()
    expect(screen.getByRole('button', { name: /Утро в августе/ })).toBeVisible()
    const origin = screen.getByRole('button', { name: /Вечер в августе/ })
    await waitFor(() => expect(origin).toHaveFocus())
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
