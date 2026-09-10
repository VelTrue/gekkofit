import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase, type Exercise } from '../db/schema'
import { addSet } from './sets'
import {
  addExerciseToWorkout,
  deleteSet,
  discardWorkout,
  getWorkoutEntries,
  removeExerciseFromWorkout,
  renameWorkout,
  reorderWorkoutExercise,
  updateSet,
} from './workoutEditor'
import { finishWorkout, startWorkout } from './workouts'

const bench: Exercise = {
  id: 1,
  slug: 'bench-1',
  name_ru: 'Жим штанги лежа',
  name_en: 'Barbell Bench Press',
  muscle_group: 'ГРУДЬ',
  sub_group: 'Середина',
  equipment: 'штанга',
  aliases_ru: ['Жим лежа'],
  primary_muscles: ['chest'],
  secondary_muscles: ['front-deltoids', 'triceps'],
  preferred_body_view: 'front',
}

const squat: Exercise = {
  id: 2,
  slug: 'squat-2',
  name_ru: 'Приседания со штангой',
  name_en: 'Barbell Squat',
  muscle_group: 'НОГИ',
  sub_group: 'Квадрицепс',
  equipment: 'штанга',
  aliases_ru: ['Приседания'],
  primary_muscles: ['quadriceps', 'glutes'],
  secondary_muscles: ['abs'],
  preferred_body_view: 'both',
}

