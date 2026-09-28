import type { AppDatabase } from '../db/schema'
import { calculateExerciseMastery, MASTERY_HIGH_LEVEL_STEP, MASTERY_THRESHOLDS } from './mastery'

export const MAX_ADMIN_POINTS = 1_000_000

export function pointsForMasteryLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level < 0) throw new Error('INVALID_LEVEL')
  const points = level === 0 ? 0 : level <= 5 ? MASTERY_THRESHOLDS[level - 1] : MASTERY_THRESHOLDS[4] + (level - 5) * MASTERY_HIGH_LEVEL_STEP
  if (points > MAX_ADMIN_POINTS) throw new Error('INVALID_LEVEL')
  return points
}

export async function setMasteryPoints(database: AppDatabase, exerciseId: number, points: number): Promise<void> {
  if (!Number.isSafeInteger(points) || points < 0 || points > MAX_ADMIN_POINTS) throw new Error('INVALID_POINTS')
  await database.transaction('rw', [database.exercises, database.workouts, database.sets, database.exerciseProgress], async () => {
    if (!await database.exercises.get(exerciseId)) throw new Error('EXERCISE_NOT_FOUND')
    const base = calculateExerciseMastery(await database.workouts.toArray(), await database.sets.where('exerciseId').equals(exerciseId).toArray(), exerciseId)
    const progress = await database.exerciseProgress.get(exerciseId) ?? { exerciseId, totalSets: 0, totalXp: 0, bestWeightEver: 0 }
    await database.exerciseProgress.put({ ...progress, masteryPointAdjustment: points - base.points })
  })
}

export async function resetMasteryPoints(database: AppDatabase, exerciseId: number): Promise<void> {
  await database.exerciseProgress.update(exerciseId, { masteryPointAdjustment: undefined })
}

export async function clearMasteryForExercises(database: AppDatabase, exerciseIds: number[]): Promise<void> {
  const ids = [...new Set(exerciseIds.filter(Number.isSafeInteger))]
  await database.transaction('rw', [database.exercises, database.workouts, database.sets, database.exerciseProgress], async () => {
    const workouts = await database.workouts.toArray()
    for (const exerciseId of ids) {
      if (!await database.exercises.get(exerciseId)) continue
      const base = calculateExerciseMastery(workouts, await database.sets.where('exerciseId').equals(exerciseId).toArray(), exerciseId)
      const progress = await database.exerciseProgress.get(exerciseId) ?? { exerciseId, totalSets: 0, totalXp: 0, bestWeightEver: 0 }
      await database.exerciseProgress.put({ ...progress, masteryPointAdjustment: -base.points })
    }
  })
}

export async function clearAllMastery(database: AppDatabase): Promise<void> {
  await clearMasteryForExercises(database, (await database.exercises.toCollection().primaryKeys()) as number[])
}
