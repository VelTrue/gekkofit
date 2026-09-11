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

export function summarizeWorkout(detail: WorkoutDetail): WorkoutSummary {
  const exercises = detail.entries.flatMap<WorkoutExerciseSummary>(({ exercise, sets }) => {
    const completedSets = sets.filter(({ completed }) => completed)
    if (completedSets.length === 0) return []
    return [{
      exerciseId: exercise.id,
      exercise,
      setCount: completedSets.length,
      repetitionCount: completedSets.reduce((total, set) => total + set.reps, 0),
      volume: completedSets.reduce((total, set) => total + set.weight * set.reps, 0),
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
      sets: completedSets.map(({ weight, reps }) => `${number.format(weight)} ${unit} × ${number.format(reps)}`),
    }]
  })
}
