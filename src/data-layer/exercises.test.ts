import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../db/schema'
import type { Exercise } from '../db/schema'
import { addSet } from './sets'
import { startWorkout } from './workouts'
import { getAllExercises, getRecentExercises, groupExercisesByMuscleGroup, searchExercises } from './exercises'

const bench: Exercise = { id: 1, slug: 'bench-1', name_ru: 'Жим лежа', name_en: 'Barbell Bench Press', muscle_group: 'ГРУДЬ', sub_group: 'Середина', equipment: 'штанга' }
const squat: Exercise = { id: 2, slug: 'squat-2', name_ru: 'Приседания', name_en: 'Barbell Squat', muscle_group: 'НОГИ', sub_group: 'Квадрицепс', equipment: 'штанга' }
const plank: Exercise = { id: 3, slug: 'plank-3', name_ru: 'Планка', name_en: 'Plank', muscle_group: 'ФУЛБОДИ', sub_group: null, equipment: 'свой вес' }

describe('exercises data layer', () => {
  let database: AppDatabase

  beforeEach(async () => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
    await database.exercises.bulkAdd([bench, squat, plank])
  })

  it('returns all exercises', async () => expect(await getAllExercises(database)).toHaveLength(3))

  it('searches case-insensitively in Russian and English', async () => {
    expect((await searchExercises(database, 'жим')).map(({ id }) => id)).toEqual([1])
    expect((await searchExercises(database, 'SQUAT')).map(({ id }) => id)).toEqual([2])
  })

  it('returns no results when nothing matches', async () => {
    expect(await searchExercises(database, 'zzz')).toEqual([])
  })

  it('returns recently used exercises most recent first without duplicates', async () => {
    const workout = await startWorkout(database)
    await addSet(database, workout.id, bench.id, 60, 8)
    await addSet(database, workout.id, squat.id, 80, 5)
    await addSet(database, workout.id, bench.id, 62.5, 6)
    expect((await getRecentExercises(database)).map(({ id }) => id)).toEqual([1, 2])
  })

  it('groups exercises by muscle group and subgroup', () => {
    const tree = groupExercisesByMuscleGroup([bench, squat, plank])
    expect(tree['ГРУДЬ']['Середина']).toEqual([bench])
    expect(tree['НОГИ']['Квадрицепс']).toEqual([squat])
    expect(tree['ФУЛБОДИ']._none).toEqual([plank])
  })
})
