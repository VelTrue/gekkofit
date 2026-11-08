import type { Exercise } from '../db/schema'
import type { WorkoutDetail } from './workouts'

export type Locale = 'ru' | 'en'

export interface WorkoutExerciseSummary {
  exerciseId: number
  exercise: Exercise
  setCount: number
  repetitionCount: number
  volume: number
}

export interface WorkoutSummary {
  exerciseCount: number
  setCount: number
  repetitionCount: number
  volume: number
  exercises: WorkoutExerciseSummary[]
}

export interface NoteExercise {
  exerciseId: number
  title: string
  sets: string[]
}

export interface ExerciseHistorySession {
  workoutId: string
  title: string
  date: string
  weekday: string
  sets: string[]
}

export function formatExerciseHistory(detail: WorkoutDetail, exerciseId: number, locale: Locale): ExerciseHistorySession | undefined {
  const entry = detail.entries.find(({ exercise }) => exercise.id === exerciseId)
  const completedSets = entry?.sets.filter(({ completed }) => completed) ?? []
  if (completedSets.length === 0) return undefined
  const note = formatWorkoutAsNote(detail, locale).find((item) => item.exerciseId === exerciseId)
  if (!note) return undefined
  const sets = note.sets.map((value, index) => {
    if (entry?.exercise.muscle_group === 'КАРДИО') return value
    const reps = completedSets[index].reps
    const unit = locale === 'en' ? 'reps' : reps % 10 === 1 && reps % 100 !== 11 ? 'раз' : reps % 10 >= 2 && reps % 10 <= 4 && (reps % 100 < 12 || reps % 100 > 14) ? 'раза' : 'раз'
    return `${value} ${unit}`
  })
  return {
    workoutId: detail.workout.id,
    title: detail.workout.title,
    date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date(detail.workout.startedAt)),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(detail.workout.startedAt)).replace(/\.$/, ''),
    sets,
  }
}

export function summarizeWorkout(detail: WorkoutDetail): WorkoutSummary {
  const exercises = detail.entries.flatMap<WorkoutExerciseSummary>(({ exercise, sets }) => {
    const completedSets = sets.filter(({ completed }) => completed)
    if (completedSets.length === 0) return []
    return [{
      exerciseId: exercise.id,
      exercise,
      setCount: completedSets.length,
      repetitionCount: exercise.muscle_group === 'КАРДИО' ? 0 : completedSets.reduce((total, set) => total + set.reps, 0),
      volume: exercise.muscle_group === 'КАРДИО' ? 0 : completedSets.reduce((total, set) => total + set.weight * set.reps, 0),
    }]
  })

  return {
    exerciseCount: exercises.length,
    setCount: exercises.reduce((total, exercise) => total + exercise.setCount, 0),
    repetitionCount: exercises.reduce((total, exercise) => total + exercise.repetitionCount, 0),
    volume: exercises.reduce((total, exercise) => total + exercise.volume, 0),
    exercises,
  }
}

export function formatWorkoutAsNote(detail: WorkoutDetail, locale: Locale): NoteExercise[] {
  const number = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 20 })
  const unit = locale === 'ru' ? 'кг' : 'kg'

  return detail.entries.flatMap<NoteExercise>(({ exercise, sets }) => {
    const completedSets = sets.filter(({ completed }) => completed)
    if (completedSets.length === 0) return []
    return [{
      exerciseId: exercise.id,
      title: locale === 'ru' ? exercise.name_ru : exercise.name_en,
      sets: completedSets.map((set) => exercise.muscle_group === 'КАРДИО'
        ? formatCardioSet(set, locale, number)
        : `${number.format(set.weight)} ${unit} × ${number.format(set.reps)}`),
    }]
  })
}

function formatCardioSet(set: { distance?: number; duration?: number; incline?: number; intensity?: number }, locale: Locale, number: Intl.NumberFormat): string {
  const distance = set.distance ?? 0
  const duration = set.duration ?? 0
  const parts = [`${number.format(distance)} ${locale === 'ru' ? 'км' : 'km'}`, `${number.format(duration)} ${locale === 'ru' ? 'мин' : 'min'}`]
  if (distance > 0 && duration > 0) {
    const seconds = Math.round(duration * 60 / distance)
    const speed = number.format(distance * 60 / duration)
    parts.push(`${speed} ${locale === 'ru' ? 'км/ч' : 'km/h'}`, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} ${locale === 'ru' ? 'мин/км' : 'min/km'}`)
  }
  if (set.incline) parts.push(`${number.format(set.incline)}%`)
  if (set.intensity) parts.push(`${number.format(set.intensity)}/10`)
  return parts.join(' · ')
}