describe('workout editor', () => {
  let database: AppDatabase

  beforeEach(async () => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
    await database.exercises.bulkAdd([bench, squat])
  })

  it('renames completed workouts and edits their sets', async () => {
    const workout = await startWorkout(database, 'ru')
    await addExerciseToWorkout(database, workout.id, bench.id)
    const set = await addSet(database, workout.id, bench.id, 50, 8)
    await finishWorkout(database, workout.id)

    await renameWorkout(database, workout.id, 'Грудь и трицепс')
    await updateSet(database, set.id, { weight: 52.5, reps: 7, completed: true })

    expect((await database.workouts.get(workout.id))?.title).toBe('Грудь и трицепс')
    expect(await database.sets.get(set.id)).toMatchObject({ weight: 52.5, reps: 7, completed: true })
    expect((await database.workouts.get(workout.id))?.finishedAt).not.toBeNull()
  })

  it('rejects workout titles outside the 1 through 80 character boundary', async () => {
    const workout = await startWorkout(database, 'en')

    await expect(renameWorkout(database, workout.id, '')).rejects.toThrow('INVALID_WORKOUT_TITLE')
    await expect(renameWorkout(database, workout.id, ' '.repeat(5))).rejects.toThrow('INVALID_WORKOUT_TITLE')
    await expect(renameWorkout(database, workout.id, 'x'.repeat(81))).rejects.toThrow('INVALID_WORKOUT_TITLE')
    await renameWorkout(database, workout.id, 'x'.repeat(80))

    expect((await database.workouts.get(workout.id))?.title).toBe('x'.repeat(80))
  })

  it('rejects invalid set edits without changing persisted values', async () => {
    const workout = await startWorkout(database, 'en')
    await addExerciseToWorkout(database, workout.id, bench.id)
    const set = await addSet(database, workout.id, bench.id, 50, 8)

    await expect(updateSet(database, set.id, { weight: Number.POSITIVE_INFINITY })).rejects.toThrow('INVALID_SET_VALUES')
    await expect(updateSet(database, set.id, { weight: -1 })).rejects.toThrow('INVALID_SET_VALUES')
    await expect(updateSet(database, set.id, { reps: 1.5 })).rejects.toThrow('INVALID_SET_VALUES')
    await expect(updateSet(database, set.id, { reps: 0 })).rejects.toThrow('INVALID_SET_VALUES')

    expect(await database.sets.get(set.id)).toMatchObject({ weight: 50, reps: 8 })
  })

  it('keeps exercises with no sets in workout order', async () => {
    const workout = await startWorkout(database, 'ru')
    await addExerciseToWorkout(database, workout.id, bench.id)
    await addExerciseToWorkout(database, workout.id, squat.id)
    await reorderWorkoutExercise(database, workout.id, squat.id, 0)

    const entries = await getWorkoutEntries(database, workout.id)
    expect(entries.map(({ exercise }) => exercise.id)).toEqual([squat.id, bench.id])
    expect(entries.map(({ sets }) => sets)).toEqual([[], []])
  })

  it('deletes the final set without removing its workout exercise', async () => {
    const workout = await startWorkout(database, 'en')
    await addExerciseToWorkout(database, workout.id, bench.id)
    const set = await addSet(database, workout.id, bench.id, 50, 8)

    await deleteSet(database, set.id)

    expect(await database.sets.get(set.id)).toBeUndefined()
    expect(await getWorkoutEntries(database, workout.id)).toMatchObject([{ exercise: { id: bench.id }, sets: [] }])
  })

  it('compacts set order after deletion and appends the next set deterministically', async () => {
    const workout = await startWorkout(database, 'en')
    await addExerciseToWorkout(database, workout.id, bench.id)
    await addSet(database, workout.id, bench.id, 40, 10)
    const removed = await addSet(database, workout.id, bench.id, 50, 8)
    await addSet(database, workout.id, bench.id, 60, 6)

    await deleteSet(database, removed.id)
    await addSet(database, workout.id, bench.id, 70, 4)

    const [entry] = await getWorkoutEntries(database, workout.id)
    expect(entry.sets.map(({ weight }) => weight)).toEqual([40, 60, 70])
    expect(entry.sets.map(({ setOrder }) => setOrder)).toEqual([0, 1, 2])
  })

  it('removes an exercise and all of its sets while preserving the remaining order', async () => {
    const workout = await startWorkout(database, 'en')
    await addExerciseToWorkout(database, workout.id, bench.id)
    await addExerciseToWorkout(database, workout.id, squat.id)
    await addSet(database, workout.id, bench.id, 50, 8)
    await addSet(database, workout.id, squat.id, 80, 5)

    await removeExerciseFromWorkout(database, workout.id, bench.id)

    expect(await database.sets.where({ workoutId: workout.id, exerciseId: bench.id }).count()).toBe(0)
    expect((await getWorkoutEntries(database, workout.id)).map(({ exercise }) => exercise.id)).toEqual([squat.id])
  })

  it('advances the parent workout timestamp after each non-destructive edit', async () => {
    const workout = await startWorkout(database, 'en')
    let previousTimestamp = workout.updatedAt

    await addExerciseToWorkout(database, workout.id, bench.id)
    previousTimestamp = await expectTimestampAfter(database, workout.id, previousTimestamp)
    const set = await addSet(database, workout.id, bench.id, 50, 8)
    previousTimestamp = await expectTimestampAfter(database, workout.id, previousTimestamp)
    await updateSet(database, set.id, { completed: true })
    previousTimestamp = await expectTimestampAfter(database, workout.id, previousTimestamp)
    await renameWorkout(database, workout.id, 'Push day')
    previousTimestamp = await expectTimestampAfter(database, workout.id, previousTimestamp)
    await reorderWorkoutExercise(database, workout.id, bench.id, 0)
    previousTimestamp = await expectTimestampAfter(database, workout.id, previousTimestamp)
    await deleteSet(database, set.id)
    previousTimestamp = await expectTimestampAfter(database, workout.id, previousTimestamp)
    await removeExerciseFromWorkout(database, workout.id, bench.id)
    await expectTimestampAfter(database, workout.id, previousTimestamp)
  })

  it('discards a workout together with its exercise rows and sets', async () => {
    const workout = await startWorkout(database, 'en')
    await addExerciseToWorkout(database, workout.id, bench.id)
    await addSet(database, workout.id, bench.id, 50, 8)

    await discardWorkout(database, workout.id)

    expect(await database.workouts.get(workout.id)).toBeUndefined()
    expect(await database.workoutExercises.where('workoutId').equals(workout.id).count()).toBe(0)
    expect(await database.sets.where('workoutId').equals(workout.id).count()).toBe(0)
  })
})

async function expectTimestampAfter(database: AppDatabase, workoutId: string, previous: string): Promise<string> {
  const current = (await database.workouts.get(workoutId))?.updatedAt
  expect(current).toBeDefined()
  expect(current! > previous).toBe(true)
  return current!
}
