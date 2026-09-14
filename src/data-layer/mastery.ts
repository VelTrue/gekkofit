import type { Exercise, ExerciseProgress, Workout, WorkoutSet } from '../db/schema'

export const MASTERY_THRESHOLDS = [1, 15, 50, 120, 250] as const
export const MASTERY_HIGH_LEVEL_STEP = 250
export const SET_POINT = 1
export const WORKOUT_POINT = 2
export const RECORD_POINT = 3

export interface MasteryLevel {
  level: number
  currentThreshold: number
  nextLevelThreshold: number | null
  pointsToNextLevel: number
}

export interface MasteryRecord {
  setId: string
  workoutId: string
  performedAt: string
  weight: number
  reps: number
  estimatedOneRepMax: number
  isWeightRecord: boolean
  isEstimatedOneRepMaxRecord: boolean
}

export interface ExerciseMastery extends MasteryLevel {
  exerciseId: number
  points: number
  bestWeight: number
  estimatedOneRepMax: number
  volume: number
  workoutCount: number
  setCount: number
  repetitionCount: number
  lastPerformedAt: string | null
  records: MasteryRecord[]
}

export interface MasteryItem {
  exercise: Exercise
  mastery: ExerciseMastery
}

export function masteryLevel(points: number): MasteryLevel {
  const normalizedPoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0
  let level = 0
  for (const threshold of MASTERY_THRESHOLDS) {
    if (normalizedPoints < threshold) break
    level += 1
  }
  if (normalizedPoints >= MASTERY_THRESHOLDS[4]) level = 5 + Math.floor((normalizedPoints - MASTERY_THRESHOLDS[4]) / MASTERY_HIGH_LEVEL_STEP)
  const currentThreshold = level === 0 ? 0 : level <= 5 ? MASTERY_THRESHOLDS[level - 1] : MASTERY_THRESHOLDS[4] + (level - 5) * MASTERY_HIGH_LEVEL_STEP
  const nextLevelThreshold = level < 5 ? MASTERY_THRESHOLDS[level] : currentThreshold + MASTERY_HIGH_LEVEL_STEP
  return {
    level,
    currentThreshold,
    nextLevelThreshold,
    pointsToNextLevel: nextLevelThreshold === null ? 0 : nextLevelThreshold - normalizedPoints,
  }
}

export function estimateOneRepMax(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

export function calculateExerciseMastery(
  workouts: Workout[],
  sets: WorkoutSet[],
  exerciseId: number,
): ExerciseMastery {
  const chronologicalWorkouts = [...workouts].sort(compareWorkouts)
  const workoutOrder = new Map(chronologicalWorkouts.map((workout, index) => [workout.id, index]))
  const workoutById = new Map(chronologicalWorkouts.map((workout) => [workout.id, workout]))
  const completedSets = sets
    .filter((set) => set.exerciseId === exerciseId
      && set.completed
      && workoutById.has(set.workoutId)
      && Number.isFinite(set.weight)
      && set.weight >= 0
      && Number.isInteger(set.reps)
      && set.reps > 0)
    .sort((left, right) => (workoutOrder.get(left.workoutId)! - workoutOrder.get(right.workoutId)!)
      || left.createdAt.localeCompare(right.createdAt)
      || left.setOrder - right.setOrder
      || left.id.localeCompare(right.id))

  const workoutIds = new Set<string>()
  const records: MasteryRecord[] = []
  let bestWeight = 0
  let estimatedOneRepMax = 0
  let volume = 0
  let repetitionCount = 0

  for (const set of completedSets) {
    workoutIds.add(set.workoutId)
    volume += set.weight * set.reps
    repetitionCount += set.reps

    const setEstimatedOneRepMax = estimateOneRepMax(set.weight, set.reps)
    const isWeightRecord = set.weight > bestWeight
    const isEstimatedOneRepMaxRecord = setEstimatedOneRepMax > estimatedOneRepMax
    if (isWeightRecord || isEstimatedOneRepMaxRecord) {
      records.push({
        setId: set.id,
        workoutId: set.workoutId,
        performedAt: workoutById.get(set.workoutId)!.startedAt,
        weight: set.weight,
        reps: set.reps,
        estimatedOneRepMax: setEstimatedOneRepMax,
        isWeightRecord,
        isEstimatedOneRepMaxRecord,
      })
    }
    bestWeight = Math.max(bestWeight, set.weight)
    estimatedOneRepMax = Math.max(estimatedOneRepMax, setEstimatedOneRepMax)
  }

  const setCount = completedSets.length
  const workoutCount = workoutIds.size
  const points = setCount * SET_POINT + workoutCount * WORKOUT_POINT + records.length * RECORD_POINT
  const lastSet = completedSets.at(-1)

  return {
    exerciseId,
    points,
    ...masteryLevel(points),
    bestWeight,
    estimatedOneRepMax,
    volume,
    workoutCount,
    setCount,
    repetitionCount,
    lastPerformedAt: lastSet ? workoutById.get(lastSet.workoutId)!.startedAt : null,
    records,
  }
}

function compareWorkouts(left: Workout, right: Workout): number {
  return left.startedAt.localeCompare(right.startedAt)
    || left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id)
}

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
