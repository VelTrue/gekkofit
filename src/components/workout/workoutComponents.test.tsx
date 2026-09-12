// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LangProvider } from '../../i18n/LangContext'
import type { WorkoutSet } from '../../db/schema'
import { SetRow } from './SetRow'
import { WorkoutTitle } from './WorkoutTitle'
import { ViewModeSwitch } from './ViewModeSwitch'
import { equipmentName } from './exercisePresentation'

const set: WorkoutSet = {
  id: 'set-1', workoutId: 'workout-1', exerciseId: 19, weight: 50, reps: 8,
  setOrder: 0, completed: true, createdAt: '2026-09-12', updatedAt: '2026-09-12',
}

describe('workout editing controls', () => {
  beforeEach(() => localStorage.clear())

  it('edits a completed set inline without changing completion', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<LangProvider><SetRow set={set} onSave={onSave} onDelete={vi.fn()} /></LangProvider>)
    await userEvent.clear(screen.getByLabelText('Вес, подход 1'))
    await userEvent.type(screen.getByLabelText('Вес, подход 1'), '52.5')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить подход 1' }))
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ weight: 52.5, reps: 8 })
    expect(await screen.findByText('Сохранено')).toBeVisible()
  })

  it('rejects empty weight and fractional repetitions inline', async () => {
    const onSave = vi.fn()
    render(<LangProvider><SetRow set={set} onSave={onSave} onDelete={vi.fn()} /></LangProvider>)
    await userEvent.clear(screen.getByLabelText('Вес, подход 1'))
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить подход 1' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Вес должен быть числом от 0')
    await userEvent.type(screen.getByLabelText('Вес, подход 1'), '0')
    await userEvent.clear(screen.getByLabelText('Повторы, подход 1'))
    await userEvent.type(screen.getByLabelText('Повторы, подход 1'), '2.5')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить подход 1' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Повторы должны быть целым числом от 1')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('preserves failed drafts and retries the same values', async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error('disk')).mockResolvedValue(undefined)
    render(<LangProvider><SetRow set={set} onSave={onSave} onDelete={vi.fn()} /></LangProvider>)
    await userEvent.clear(screen.getByLabelText('Вес, подход 1'))
    await userEvent.type(screen.getByLabelText('Вес, подход 1'), '55')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить подход 1' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить')
    expect(screen.getByLabelText('Вес, подход 1')).toHaveValue('55')
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(onSave).toHaveBeenLastCalledWith({ weight: 55, reps: 8 })
  })

  it('completes an unfinished set explicitly with the edited values', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<LangProvider><SetRow set={{ ...set, completed: false }} onSave={onSave} onDelete={vi.fn()} /></LangProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Завершить подход 1' }))
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ weight: 50, reps: 8, completed: true })
  })

  it('validates and saves the workout title', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<LangProvider><WorkoutTitle title="Тренировка груди" onSave={onSave} /></LangProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Изменить название тренировки' }))
    await userEvent.clear(screen.getByLabelText('Название тренировки'))
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить название' }))
    expect(screen.getByRole('alert')).toHaveTextContent('От 1 до 80 символов')
    await userEvent.type(screen.getByLabelText('Название тренировки'), '  Грудь и плечи  ')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить название' }))
    expect(onSave).toHaveBeenCalledWith('Грудь и плечи')
  })

  it('exposes the selected presentation mode', async () => {
    const onChange = vi.fn()
    render(<LangProvider><ViewModeSwitch value="cards" onChange={onChange} /></LangProvider>)
    expect(screen.getByRole('button', { name: 'Карточки' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Список' }))
    expect(onChange).toHaveBeenCalledWith('list')
  })

  it('localizes equipment metadata for English exercise cards', () => {
    expect(equipmentName('гантели', 'en')).toBe('Dumbbells')
    expect(equipmentName('гантели', 'ru')).toBe('гантели')
  })
})
