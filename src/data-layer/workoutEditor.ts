import type { AppDatabase, Exercise, WorkoutExercise, WorkoutSet } from '../db/schema'
import { nextTimestamp } from './timestamps'

export interface WorkoutEntry {
  workoutExercise: WorkoutExercise
  exercise: Exercise
  sets: WorkoutSet[]
}

export interface SetChanges {
  weight?: number
  reps?: number
  distance?: number
  incline?: number
  duration?: number
  intensity?: number
  completed?: boolean
}

export async function renameWorkout(database: AppDatabase, workoutId: string, title: string): Promise<void> {
  const normalizedTitle = title.trim()
  const titleLength = [...normalizedTitle].length
  if (titleLength < 1 || titleLength > 80) throw new Error('INVALID_WORKOUT_TITLE')

  await database.transaction('rw', database.workouts, async () => {
    const now = nextTimestamp()
    await database.workouts.update(workoutId, { title: normalizedTitle, updatedAt: now })
  })
}

export async function addExerciseToWorkout(
  database: AppDatabase,
  workoutId: string,
  exerciseId: number,
): Promise<WorkoutExercise> {
  return database.transaction('rw', database.workoutExercises, database.workouts, async () => {
    const existing = await database.workoutExercises.where('[workoutId+exerciseId]').equals([workoutId, exerciseId]).first()
    if (existing) return existing

    const rows = await database.workoutExercises.where('workoutId').equals(workoutId).toArray()
    const now = nextTimestamp()
    const workoutExercise: WorkoutExercise = {
      id: crypto.randomUUID(),
      workoutId,
      exerciseId,
      order: rows.reduce((maximum, row) => Math.max(maximum, row.order), -1) + 1,
      createdAt: now,
      updatedAt: now,
    }
    await database.workoutExercises.add(workoutExercise)
    await database.workouts.update(workoutId, { updatedAt: now })
    return workoutExercise
  })
}

export async function removeExerciseFromWorkout(
  database: AppDatabase,
  workoutId: string,
  exerciseId: number,
): Promise<void> {
  await database.transaction('rw', database.workoutExercises, database.sets, database.workouts, async () => {
    await database.workoutExercises.where('[workoutId+exerciseId]').equals([workoutId, exerciseId]).delete()
    await database.sets.where('workoutId').equals(workoutId).and((set) => set.exerciseId === exerciseId).delete()

    const remaining = await orderedWorkoutExercises(database, workoutId)
    const now = nextTimestamp()
    await Promise.all(remaining.map((row, order) => database.workoutExercises.update(row.id, { order, updatedAt: now })))
    await database.workouts.update(workoutId, { updatedAt: now })
  })
}

export async function replaceWorkoutExercise(database: AppDatabase, workoutId: string, oldExerciseId: number, newExerciseId: number): Promise<void> {
  if (oldExerciseId === newExerciseId) return
  await database.transaction('rw', database.workoutExercises, database.sets, database.workouts, async () => {
    const current = await database.workoutExercises.where('[workoutId+exerciseId]').equals([workoutId, oldExerciseId]).first()
    if (!current) throw new Error('WORKOUT_EXERCISE_NOT_FOUND')
    if (await database.workoutExercises.where('[workoutId+exerciseId]').equals([workoutId, newExerciseId]).first()) {
      throw new Error('WORKOUT_EXERCISE_ALREADY_EXISTS')
    }
    const now = nextTimestamp()
    await database.sets.where('workoutId').equals(workoutId).and((set) => set.exerciseId === oldExerciseId).delete()
    await database.workoutExercises.update(current.id, { exerciseId: newExerciseId, updatedAt: now })
    await database.workouts.update(workoutId, { updatedAt: now })
  })
}

export async function reorderWorkoutExercise(
  database: AppDatabase,
  workoutId: string,
  exerciseId: number,
  newOrder: number,
): Promise<void> {
  await database.transaction('rw', database.workoutExercises, database.workouts, async () => {
    const rows = await orderedWorkoutExercises(database, workoutId)
    const currentOrder = rows.findIndex((row) => row.exerciseId === exerciseId)
    if (currentOrder < 0) throw new Error('WORKOUT_EXERCISE_NOT_FOUND')
    if (!Number.isInteger(newOrder) || newOrder < 0 || newOrder >= rows.length) throw new Error('INVALID_EXERCISE_ORDER')

    const [moved] = rows.splice(currentOrder, 1)
    rows.splice(newOrder, 0, moved)
    const now = nextTimestamp()
    await Promise.all(rows.map((row, order) => database.workoutExercises.update(row.id, { order, updatedAt: now })))
    await database.workouts.update(workoutId, { updatedAt: now })
  })
}

