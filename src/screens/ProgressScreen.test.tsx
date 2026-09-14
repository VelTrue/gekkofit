// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { addExerciseToWorkout, updateSet } from '../data-layer/workoutEditor'
import { addSet } from '../data-layer/sets'
import { startWorkout } from '../data-layer/workouts'
import { db } from '../db/schema'
import { initExerciseCatalog } from '../db/seedExercises'
import { LangProvider } from '../i18n/LangContext'
import { ProgressScreen } from './ProgressScreen'

describe('mastery screen', () => {
  beforeEach(async () => {
    localStorage.clear()
    history.replaceState(null, '', '/')
    await db.delete(); await db.open(); await initExerciseCatalog(db)
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
    HTMLDialogElement.prototype.close = function () { this.open = false }
  })

  it('shows only the unlocked count without the catalog total', async () => {
    const workout = await startWorkout(db, 'ru')
    await addExerciseToWorkout(db, workout.id, 19)
    const set = await addSet(db, workout.id, 19, 14, 12)
    await updateSet(db, set.id, { completed: true })
    render(<LangProvider><ProgressScreen /></LangProvider>)
    expect(await screen.findByText('1 упражнение открыто')).toBeVisible()
    expect(screen.queryByText(/из 337/)).not.toBeInTheDocument()
  })

  it('defaults to unlocked exercises and searches the full catalog after selecting all', async () => {
    render(<LangProvider><ProgressScreen /></LangProvider>)
    expect(await screen.findByText('Пока нет открытых упражнений')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Все упражнения' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Поиск упражнений' }), 'Жим гантелей под наклоном')
    await waitFor(() => expect(screen.getByRole('button', { name: /Жим гантелей под наклоном, уровень 0/ })).toBeVisible())
  })
})
