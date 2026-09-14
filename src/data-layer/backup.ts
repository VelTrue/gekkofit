import type { AppDatabase, ExerciseProgress, Workout, WorkoutExercise, WorkoutSet } from '../db/schema'
import { defaultWorkoutTitle } from '../db/workoutTitle'

export interface BackupData {
  version: 2
  exportedAt: string
  workouts: Workout[]
  workoutExercises: WorkoutExercise[]
  sets: WorkoutSet[]
  exerciseProgress: ExerciseProgress[]
}

interface LegacyWorkout extends Omit<Workout, 'title'> { title?: string }
interface LegacySet extends Omit<WorkoutSet, 'completed'> { completed?: boolean }
interface LegacyBackupData {
  version: 1
  exportedAt: string
  workouts: LegacyWorkout[]
  sets: LegacySet[]
  exerciseProgress: ExerciseProgress[]
}

export async function exportData(database: AppDatabase): Promise<BackupData> {
  const [workouts, workoutExercises, sets, exerciseProgress] = await Promise.all([
    database.workouts.toArray(), database.workoutExercises.toArray(), database.sets.toArray(), database.exerciseProgress.toArray(),
  ])
  return { version: 2, exportedAt: new Date().toISOString(), workouts, workoutExercises, sets, exerciseProgress }
}

export async function importData(database: AppDatabase, data: BackupData): Promise<void> {
  assertBackupIntegrity(data)
  const knownExerciseIds = new Set((await database.exercises.toCollection().primaryKeys()) as number[])
  const referencedExerciseIds = [
    ...data.workoutExercises.map(({ exerciseId }) => exerciseId),
    ...data.sets.map(({ exerciseId }) => exerciseId),
    ...data.exerciseProgress.map(({ exerciseId }) => exerciseId),
  ]
  if (referencedExerciseIds.some((exerciseId) => !knownExerciseIds.has(exerciseId))) throw new Error('INVALID_BACKUP_FILE')

  await database.transaction('rw', database.workouts, database.workoutExercises, database.sets, database.exerciseProgress, async () => {
    await Promise.all([database.workouts.clear(), database.workoutExercises.clear(), database.sets.clear(), database.exerciseProgress.clear()])
    await database.workouts.bulkAdd(data.workouts)
    await database.workoutExercises.bulkAdd(data.workoutExercises)
    await database.sets.bulkAdd(data.sets)
    await database.exerciseProgress.bulkAdd(data.exerciseProgress)
  })
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string'
}

function hasBaseWorkout(value: unknown): value is LegacyWorkout {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'startedAt')
    && (value.finishedAt === null || typeof value.finishedAt === 'string')
    && hasString(value, 'createdAt') && hasString(value, 'updatedAt')
}

function isWorkout(value: unknown): value is Workout {
  return hasBaseWorkout(value) && typeof value.title === 'string' && [...value.title.trim()].length > 0 && [...value.title].length <= 80
}

function hasBaseSet(value: unknown): value is LegacySet {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'workoutId')
    && typeof value.exerciseId === 'number' && Number.isInteger(value.exerciseId)
    && typeof value.weight === 'number' && Number.isFinite(value.weight) && value.weight >= 0
    && typeof value.reps === 'number' && Number.isInteger(value.reps) && value.reps > 0
    && typeof value.setOrder === 'number' && Number.isInteger(value.setOrder) && value.setOrder >= 0
    && hasString(value, 'createdAt') && hasString(value, 'updatedAt')
}

function isWorkoutSet(value: unknown): value is WorkoutSet {
  return hasBaseSet(value) && typeof value.completed === 'boolean'
}

function isWorkoutExercise(value: unknown): value is WorkoutExercise {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'workoutId')
    && typeof value.exerciseId === 'number' && Number.isInteger(value.exerciseId)
    && typeof value.order === 'number' && Number.isInteger(value.order) && value.order >= 0
    && hasString(value, 'createdAt') && hasString(value, 'updatedAt')
}

function isExerciseProgress(value: unknown): value is ExerciseProgress {
  return isRecord(value) && typeof value.exerciseId === 'number' && Number.isInteger(value.exerciseId)
    && typeof value.totalSets === 'number' && Number.isInteger(value.totalSets) && value.totalSets >= 0
    && typeof value.totalXp === 'number' && Number.isFinite(value.totalXp) && value.totalXp >= 0
    && typeof value.bestWeightEver === 'number' && Number.isFinite(value.bestWeightEver) && value.bestWeightEver >= 0
}

