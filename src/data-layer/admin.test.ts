import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../db/schema'
import { initExerciseCatalog } from '../db/seedExercises'
import { clearAllMastery, clearMasteryForExercises, pointsForMasteryLevel, resetMasteryPoints, setMasteryPoints } from './admin'
import { exportData, importData, parseBackup, serializeBackup } from './backup'
import { getMasteryCollection } from './exerciseHistory'
import { addSet } from './sets'
import { addExerciseToWorkout, updateSet } from './workoutEditor'
import { startWorkout } from './workouts'

describe('local admin mastery', () => {
  let database: AppDatabase
  beforeEach(async () => {
    database = new AppDatabase(`admin-${crypto.randomUUID()}`)
    await initExerciseCatalog(database)
  })
  afterEach(async () => { await database.delete() })

  const mastery = async () => (await getMasteryCollection(database)).find(({ exercise }) => exercise.id === 19)!.mastery

  it('sets mastery, persists across reopening and keeps earning points without changing history', async () => {
    const workout = await startWorkout(database, 'ru')
    await addExerciseToWorkout(database, workout.id, 19)
    const first = await addSet(database, workout.id, 19, 20, 10)
    await updateSet(database, first.id, { completed: true })
    const originalSets = await database.sets.toArray()
    await setMasteryPoints(database, 19, pointsForMasteryLevel(4))
    expect(await database.sets.toArray()).toEqual(originalSets)
    database.close(); await database.open()
    expect(await mastery()).toMatchObject({ level: 4, points: 120, bestWeight: 20, setCount: 1 })
    const second = await addSet(database, workout.id, 19, 20, 10)
    await updateSet(database, second.id, { completed: true })
    expect(await mastery()).toMatchObject({ points: 121, setCount: 2 })
    await resetMasteryPoints(database, 19)
    expect(await mastery()).toMatchObject({ points: 7, level: 1, setCount: 2 })
  })

  it('supports lowering mastery and includes the adjustment in backup round trips', async () => {
    const workout = await startWorkout(database, 'ru')
    await addExerciseToWorkout(database, workout.id, 19)
    const set = await addSet(database, workout.id, 19, 20, 10)
    await updateSet(database, set.id, { completed: true })
    await setMasteryPoints(database, 19, 0)
    const backup = parseBackup(serializeBackup(await exportData(database)))
    expect(backup.exerciseProgress[0].masteryPointAdjustment).toBe(-6)
    await resetMasteryPoints(database, 19)
    await importData(database, backup)
    expect(await mastery()).toMatchObject({ level: 0, points: 0 })
  })

  it('rejects invalid input and corrupt backup adjustments', async () => {
    for (const value of [-1, 0.5, NaN, Infinity, 1_000_001]) {
      await expect(setMasteryPoints(database, 19, value)).rejects.toThrow('INVALID_POINTS')
    }
    await expect(setMasteryPoints(database, -1, 10)).rejects.toThrow('EXERCISE_NOT_FOUND')
    expect(await database.exerciseProgress.count()).toBe(0)
    await setMasteryPoints(database, 19, 50)
    const backup = await exportData(database)
    backup.exerciseProgress[0].masteryPointAdjustment = 1.5
    expect(() => parseBackup(serializeBackup(backup))).toThrow('INVALID_BACKUP_FILE')
    await expect(importData(database, backup)).rejects.toThrow('INVALID_BACKUP_FILE')
    expect(await mastery()).toMatchObject({ points: 50 })
  })

  it('maps levels including high levels to their thresholds', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map(pointsForMasteryLevel)).toEqual([0, 1, 15, 50, 120, 250, 500, 1500])
    for (const value of [-1, 1.5, Infinity, 10000]) expect(() => pointsForMasteryLevel(value)).toThrow('INVALID_LEVEL')
  })

  it('clears selected or all mastery while preserving workout history', async () => {
    const workout = await startWorkout(database, 'ru')
    await addExerciseToWorkout(database, workout.id, 19)
    const set = await addSet(database, workout.id, 19, 20, 10)
    await updateSet(database, set.id, { completed: true })
    await setMasteryPoints(database, 19, 100)
    await setMasteryPoints(database, 20, 80)
    await clearMasteryForExercises(database, [19])
    expect((await mastery()).points).toBe(0)
    expect((await getMasteryCollection(database)).find(({ exercise }) => exercise.id === 20)!.mastery.points).toBe(80)
    await clearAllMastery(database)
    expect((await getMasteryCollection(database)).find(({ exercise }) => exercise.id === 20)!.mastery.points).toBe(0)
    expect(await database.workouts.count()).toBe(1)
    expect(await database.sets.count()).toBe(1)
  })
})
