// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MasteryItem } from '../../data-layer/mastery'
import type { Exercise } from '../../db/schema'
import { LangProvider } from '../../i18n/LangContext'
import { MasteryGrid } from './MasteryGrid'
import { MasteryDetailSheet } from './MasteryDetailSheet'
import { masteryVisualTier } from './masteryTiers'

const exercise: Exercise = {
  id: 19, slug: 'incline-dumbbell-bench-press', name_ru: 'Жим гантелей под наклоном', name_en: 'Incline dumbbell bench press',
  muscle_group: 'chest', sub_group: null, equipment: 'dumbbells', aliases_ru: [], primary_muscles: ['chest'],
  secondary_muscles: ['triceps'], preferred_body_view: 'front',
}

const item: MasteryItem = {
  exercise,
  mastery: { exerciseId: 19, points: 72, level: 3, currentThreshold: 50, nextLevelThreshold: 120, pointsToNextLevel: 48,
    bestWeight: 42.5, estimatedOneRepMax: 53.8, volume: 4320, workoutCount: 9, setCount: 28, repetitionCount: 241,
    lastPerformedAt: '2026-09-10T10:00:00.000Z', records: [{ setId: 's1', workoutId: 'w1', performedAt: '2026-09-10T10:00:00.000Z', weight: 42.5, reps: 8, estimatedOneRepMax: 53.8, isWeightRecord: true, isEstimatedOneRepMaxRecord: true }], },
}

describe('mastery collection components', () => {
  it('renders three-column collection semantics and accessible level labels', () => {
    render(<LangProvider><MasteryGrid items={[item]} onSelect={vi.fn()} /></LangProvider>)
    expect(screen.getByRole('list')).toHaveClass('mastery-grid')
    expect(screen.getByRole('button', { name: 'Жим гантелей под наклоном, уровень 3, Атлет' })).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
  })

  it('keeps higher numeric levels while reusing the tier-five frame', () => {
    expect(masteryVisualTier(10)).toBe(5)
    const advanced = { ...item, mastery: { ...item.mastery, level: 10, currentThreshold: 1500, nextLevelThreshold: 1750, pointsToNextLevel: 250 } }
    render(<LangProvider><MasteryGrid items={[advanced]} onSelect={vi.fn()} /></LangProvider>)
    const badge = screen.getByRole('button', { name: /уровень 10, Мастер/ })
    expect(badge).toHaveAttribute('data-tier', '5')
    expect(screen.getByText('10')).toBeVisible()
  })

  it('opens a detail sheet, closes with Escape, and restores badge focus', async () => {
    const onSelect = vi.fn()
    function Fixture() {
      const [selected, setSelected] = useState<MasteryItem | null>(null)
      return <LangProvider><MasteryGrid items={[item]} onSelect={(next) => { onSelect(next); setSelected(next) }} />{selected && <MasteryDetailSheet item={selected} onClose={() => setSelected(null)} onOpenExercise={vi.fn()} />}</LangProvider>
    }
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
    HTMLDialogElement.prototype.close = function () { this.open = false }
    render(<Fixture />)
    const badge = screen.getByRole('button', { name: /Жим гантелей под наклоном, уровень 3/ })
    await userEvent.click(badge)
    expect(screen.getByRole('dialog', { name: 'Жим гантелей под наклоном' })).toBeVisible()
    expect(screen.getByText('До уровня 4')).toBeVisible()
    expect(screen.getByText('48 очков')).toBeVisible()
    expect(screen.getByText('42,5 кг')).toBeVisible()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(badge).toHaveFocus())
  })
})
