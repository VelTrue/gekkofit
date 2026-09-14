import type { WorkoutDetail } from '../../data-layer/workouts'
import { summarizeWorkout, type WorkoutSummary } from '../../data-layer/workoutSummary'
import type { Lang } from '../../i18n/translations'

export interface HistoryItem { detail: WorkoutDetail; summary: WorkoutSummary; recordCount: number }

export function workoutDurationMinutes(detail: WorkoutDetail): number | null {
  if (!detail.workout.finishedAt) return null
  return Math.max(0, Math.round((Date.parse(detail.workout.finishedAt) - Date.parse(detail.workout.startedAt)) / 60_000))
}

export function pluralRu(value: number, one: string, few: string, many: string) {
  const mod100 = value % 100, mod10 = value % 10
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export function exerciseTotals(setCount: number, repetitionCount: number, lang: Lang) {
  if (lang === 'en') return `${setCount} ${setCount === 1 ? 'set' : 'sets'}, ${repetitionCount} ${repetitionCount === 1 ? 'rep' : 'reps'}`
  return `${setCount} ${pluralRu(setCount, 'подход', 'подхода', 'подходов')}, ${repetitionCount} ${pluralRu(repetitionCount, 'повторение', 'повторения', 'повторений')}`
}

export function historyItem(detail: WorkoutDetail, recordCount = 0): HistoryItem { return { detail, summary: summarizeWorkout(detail), recordCount } }
