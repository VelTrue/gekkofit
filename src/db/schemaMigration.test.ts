import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { AppDatabase } from './schema'

describe('database schema migration', () => {
  const databaseName = `schema-migration-${crypto.randomUUID()}`
  let upgraded: AppDatabase | undefined

  afterEach(async () => {
    upgraded?.close()
    await Dexie.delete(databaseName)
  })

  it('upgrades version 1 data without changing ids', async () => {
    const legacy = new Dexie(databaseName)
    legacy.version(1).stores({
      exercises: 'id, muscle_group',
      workouts: 'id, startedAt, finishedAt, updatedAt',
      sets: 'id, workoutId, exerciseId, createdAt, updatedAt',
      exerciseProgress: 'exerciseId',
    })
    await legacy.open()
    await legacy.table('exercises').add({
      id: 7,
      slug: 'bench-7',
      name_ru: 'Жим лежа',
      name_en: 'Bench Press',
      muscle_group: 'ГРУДЬ',
      sub_group: null,
      equipment: 'штанга',
    })
    await legacy.table('workouts').add({
      id: 'workout-1',
      startedAt: '2026-09-10T10:00:00.000Z',
      finishedAt: null,
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    })
    await legacy.table('sets').add({
      id: 'set-1',
      workoutId: 'workout-1',
      exerciseId: 7,
      weight: 80,
      reps: 8,
      setOrder: 1,
      createdAt: '2026-09-10T10:05:00.000Z',
      updatedAt: '2026-09-10T10:05:00.000Z',
    })
    legacy.close()

    upgraded = new AppDatabase(databaseName)
    await upgraded.open()

    expect(await upgraded.exercises.get(7)).toMatchObject({
      id: 7,
      slug: 'bench-7',
      name_ru: 'Жим лежа',
    })
    expect(await upgraded.workouts.get('workout-1')).toMatchObject({
      id: 'workout-1',
      title: 'Тренировка 10 сентября',
      startedAt: '2026-09-10T10:00:00.000Z',
    })
    expect(await upgraded.sets.get('set-1')).toMatchObject({
      id: 'set-1',
      workoutId: 'workout-1',
      exerciseId: 7,
      weight: 80,
      reps: 8,
      completed: true,
    })
    expect(upgraded.workoutExercises).toBeDefined()
  })
})
