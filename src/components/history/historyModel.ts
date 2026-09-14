import type { WorkoutDetail } from '../../data-layer/workouts'
import { summarizeWorkout, type WorkoutSummary } from '../../data-layer/workoutSummary'
import { plural, type Lang } from '../../i18n/translations'

export interface HistoryItem { detail: WorkoutDetail; summary: WorkoutSummary; recordCount: number }

export function workoutDurationMinutes(detail: WorkoutDetail): number | null {
  if (!detail.workout.finishedAt) return null
  return Math.max(0, Math.round((Date.parse(detail.workout.finishedAt) - Date.parse(detail.workout.startedAt)) / 60_000))
}

export function exerciseTotals(setCount: number, repetitionCount: number, lang: Lang) {
  return `${setCount} ${plural(lang, setCount, 'setOne', 'setFew', 'setMany')}, ${repetitionCount} ${plural(lang, repetitionCount, 'repOne', 'repFew', 'repMany')}`
}

export function historyItem(detail: WorkoutDetail, recordCount = 0): HistoryItem { return { detail, summary: summarizeWorkout(detail), recordCount } }
