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
    expect(await upgraded.workoutExercises.toArray()).toEqual([{
      id: 'legacy-workout-exercise:workout-1:7',
      workoutId: 'workout-1',
      exerciseId: 7,
      order: 0,
      createdAt: '2026-09-10T10:05:00.000Z',
      updatedAt: '2026-09-10T10:05:00.000Z',
    }])
  })

  it('backfills already-opened version 2 data once in first-set occurrence order', async () => {
    const versionTwo = new Dexie(databaseName)
    versionTwo.version(2).stores({
      exercises: 'id, muscle_group, *aliases_ru, *primary_muscles',
      workouts: 'id, startedAt, finishedAt, updatedAt, title',
      workoutExercises: 'id, workoutId, exerciseId, [workoutId+order], &[workoutId+exerciseId]',
      sets: 'id, workoutId, exerciseId, completed, createdAt, updatedAt',
      exerciseProgress: 'exerciseId',
    })
    await versionTwo.open()
    await versionTwo.table('workouts').add({
      id: 'workout-2',
      title: 'Workout 10 September',
      startedAt: '2026-09-10T10:00:00.000Z',
      finishedAt: '2026-09-10T11:00:00.000Z',
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T11:00:00.000Z',
    })
    await versionTwo.table('sets').bulkAdd([
      {
        id: 'set-later', workoutId: 'workout-2', exerciseId: 9, weight: 90, reps: 5, setOrder: 0, completed: true,
        createdAt: '2026-09-10T10:10:00.000Z', updatedAt: '2026-09-10T10:10:00.000Z',
      },
      {
        id: 'set-first', workoutId: 'workout-2', exerciseId: 7, weight: 50, reps: 8, setOrder: 0, completed: true,
        createdAt: '2026-09-10T10:05:00.000Z', updatedAt: '2026-09-10T10:05:00.000Z',
      },
      {
        id: 'set-second-for-first', workoutId: 'workout-2', exerciseId: 7, weight: 55, reps: 6, setOrder: 1, completed: true,
        createdAt: '2026-09-10T10:07:00.000Z', updatedAt: '2026-09-10T10:07:00.000Z',
      },
    ])
    versionTwo.close()

    upgraded = new AppDatabase(databaseName)
    await upgraded.open()
    const firstUpgrade = await upgraded.workoutExercises.where('workoutId').equals('workout-2').sortBy('order')

    expect(firstUpgrade).toEqual([
      {
        id: 'legacy-workout-exercise:workout-2:7', workoutId: 'workout-2', exerciseId: 7, order: 0,
        createdAt: '2026-09-10T10:05:00.000Z', updatedAt: '2026-09-10T10:05:00.000Z',
      },
      {
        id: 'legacy-workout-exercise:workout-2:9', workoutId: 'workout-2', exerciseId: 9, order: 1,
        createdAt: '2026-09-10T10:10:00.000Z', updatedAt: '2026-09-10T10:10:00.000Z',
      },
    ])

    upgraded.close()
    upgraded = new AppDatabase(databaseName)
    await upgraded.open()
    expect(await upgraded.workoutExercises.where('workoutId').equals('workout-2').sortBy('order')).toEqual(firstUpgrade)
  })
})
