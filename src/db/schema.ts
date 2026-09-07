import Dexie, { type EntityTable } from 'dexie'

export interface Exercise {
  id: number
  slug: string
  name_ru: string
  name_en: string
  muscle_group: string
  sub_group: string | null
  equipment: string
}

export interface Workout {
  id: string
  startedAt: string
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkoutSet {
  id: string
  workoutId: string
  exerciseId: number
  weight: number
  reps: number
  setOrder: number
  createdAt: string
  updatedAt: string
}

export interface ExerciseProgress {
  exerciseId: number
  totalSets: number
  totalXp: number
  bestWeightEver: number
}

export class AppDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  exerciseProgress!: EntityTable<ExerciseProgress, 'exerciseId'>

  constructor(name = 'WorkoutTrackerDB') {
    super(name)
    this.version(1).stores({
      exercises: 'id, muscle_group',
      workouts: 'id, startedAt, finishedAt, updatedAt',
      sets: 'id, workoutId, exerciseId, createdAt, updatedAt',
      exerciseProgress: 'exerciseId',
    })
  }
}

export const db = new AppDatabase()
