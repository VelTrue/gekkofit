import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../db/schema'
import { exportData, importData, parseBackup, serializeBackup } from './backup'
import { addSet } from './sets'
import { finishWorkout, startWorkout } from './workouts'

describe('backup module', () => {
  let database: AppDatabase

  beforeEach(async () => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
    await database.exercises.add({ id: 1, slug: 'bench-1', name_ru: 'Жим лежа', name_en: 'Bench Press', muscle_group: 'ГРУДЬ', sub_group: null, equipment: 'штанга' })
  })

  it('exports workouts, sets and progress', async () => {
    const workout = await startWorkout(database)
    await addSet(database, workout.id, 1, 60, 8)
    await finishWorkout(database, workout.id)
    const backup = await exportData(database)
    expect(backup.version).toBe(1)
    expect(backup.workouts).toHaveLength(1)
    expect(backup.sets).toHaveLength(1)
    expect(backup.exerciseProgress).toHaveLength(1)
  })

  it('round-trips through JSON without data loss', async () => {
    const workout = await startWorkout(database)
    await addSet(database, workout.id, 1, 60, 8)
    const original = await exportData(database)
    expect(parseBackup(serializeBackup(original))).toEqual(original)
  })

  it('fully replaces existing user data', async () => {
    const kept = await startWorkout(database)
    await addSet(database, kept.id, 1, 60, 8)
    const backup = await exportData(database)
    const removed = await startWorkout(database)
    await addSet(database, removed.id, 1, 999, 1)
    await importData(database, backup)
    const imported = await exportData(database)
    expect(imported.workouts.map(({ id }) => id)).toEqual([kept.id])
  })

  it('rejects malformed and structurally invalid files', () => {
    expect(() => parseBackup('not json')).toThrow('INVALID_BACKUP_FILE')
    expect(() => parseBackup(JSON.stringify({ foo: 'bar' }))).toThrow('INVALID_BACKUP_FILE')
    expect(() => parseBackup(JSON.stringify({ version: 1, workouts: [{}], sets: [], exerciseProgress: [] }))).toThrow('INVALID_BACKUP_FILE')
  })
})