function hasDuplicates<T>(values: T[]): boolean {
  return new Set(values).size !== values.length
}

function assertBackupIntegrity(data: BackupData): void {
  const workoutIds = new Set(data.workouts.map(({ id }) => id))
  const membershipPairs = new Set(data.workoutExercises.map(({ workoutId, exerciseId }) => `${workoutId}\u0000${exerciseId}`))
  if (hasDuplicates(data.workouts.map(({ id }) => id))
    || hasDuplicates(data.workoutExercises.map(({ id }) => id))
    || hasDuplicates(data.workoutExercises.map(({ workoutId, exerciseId }) => `${workoutId}\u0000${exerciseId}`))
    || hasDuplicates(data.workoutExercises.map(({ workoutId, order }) => `${workoutId}\u0000${order}`))
    || hasDuplicates(data.sets.map(({ id }) => id))
    || hasDuplicates(data.exerciseProgress.map(({ exerciseId }) => exerciseId))
    || data.workoutExercises.some(({ workoutId }) => !workoutIds.has(workoutId))
    || data.sets.some(({ workoutId, exerciseId }) => !workoutIds.has(workoutId) || !membershipPairs.has(`${workoutId}\u0000${exerciseId}`))) {
    throw new Error('INVALID_BACKUP_FILE')
  }
}

function upgradeLegacy(data: LegacyBackupData): BackupData {
  const workouts: Workout[] = data.workouts.map((workout) => ({
    ...workout,
    title: typeof workout.title === 'string' && workout.title.trim() ? workout.title : defaultWorkoutTitle(workout.startedAt, 'ru'),
  }))
  const sets: WorkoutSet[] = data.sets.map((set) => ({ ...set, completed: set.completed ?? true }))
  const orderedFirstSets = [...sets].sort((left, right) => left.createdAt.localeCompare(right.createdAt)
    || left.setOrder - right.setOrder || left.id.localeCompare(right.id))
  const nextOrder = new Map<string, number>()
  const seen = new Set<string>()
  const workoutExercises = orderedFirstSets.flatMap<WorkoutExercise>((set) => {
    const pair = `${set.workoutId}\u0000${set.exerciseId}`
    if (seen.has(pair)) return []
    seen.add(pair)
    const order = nextOrder.get(set.workoutId) ?? 0
    nextOrder.set(set.workoutId, order + 1)
    return [{
      id: `legacy-workout-exercise:${set.workoutId}:${set.exerciseId}`,
      workoutId: set.workoutId, exerciseId: set.exerciseId, order,
      createdAt: set.createdAt, updatedAt: set.updatedAt,
    }]
  })
  return { version: 2, exportedAt: data.exportedAt, workouts, workoutExercises, sets, exerciseProgress: data.exerciseProgress }
}

export function parseBackup(json: string): BackupData {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!isRecord(parsed) || typeof parsed.exportedAt !== 'string'
      || !Array.isArray(parsed.workouts) || !Array.isArray(parsed.sets)
      || !Array.isArray(parsed.exerciseProgress) || !parsed.exerciseProgress.every(isExerciseProgress)) throw new Error()

    let backup: BackupData
    if (parsed.version === 1) {
      if (!parsed.workouts.every(hasBaseWorkout) || !parsed.sets.every(hasBaseSet)) throw new Error()
      backup = upgradeLegacy(parsed as unknown as LegacyBackupData)
    } else if (parsed.version === 2) {
      if (!parsed.workouts.every(isWorkout) || !Array.isArray(parsed.workoutExercises)
        || !parsed.workoutExercises.every(isWorkoutExercise) || !parsed.sets.every(isWorkoutSet)) throw new Error()
      backup = parsed as unknown as BackupData
    } else throw new Error()

    if (!backup.workouts.every(isWorkout) || !backup.workoutExercises.every(isWorkoutExercise)
      || !backup.sets.every(isWorkoutSet) || !backup.exerciseProgress.every(isExerciseProgress)) throw new Error()
    assertBackupIntegrity(backup)
    return backup
  } catch {
    throw new Error('INVALID_BACKUP_FILE')
  }
}
