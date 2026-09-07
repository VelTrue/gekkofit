import type { AppDatabase, ExerciseProgress, Workout, WorkoutSet } from '../db/schema'

export interface BackupData {
  version: 1
  exportedAt: string
  workouts: Workout[]
  sets: WorkoutSet[]
  exerciseProgress: ExerciseProgress[]
}

export async function exportData(database: AppDatabase): Promise<BackupData> {
  const [workouts, sets, exerciseProgress] = await Promise.all([
    database.workouts.toArray(),
    database.sets.toArray(),
    database.exerciseProgress.toArray(),
  ])
  return { version: 1, exportedAt: new Date().toISOString(), workouts, sets, exerciseProgress }
}

export async function importData(database: AppDatabase, data: BackupData): Promise<void> {
  await database.transaction('rw', database.workouts, database.sets, database.exerciseProgress, async () => {
    await Promise.all([database.workouts.clear(), database.sets.clear(), database.exerciseProgress.clear()])
    await Promise.all([
      database.workouts.bulkAdd(data.workouts),
      database.sets.bulkAdd(data.sets),
      database.exerciseProgress.bulkAdd(data.exerciseProgress),
    ])
  })
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isWorkout(value: unknown): value is Workout {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.startedAt === 'string'
    && (value.finishedAt === null || typeof value.finishedAt === 'string')
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
}

function isWorkoutSet(value: unknown): value is WorkoutSet {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.workoutId === 'string'
    && typeof value.exerciseId === 'number'
    && typeof value.weight === 'number'
    && typeof value.reps === 'number'
    && typeof value.setOrder === 'number'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
}

function isExerciseProgress(value: unknown): value is ExerciseProgress {
  return isRecord(value)
    && typeof value.exerciseId === 'number'
    && typeof value.totalSets === 'number'
    && typeof value.totalXp === 'number'
    && typeof value.bestWeightEver === 'number'
}

export function parseBackup(json: string): BackupData {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!isRecord(parsed)
      || parsed.version !== 1
      || typeof parsed.exportedAt !== 'string'
      || !Array.isArray(parsed.workouts)
      || !parsed.workouts.every(isWorkout)
      || !Array.isArray(parsed.sets)
      || !parsed.sets.every(isWorkoutSet)
      || !Array.isArray(parsed.exerciseProgress)
      || !parsed.exerciseProgress.every(isExerciseProgress)) {
      throw new Error('INVALID_BACKUP_FILE')
    }
    return parsed as unknown as BackupData
  } catch {
    throw new Error('INVALID_BACKUP_FILE')
  }
}
