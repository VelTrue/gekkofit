import Dexie, { type EntityTable } from 'dexie'
import { defaultWorkoutTitle } from './workoutTitle'

export type BodyView = 'front' | 'back' | 'both'

export interface Exercise {
  id: number
  slug: string
  name_ru: string
  name_en: string
  muscle_group: string
  sub_group: string | null
  equipment: string
  aliases_ru: string[]
  primary_muscles: string[]
  secondary_muscles: string[]
  preferred_body_view: BodyView
}

export interface Workout {
  id: string
  startedAt: string
  finishedAt: string | null
  createdAt: string
  updatedAt: string
  title: string
}

export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: number
  order: number
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
  completed: boolean
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
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>
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
    this.version(2).stores({
      exercises: 'id, muscle_group, *aliases_ru, *primary_muscles',
      workouts: 'id, startedAt, finishedAt, updatedAt, title',
      workoutExercises: 'id, workoutId, exerciseId, [workoutId+order], &[workoutId+exerciseId]',
      sets: 'id, workoutId, exerciseId, completed, createdAt, updatedAt',
      exerciseProgress: 'exerciseId',
    }).upgrade(async (transaction) => {
      const workouts = transaction.table<Workout>('workouts')
      await workouts.toCollection().modify((workout) => {
        workout.title ??= defaultWorkoutTitle(workout.startedAt, 'ru')
      })
      await transaction.table<WorkoutSet>('sets').toCollection().modify((set) => {
        set.completed ??= true
      })
    })
  }
}

export const db = new AppDatabase()
