import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../db/schema'
import { initExerciseCatalog } from '../db/seedExercises'
import { addSet } from './sets'
import { addExerciseToWorkout, getEntriesForWorkouts, getWorkoutEntries, updateSet } from './workoutEditor'
import { finishWorkout, getActiveWorkout, getLatestExerciseResults, getWorkoutHistory, startWorkout } from './workouts'

describe('workouts data layer', () => {
  let database: AppDatabase

  beforeEach(() => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
  })

  it('starts a timestamped workout with a UUID', async () => {
    const workout = await startWorkout(database, 'ru')
    expect(workout.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(workout.finishedAt).toBeNull()
    expect(workout.createdAt).toBe(workout.updatedAt)
    expect(workout.title).toMatch(/^Тренировка /)
  })

  it('creates an English default title for the English locale', async () => {
    const workout = await startWorkout(database, 'en')
    expect(workout.title).toMatch(/^Workout /)
  })

  it('returns the active workout', async () => {
    const workout = await startWorkout(database, 'en')
    expect((await getActiveWorkout(database))?.id).toBe(workout.id)
  })

  it('reuses the active workout instead of creating another', async () => {
    const first = await startWorkout(database, 'ru')
    const second = await startWorkout(database, 'en')
    expect(second.id).toBe(first.id)
    expect(second.title).toBe(first.title)
    expect(await database.workouts.count()).toBe(1)
  })

  it('returns undefined without an active workout', async () => {
    expect(await getActiveWorkout(database)).toBeUndefined()
  })

  it('finishes a workout and adds it to history', async () => {
    const workout = await startWorkout(database, 'en')
    await finishWorkout(database, workout.id)
    expect(await getActiveWorkout(database)).toBeUndefined()
    expect((await getWorkoutHistory(database))[0].finishedAt).not.toBeNull()
  })

  it('sorts history newest first', async () => {
    const first = await startWorkout(database, 'en')
    await finishWorkout(database, first.id)
    const second = await startWorkout(database, 'en')
    await finishWorkout(database, second.id)
    expect((await getWorkoutHistory(database)).map(({ id }) => id)).toEqual([second.id, first.id])
  })

  it('loads entries of many workouts in bulk with the same shape as single loads', async () => {
    await initExerciseCatalog(database)
    const first = await startWorkout(database, 'en')
    await addExerciseToWorkout(database, first.id, 2)
    await addExerciseToWorkout(database, first.id, 1)
    await addSet(database, first.id, 1, 60, 5)
    await addSet(database, first.id, 1, 62.5, 5)
    await finishWorkout(database, first.id)
    const second = await startWorkout(database, 'en')
    await addExerciseToWorkout(database, second.id, 1)

    const bulk = await getEntriesForWorkouts(database, [first.id, second.id, 'missing'])
    expect(bulk.get(first.id)).toEqual(await getWorkoutEntries(database, first.id))
    expect(bulk.get(second.id)).toEqual(await getWorkoutEntries(database, second.id))
    expect(bulk.get('missing')).toEqual([])
    expect(bulk.get(first.id)?.map(({ exercise }) => exercise.id)).toEqual([2, 1])
  })

  it('returns the most recent completed result for each exercise', async () => {
    await initExerciseCatalog(database)
    const older = await startWorkout(database, 'en')
    await addExerciseToWorkout(database, older.id, 1)
    await addExerciseToWorkout(database, older.id, 2)
    await updateSet(database, (await addSet(database, older.id, 1, 50, 8)).id, { completed: true })
    await updateSet(database, (await addSet(database, older.id, 2, 20, 10)).id, { completed: true })
    await finishWorkout(database, older.id)
    const newer = await startWorkout(database, 'en')
    await addExerciseToWorkout(database, newer.id, 1)
    await updateSet(database, (await addSet(database, newer.id, 1, 60, 5)).id, { completed: true })
    await addSet(database, newer.id, 1, 70, 3)
    await finishWorkout(database, newer.id)

    expect(await getLatestExerciseResults(database, 'en')).toEqual({ 1: '60 kg × 5', 2: '20 kg × 10' })
  })
})
