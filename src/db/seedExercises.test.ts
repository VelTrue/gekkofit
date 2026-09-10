import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from './schema'
import { syncExerciseCatalog } from './migrateCatalog'
import { initExerciseCatalog } from './seedExercises'
import type { Exercise } from './schema'

const sample: Exercise[] = [
  {
    id: 1, slug: 'barbell-bench-press-1', name_ru: 'Жим штанги лежа', name_en: 'Barbell Bench Press',
    muscle_group: 'ГРУДЬ', sub_group: 'Середина', equipment: 'штанга', aliases_ru: ['Жим лежа'],
    primary_muscles: ['chest'], secondary_muscles: ['front-deltoids', 'triceps'], preferred_body_view: 'front',
  },
  {
    id: 2, slug: 'barbell-squat-2', name_ru: 'Приседания со штангой', name_en: 'Barbell Squat',
    muscle_group: 'НОГИ', sub_group: 'Квадрицепс', equipment: 'штанга', aliases_ru: ['Приседания'],
    primary_muscles: ['quadriceps', 'glutes'], secondary_muscles: ['abs'], preferred_body_view: 'both',
  },
]

describe('exercise catalog synchronization', () => {
  let database: AppDatabase

  beforeEach(() => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('populates the exercises table when empty', async () => {
    await syncExerciseCatalog(database, sample)
    expect(await database.exercises.toArray()).toEqual(sample)
  })

  it('is idempotent when called twice', async () => {
    await syncExerciseCatalog(database, sample)
    await syncExerciseCatalog(database, sample)
    expect(await database.exercises.toArray()).toEqual(sample)
  })

  it('updates legacy metadata without changing workouts, exercise order, sets, or progress', async () => {
    const timestamp = '2026-09-11T10:00:00.000Z'
    const workout = {
      id: 'workout-1', title: 'Грудь и ноги', startedAt: timestamp, finishedAt: null,
      createdAt: timestamp, updatedAt: timestamp,
    }
    const workoutExercise = {
      id: 'workout-exercise-1', workoutId: 'workout-1', exerciseId: 1, order: 0,
      createdAt: timestamp, updatedAt: timestamp,
    }
    const set = {
      id: 'set-1', workoutId: 'workout-1', exerciseId: 1, weight: 60, reps: 8, setOrder: 0,
      completed: true, createdAt: timestamp, updatedAt: timestamp,
    }
    const progress = { exerciseId: 1, totalSets: 1, totalXp: 10, bestWeightEver: 60 }
    const customExercise = { ...sample[1], id: 900, name_ru: 'Мое упражнение' }
    await database.exercises.bulkPut([{ ...sample[0], name_ru: 'Жим лежа', primary_muscles: [] }, customExercise])
    await database.workouts.put(workout)
    await database.workoutExercises.put(workoutExercise)
    await database.sets.put(set)
    await database.exerciseProgress.put(progress)

    await syncExerciseCatalog(database, sample)

    expect(await database.exercises.get(1)).toEqual(sample[0])
    expect(await database.exercises.get(2)).toEqual(sample[1])
    expect(await database.exercises.get(900)).toEqual(customExercise)
    expect(await database.workouts.toArray()).toEqual([workout])
    expect(await database.workoutExercises.toArray()).toEqual([workoutExercise])
    expect(await database.sets.toArray()).toEqual([set])
    expect(await database.exerciseProgress.toArray()).toEqual([progress])
  })

  it('rejects the entire invalid catalog before changing existing records', async () => {
    await database.exercises.put(sample[0])
    const changed = { ...sample[0], name_ru: 'Обновленный жим' }
    const invalid = { ...sample[1], primary_muscles: ['unknown-muscle'] }

    await expect(syncExerciseCatalog(database, [changed, invalid])).rejects.toThrow('INVALID_EXERCISE_CATALOG:INVALID_MUSCLE_ID')

    expect(await database.exercises.toArray()).toEqual([sample[0]])
  })

  it('refreshes the full catalog on startup even when exercises already exist', async () => {
    await database.exercises.put({ ...sample[0], name_ru: 'Старое название' })

    await initExerciseCatalog(database)

    expect(await database.exercises.count()).toBe(337)
    expect(await database.exercises.get(1)).toMatchObject({ name_ru: 'Жим штанги лежа', aliases_ru: ['Жим лежа'], primary_muscles: ['chest'] })
    expect(await database.exercises.get(19)).toMatchObject({ name_ru: 'Жим гантелей под наклоном' })
  })
})
