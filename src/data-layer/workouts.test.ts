import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../db/schema'
import { finishWorkout, getActiveWorkout, getWorkoutHistory, startWorkout } from './workouts'

describe('workouts data layer', () => {
  let database: AppDatabase

  beforeEach(() => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
  })

  it('starts a timestamped workout with a UUID', async () => {
    const workout = await startWorkout(database)
    expect(workout.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(workout.finishedAt).toBeNull()
    expect(workout.createdAt).toBe(workout.updatedAt)
  })

  it('returns the active workout', async () => {
    const workout = await startWorkout(database)
    expect((await getActiveWorkout(database))?.id).toBe(workout.id)
  })

  it('reuses the active workout instead of creating another', async () => {
    const first = await startWorkout(database)
    const second = await startWorkout(database)
    expect(second.id).toBe(first.id)
    expect(await database.workouts.count()).toBe(1)
  })

  it('returns undefined without an active workout', async () => {
    expect(await getActiveWorkout(database)).toBeUndefined()
  })

  it('finishes a workout and adds it to history', async () => {
    const workout = await startWorkout(database)
    await finishWorkout(database, workout.id)
    expect(await getActiveWorkout(database)).toBeUndefined()
    expect((await getWorkoutHistory(database))[0].finishedAt).not.toBeNull()
  })

  it('sorts history newest first', async () => {
    const first = await startWorkout(database)
    await finishWorkout(database, first.id)
    const second = await startWorkout(database)
    await finishWorkout(database, second.id)
    expect((await getWorkoutHistory(database)).map(({ id }) => id)).toEqual([second.id, first.id])
  })
})
