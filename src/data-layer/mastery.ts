import type { ExerciseProgress } from '../db/schema'

export const XP_BASE = 10
export const MIN_QUALIFYING_REPS = 5
export const LEVEL_GROWTH = 1.25
export const STRENGTH_LEVEL_1_THRESHOLD = 100
export const VOLUME_LEVEL_1_THRESHOLD = 10

export function xpForSet(weight: number, reps: number, priorBestWeight: number): number {
  const effectiveBest = Math.max(priorBestWeight, weight)
  const weightFactor = effectiveBest > 0 ? weight / effectiveBest : 0
  const repsFactor = Math.min(reps / MIN_QUALIFYING_REPS, 1)
  return XP_BASE * weightFactor * repsFactor
}

export interface LevelInfo {
  level: number
  currentInLevel: number
  neededForNextLevel: number
}

export function levelInfo(totalAmount: number, level1Threshold: number, growth: number): LevelInfo {
  let level = 1
  let thresholdForThisLevel = level1Threshold
  let cumulativeAtLevelStart = 0
  while (totalAmount >= cumulativeAtLevelStart + thresholdForThisLevel) {
    cumulativeAtLevelStart += thresholdForThisLevel
    level += 1
    thresholdForThisLevel = Math.round(thresholdForThisLevel * growth)
  }
  return {
    level,
    currentInLevel: totalAmount - cumulativeAtLevelStart,
    neededForNextLevel: thresholdForThisLevel,
  }
}

export function volumeLevelInfo(totalSets: number): LevelInfo {
  return levelInfo(totalSets, VOLUME_LEVEL_1_THRESHOLD, LEVEL_GROWTH)
}

export function strengthLevelInfo(totalXp: number): LevelInfo {
  return levelInfo(totalXp, STRENGTH_LEVEL_1_THRESHOLD, LEVEL_GROWTH)
}

export function applySetToProgress(progress: ExerciseProgress, weight: number, reps: number): ExerciseProgress {
  return {
    exerciseId: progress.exerciseId,
    totalSets: progress.totalSets + 1,
    totalXp: progress.totalXp + xpForSet(weight, reps, progress.bestWeightEver),
    bestWeightEver: Math.max(progress.bestWeightEver, weight),
  }
}
