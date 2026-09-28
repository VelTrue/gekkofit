// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Exercise } from '../../db/schema'
import { LangProvider } from '../../i18n/LangContext'
import { ExerciseVisual } from './ExerciseVisual'
import { ExerciseListItem } from './ExerciseListItem'

const exercise: Exercise = {
  id: 1, slug: 'zhim-lezha-shtanga-1', name_ru: 'Жим штанги лежа', name_en: 'Barbell Bench Press',
  muscle_group: 'ГРУДЬ', sub_group: null, equipment: 'штанга', aliases_ru: [],
  primary_muscles: ['chest'], secondary_muscles: ['triceps'], preferred_body_view: 'front',
}

function pointer(element: Element, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
  Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } })
  fireEvent(element, event)
}

beforeEach(() => localStorage.clear())
afterEach(() => cleanup())

describe('exercise illustrations and muscle maps', () => {
  it('switches to both muscle views and back using an accessible control', async () => {
    render(<LangProvider><ExerciseVisual exercise={exercise} bothViews /></LangProvider>)
    expect(screen.getByRole('img', { name: exercise.name_ru })).toHaveAttribute('src', '/exercises/barbell-bench-press.png')
    expect(screen.queryByText('Спереди')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: `Показать мышцы: ${exercise.name_ru}` }))
    expect(screen.getByRole('img', { name: /Основные мышцы/ }).querySelectorAll('[data-body-view]')).toHaveLength(2)
    expect(screen.getByText('Спереди')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: `Показать упражнение: ${exercise.name_ru}` }))
    expect(screen.getByRole('img', { name: exercise.name_ru })).toBeVisible()
  })

  it('suppresses activation after a swipe but allows the next deliberate tap', () => {
    const onActivate = vi.fn()
    render(<LangProvider><ExerciseVisual exercise={exercise} onActivate={onActivate} activationLabel="Open exercise" /></LangProvider>)
    const media = screen.getByRole('button', { name: 'Open exercise' })
    pointer(media, 'pointerdown', 100, 50); pointer(media, 'pointerup', 20, 52)
    fireEvent.click(media)
    expect(onActivate).not.toHaveBeenCalled()
    expect(screen.getByRole('img', { name: /Основные мышцы/ })).toBeVisible()
    pointer(media, 'pointerdown', 20, 50); pointer(media, 'pointerup', 100, 51)
    fireEvent.click(media)
    expect(onActivate).not.toHaveBeenCalled()
    expect(screen.getByRole('img', { name: exercise.name_ru })).toBeVisible()
    pointer(media, 'pointerdown', 50, 50); pointer(media, 'pointerup', 50, 50)
    fireEvent.click(media)
    expect(onActivate).toHaveBeenCalledOnce()
  })

  it('does not change slides or activate on vertical scrolling or a cancelled gesture', () => {
    const onActivate = vi.fn()
    render(<LangProvider><ExerciseVisual exercise={exercise} onActivate={onActivate} activationLabel="Open exercise" /></LangProvider>)
    const media = screen.getByRole('button', { name: 'Open exercise' })
    pointer(media, 'pointerdown', 50, 100); pointer(media, 'pointerup', 55, 20)
    fireEvent.click(media)
    pointer(media, 'pointerdown', 100, 50); fireEvent.pointerCancel(media); pointer(media, 'pointerup', 20, 50)
    fireEvent.click(media)
    expect(onActivate).not.toHaveBeenCalled()
    expect(screen.getByRole('img', { name: exercise.name_ru })).toBeVisible()
  })

  it('switches by keyboard without activating the card', async () => {
    const onActivate = vi.fn()
    render(<LangProvider><ExerciseVisual exercise={exercise} onActivate={onActivate} activationLabel="Open exercise" /></LangProvider>)
    screen.getByRole('button', { name: 'Open exercise' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('img', { name: /Основные мышцы/ })).toBeVisible()
    expect(onActivate).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(onActivate).toHaveBeenCalledOnce()
  })

  it('falls back when artwork fails and resets when the exercise changes', () => {
    const view = render(<LangProvider><ExerciseVisual exercise={exercise} /></LangProvider>)
    fireEvent.error(screen.getByRole('img', { name: exercise.name_ru }))
    expect(screen.getByRole('img', { name: /Основные мышцы/ })).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    view.rerender(<LangProvider><ExerciseVisual exercise={{ ...exercise, slug: 'begovaya-dorozhka-trenazher-321' }} /></LangProvider>)
    expect(screen.getByRole('img', { name: exercise.name_ru })).toHaveAttribute('src', '/exercises/treadmill.png')
    view.rerender(<LangProvider><ExerciseVisual exercise={{ ...exercise, slug: 'unillustrated-exercise' }} /></LangProvider>)
    expect(screen.getByRole('img', { name: /Основные мышцы/ })).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('never adds an exercise by swiping or toggling in the picker', async () => {
    const onPick = vi.fn(), onInfo = vi.fn()
    const { container } = render(<LangProvider><ul><ExerciseListItem exercise={exercise} onPick={onPick} onInfo={onInfo} /></ul></LangProvider>)
    const media = container.querySelector('.exercise-visual-media')!
    pointer(media, 'pointerdown', 100, 40); pointer(media, 'pointerup', 20, 40)
    fireEvent.click(media)
    await userEvent.click(screen.getByRole('button', { name: `Показать упражнение: ${exercise.name_ru}` }))
    expect(onPick).not.toHaveBeenCalled()
    expect(onInfo).not.toHaveBeenCalled()
    expect(container.querySelector('button button')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: `Добавить ${exercise.name_ru}` }))
    expect(onPick).toHaveBeenCalledExactlyOnceWith(exercise)
  })
})
