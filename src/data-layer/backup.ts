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
  assertBackupIntegrity(data)
  const knownExerciseIds = new Set((await database.exercises.toCollection().primaryKeys()) as number[])
  if (data.sets.some(({ exerciseId }) => !knownExerciseIds.has(exerciseId))
    || data.exerciseProgress.some(({ exerciseId }) => !knownExerciseIds.has(exerciseId))) {
    throw new Error('INVALID_BACKUP_FILE')
  }
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
    && typeof value.weight === 'number' && Number.isFinite(value.weight) && value.weight >= 0
    && typeof value.reps === 'number' && Number.isFinite(value.reps) && value.reps > 0
    && typeof value.setOrder === 'number' && Number.isInteger(value.setOrder) && value.setOrder >= 0
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
}

function isExerciseProgress(value: unknown): value is ExerciseProgress {
  return isRecord(value)
    && typeof value.exerciseId === 'number'
    && typeof value.totalSets === 'number' && Number.isInteger(value.totalSets) && value.totalSets >= 0
    && typeof value.totalXp === 'number' && Number.isFinite(value.totalXp) && value.totalXp >= 0
    && typeof value.bestWeightEver === 'number' && Number.isFinite(value.bestWeightEver) && value.bestWeightEver >= 0
}

function hasDuplicates<T>(values: T[]): boolean {
  return new Set(values).size !== values.length
}

function assertBackupIntegrity(data: BackupData): void {
  const workoutIds = data.workouts.map(({ id }) => id)
  const setIds = data.sets.map(({ id }) => id)
  const progressIds = data.exerciseProgress.map(({ exerciseId }) => exerciseId)
  const workoutIdSet = new Set(workoutIds)
  if (hasDuplicates(workoutIds) || hasDuplicates(setIds) || hasDuplicates(progressIds)
    || data.sets.some(({ workoutId }) => !workoutIdSet.has(workoutId))) {
    throw new Error('INVALID_BACKUP_FILE')
  }
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
    const backup = parsed as unknown as BackupData
    assertBackupIntegrity(backup)
    return backup
  } catch {
    throw new Error('INVALID_BACKUP_FILE')
  }
}
