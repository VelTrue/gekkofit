import { describe, expect, it } from 'vitest'
import { getExerciseAlternatives } from './exerciseAlternatives'
import type { Exercise } from '../db/schema'

const exercise = (id: number, equipment: string, primary = ['chest']): Exercise => ({
  id, slug: `exercise-${id}`, name_ru: `Упражнение ${id}`, name_en: `Exercise ${id}`,
  muscle_group: 'ГРУДЬ', sub_group: null, equipment, aliases_ru: [], primary_muscles: primary,
  secondary_muscles: [], preferred_body_view: 'front',
})

describe('getExerciseAlternatives', () => {
  it('returns up to three same-muscle exercises and prioritizes other equipment', () => {
    const source = exercise(1, 'штанга')
    const result = getExerciseAlternatives(source, [source, exercise(2, 'штанга'), exercise(3, 'гантели'), exercise(4, 'тренажер'), exercise(5, 'блок'), exercise(6, 'гантели', ['lats'])])
    expect(result.map(({ id }) => id)).toEqual([3, 5, 4])
  })

  it('falls back to the same equipment when fewer than two other options exist', () => {
    const source = exercise(1, 'штанга')
    expect(getExerciseAlternatives(source, [source, exercise(2, 'гантели'), exercise(3, 'штанга')]).map(({ id }) => id)).toEqual([2, 3])
  })
})
