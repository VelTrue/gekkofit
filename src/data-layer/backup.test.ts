import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase, type Exercise } from '../db/schema'
import { exportData, importData, parseBackup, serializeBackup } from './backup'
import { addSet } from './sets'
import { addExerciseToWorkout } from './workoutEditor'
import { finishWorkout, startWorkout } from './workouts'

const exercise: Exercise = {
  id: 1, slug: 'bench-1', name_ru: 'Жим лежа', name_en: 'Bench Press', muscle_group: 'ГРУДЬ', sub_group: null,
  equipment: 'штанга', aliases_ru: [], primary_muscles: ['chest'], secondary_muscles: ['triceps'], preferred_body_view: 'front',
}

describe('backup module', () => {
  let database: AppDatabase
  beforeEach(async () => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
    await database.exercises.add(exercise)
  })

  it('exports all version 2 user-data tables', async () => {
    const workout = await startWorkout(database, 'ru')
    await addExerciseToWorkout(database, workout.id, 1)
    await addSet(database, workout.id, 1, 60, 8)
    await finishWorkout(database, workout.id)
    const backup = await exportData(database)
    expect(backup.version).toBe(2)
    expect(backup.workouts).toHaveLength(1)
    expect(backup.workoutExercises).toHaveLength(1)
    expect(backup.sets).toHaveLength(1)
    expect(backup.exerciseProgress).toHaveLength(1)
  })

  it('round-trips titles, completion state, and workout exercise order', async () => {
    const workout = await startWorkout(database, 'ru')
    await database.workouts.update(workout.id, { title: 'Грудь и трицепс' })
    const membership = await addExerciseToWorkout(database, workout.id, 1)
    const set = await addSet(database, workout.id, 1, 60, 8)
    await database.sets.update(set.id, { completed: false })
    const target = new AppDatabase(`test-db-${crypto.randomUUID()}`)
    await target.exercises.add(exercise)
    await importData(target, parseBackup(serializeBackup(await exportData(database))))
    expect(await target.workoutExercises.toArray()).toEqual([membership])
    expect((await target.workouts.get(workout.id))?.title).toBe('Грудь и трицепс')
    expect((await target.sets.get(set.id))?.completed).toBe(false)
  })

  it('fully replaces existing user data', async () => {
    const kept = await startWorkout(database, 'ru')
    await addExerciseToWorkout(database, kept.id, 1)
    await addSet(database, kept.id, 1, 60, 8)
    const backup = await exportData(database)
    await finishWorkout(database, kept.id)
    const removed = await startWorkout(database, 'ru')
    await addExerciseToWorkout(database, removed.id, 1)
    await addSet(database, removed.id, 1, 999, 1)
    await importData(database, backup)
    expect((await exportData(database)).workouts.map(({ id }) => id)).toEqual([kept.id])
  })

  it('upgrades version 1 with titles, completed sets, and derived order', () => {
    const timestamp = '2026-09-14T10:00:00.000Z'
    const legacy = parseBackup(JSON.stringify({
      version: 1, exportedAt: timestamp,
      workouts: [{ id: 'workout-1', startedAt: timestamp, finishedAt: null, createdAt: timestamp, updatedAt: timestamp }],
      sets: [{ id: 'set-1', workoutId: 'workout-1', exerciseId: 1, weight: 60, reps: 8, setOrder: 0, createdAt: timestamp, updatedAt: timestamp }],
      exerciseProgress: [{ exerciseId: 1, totalSets: 1, totalXp: 1, bestWeightEver: 60 }],
    }))
    expect(legacy.version).toBe(2)
    expect(legacy.workouts[0].title).toMatch(/^\u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430 /)
    expect(legacy.sets[0].completed).toBe(true)
    expect(legacy.workoutExercises).toEqual([expect.objectContaining({ workoutId: 'workout-1', exerciseId: 1, order: 0 })])
  })

  it('rejects malformed, duplicate, orphaned, and non-finite content', () => {
    const timestamp = '2026-09-14T10:00:00.000Z'
    const valid = {
      version: 2, exportedAt: timestamp,
      workouts: [{ id: 'workout-1', title: 'Workout', startedAt: timestamp, finishedAt: null, createdAt: timestamp, updatedAt: timestamp }],
      workoutExercises: [{ id: 'entry-1', workoutId: 'workout-1', exerciseId: 1, order: 0, createdAt: timestamp, updatedAt: timestamp }],
      sets: [{ id: 'set-1', workoutId: 'workout-1', exerciseId: 1, weight: 60, reps: 8, setOrder: 0, completed: true, createdAt: timestamp, updatedAt: timestamp }],
      exerciseProgress: [],
    }
    expect(() => parseBackup('not json')).toThrow('INVALID_BACKUP_FILE')
    expect(() => parseBackup(JSON.stringify({ ...valid, workoutExercises: [...valid.workoutExercises, { ...valid.workoutExercises[0], id: 'entry-2' }] }))).toThrow('INVALID_BACKUP_FILE')
    expect(() => parseBackup(JSON.stringify({ ...valid, sets: [{ ...valid.sets[0], workoutId: 'missing' }] }))).toThrow('INVALID_BACKUP_FILE')
    expect(() => parseBackup(JSON.stringify({ ...valid, sets: [{ ...valid.sets[0], weight: null }] }))).toThrow('INVALID_BACKUP_FILE')
  })

  it('rejects unknown exercise references before replacing data', async () => {
    const workout = await startWorkout(database, 'ru')
    const backup = await exportData(database)
    backup.workoutExercises.push({ id: crypto.randomUUID(), workoutId: workout.id, exerciseId: 999, order: 0, createdAt: workout.createdAt, updatedAt: workout.updatedAt })
    await expect(importData(database, backup)).rejects.toThrow('INVALID_BACKUP_FILE')
    expect(await database.workouts.get(workout.id)).toBeDefined()
  })
})
