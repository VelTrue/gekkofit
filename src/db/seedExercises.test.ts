import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from './schema'
import { seedExercisesIfEmpty } from './seedExercises'
import type { Exercise } from './schema'

const sample: Exercise[] = [
  { id: 1, slug: 'barbell-bench-press-1', name_ru: 'Жим лежа', name_en: 'Barbell Bench Press', muscle_group: 'ГРУДЬ', sub_group: 'Середина', equipment: 'штанга' },
  { id: 2, slug: 'barbell-squat-2', name_ru: 'Приседания', name_en: 'Barbell Squat', muscle_group: 'НОГИ', sub_group: 'Квадрицепс', equipment: 'штанга' },
]

describe('seedExercisesIfEmpty', () => {
  let database: AppDatabase

  beforeEach(() => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
  })

  it('populates the exercises table when empty', async () => {
    await seedExercisesIfEmpty(database, sample)
    expect(await database.exercises.count()).toBe(2)
    expect((await database.exercises.get(1))?.name_en).toBe('Barbell Bench Press')
  })

  it('does not duplicate rows when called twice', async () => {
    await seedExercisesIfEmpty(database, sample)
    await seedExercisesIfEmpty(database, sample)
    expect(await database.exercises.count()).toBe(2)
  })
})
