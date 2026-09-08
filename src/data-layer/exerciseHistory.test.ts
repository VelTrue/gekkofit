import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase, type Exercise } from '../db/schema'
import { getExercisesWithProgress, getExerciseWeightHistory } from './exerciseHistory'
import { addSet } from './sets'
import { finishWorkout, startWorkout } from './workouts'

const bench: Exercise = { id: 1, slug: 'bench-1', name_ru: 'Жим лежа', name_en: 'Bench Press', muscle_group: 'ГРУДЬ', sub_group: null, equipment: 'штанга' }

describe('exercise history', () => {
  let database: AppDatabase
  beforeEach(async () => { database = new AppDatabase(`test-db-${crypto.randomUUID()}`); await database.exercises.add(bench) })

  it('returns only exercises with progress', async () => {
    expect(await getExercisesWithProgress(database)).toEqual([])
    const workout = await startWorkout(database)
    await addSet(database, workout.id, bench.id, 60, 8)
    const result = await getExercisesWithProgress(database)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ exercise: { id: bench.id }, progress: { totalSets: 1 } })
  })

  it('sorts weight history oldest first', async () => {
    const first = await startWorkout(database); await addSet(database, first.id, bench.id, 50, 8); await finishWorkout(database, first.id)
    const second = await startWorkout(database); await addSet(database, second.id, bench.id, 55, 8); await finishWorkout(database, second.id)
    expect((await getExerciseWeightHistory(database, bench.id)).map(({ weight }) => weight)).toEqual([50, 55])
  })
})
