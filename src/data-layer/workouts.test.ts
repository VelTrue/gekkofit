import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../db/schema'
import { finishWorkout, getActiveWorkout, getWorkoutHistory, startWorkout } from './workouts'

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
})