export async function updateSet(database: AppDatabase, setId: string, changes: SetChanges): Promise<void> {
  if ((changes.weight !== undefined && !isValidWeight(changes.weight))
    || (changes.reps !== undefined && !isValidRepetitions(changes.reps))) {
    throw new Error('INVALID_SET_VALUES')
  }
  for (const value of [changes.distance, changes.incline, changes.duration, changes.intensity]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new Error('INVALID_SET_VALUES')
  }
  if (changes.intensity !== undefined && changes.intensity > 10) throw new Error('INVALID_SET_VALUES')

  await database.transaction('rw', database.sets, database.workouts, async () => {
    const set = await database.sets.get(setId)
    if (!set) throw new Error('SET_NOT_FOUND')
    const now = nextTimestamp()
    await database.sets.update(setId, { ...changes, updatedAt: now })
    await database.workouts.update(set.workoutId, { updatedAt: now })
  })
}

export async function deleteSet(database: AppDatabase, setId: string): Promise<void> {
  await database.transaction('rw', database.sets, database.workouts, async () => {
    const set = await database.sets.get(setId)
    if (!set) throw new Error('SET_NOT_FOUND')
    await database.sets.delete(setId)
    const remaining = await database.sets.where('workoutId').equals(set.workoutId)
      .and((candidate) => candidate.exerciseId === set.exerciseId)
      .toArray()
    remaining.sort(compareSets)
    const now = nextTimestamp()
    await Promise.all(remaining.map((candidate, setOrder) => database.sets.update(candidate.id, { setOrder, updatedAt: now })))
    await database.workouts.update(set.workoutId, { updatedAt: now })
  })
}

export async function discardWorkout(database: AppDatabase, workoutId: string): Promise<void> {
  await database.transaction('rw', database.workouts, database.workoutExercises, database.sets, async () => {
    await database.sets.where('workoutId').equals(workoutId).delete()
    await database.workoutExercises.where('workoutId').equals(workoutId).delete()
    await database.workouts.delete(workoutId)
  })
}

export async function getWorkoutEntries(database: AppDatabase, workoutId: string): Promise<WorkoutEntry[]> {
  return (await getEntriesForWorkouts(database, [workoutId])).get(workoutId) ?? []
}

/** Loads entries of many workouts with three bulk queries instead of a query pair per workout. */
export async function getEntriesForWorkouts(
  database: AppDatabase,
  workoutIds: string[],
): Promise<Map<string, WorkoutEntry[]>> {
  const result = new Map<string, WorkoutEntry[]>(workoutIds.map((id) => [id, []]))
  if (workoutIds.length === 0) return result
  const [rows, sets] = await Promise.all([
    database.workoutExercises.where('workoutId').anyOf(workoutIds).toArray(),
    database.sets.where('workoutId').anyOf(workoutIds).toArray(),
  ])
  const exerciseIds = [...new Set(rows.map(({ exerciseId }) => exerciseId))]
  const exercises = new Map((await database.exercises.bulkGet(exerciseIds)).flatMap((exercise) => exercise ? [[exercise.id, exercise] as const] : []))
  const setsByPair = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    const key = `${set.workoutId}\u0000${set.exerciseId}`
    const list = setsByPair.get(key)
    if (list) list.push(set)
    else setsByPair.set(key, [set])
  }

  for (const workoutExercise of rows.sort(compareWorkoutExercises)) {
    const exercise = exercises.get(workoutExercise.exerciseId)
    if (!exercise) continue
    result.get(workoutExercise.workoutId)?.push({
      workoutExercise,
      exercise,
      sets: (setsByPair.get(`${workoutExercise.workoutId}\u0000${workoutExercise.exerciseId}`) ?? []).sort(compareSets),
    })
  }
  return result
}

function isValidWeight(weight: number): boolean {
  return Number.isFinite(weight) && weight >= 0
}

function isValidRepetitions(reps: number): boolean {
  return Number.isInteger(reps) && reps > 0
}

async function orderedWorkoutExercises(database: AppDatabase, workoutId: string): Promise<WorkoutExercise[]> {
  const rows = await database.workoutExercises.where('workoutId').equals(workoutId).toArray()
  return rows.sort(compareWorkoutExercises)
}

function compareWorkoutExercises(left: WorkoutExercise, right: WorkoutExercise): number {
  return left.order - right.order
    || left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id)
}

function compareSets(left: WorkoutSet, right: WorkoutSet): number {
  return left.setOrder - right.setOrder
    || left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id)
}
