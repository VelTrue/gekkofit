import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../db/schema'
import type { Exercise } from '../db/schema'
import { addSet, getLastSetForExercise, getWorkoutExercisesWithSets } from './sets'
import { startWorkout } from './workouts'

const benchPress: Exercise = {
  id: 1,
  slug: 'barbell-bench-press-1',
  name_ru: 'Жим лежа',
  name_en: 'Barbell Bench Press',
  muscle_group: 'ГРУДЬ',
  sub_group: 'Середина',
  equipment: 'штанга',
}

describe('sets data layer', () => {
  let database: AppDatabase

  beforeEach(async () => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
    await database.exercises.add(benchPress)
  })

  it('adds timestamped UUID sets with incrementing order', async () => {
    const workout = await startWorkout(database)
    const first = await addSet(database, workout.id, benchPress.id, 60, 8)
    const second = await addSet(database, workout.id, benchPress.id, 60, 8)
    expect(first.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(first.createdAt).toBe(first.updatedAt)
    expect(first.setOrder).toBe(0)
    expect(second.setOrder).toBe(1)
  })

  it('updates exercise progress when adding a set', async () => {
    const workout = await startWorkout(database)
    await addSet(database, workout.id, benchPress.id, 60, 8)
    expect(await database.exerciseProgress.get(benchPress.id)).toMatchObject({ totalSets: 1, bestWeightEver: 60 })
  })

  it('returns the last logged set across workouts', async () => {
    const first = await startWorkout(database)
    await addSet(database, first.id, benchPress.id, 50, 8)
    const second = await startWorkout(database)
    await addSet(database, second.id, benchPress.id, 55, 8)
    expect((await getLastSetForExercise(database, benchPress.id))?.weight).toBe(55)
  })

  it('returns undefined for an unused exercise', async () => {
    expect(await getLastSetForExercise(database, 999)).toBeUndefined()
  })

  it('rejects invalid numeric values before writing data', async () => {
    const workout = await startWorkout(database)
    await expect(addSet(database, workout.id, benchPress.id, Number.NaN, 8)).rejects.toThrow('INVALID_SET_VALUES')
    await expect(addSet(database, workout.id, benchPress.id, 60, 0)).rejects.toThrow('INVALID_SET_VALUES')
    expect(await database.sets.count()).toBe(0)
  })

  it('groups workout sets by exercise', async () => {
    const workout = await startWorkout(database)
    await addSet(database, workout.id, benchPress.id, 60, 8)
    await addSet(database, workout.id, benchPress.id, 62.5, 6)
    const grouped = await getWorkoutExercisesWithSets(database, workout.id)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].exercise.name_ru).toBe('Жим лежа')
    expect(grouped[0].sets).toHaveLength(2)
  })
})
