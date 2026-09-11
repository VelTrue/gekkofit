import type { AppDatabase, Exercise, ExerciseProgress } from '../db/schema'
import { calculateExerciseMastery, type MasteryItem } from './mastery'

export type { MasteryItem } from './mastery'

export async function getExercisesWithProgress(database: AppDatabase): Promise<Array<{ exercise: Exercise; progress: ExerciseProgress }>> {
  const progress = await database.exerciseProgress.toArray()
  const exercises = await database.exercises.bulkGet(progress.map(({ exerciseId }) => exerciseId))
  return progress.map((item, index) => ({ exercise: exercises[index], progress: item }))
    .filter((item): item is { exercise: Exercise; progress: ExerciseProgress } => item.exercise !== undefined)
}

export interface WeightPoint { date: string; weight: number }

export async function getExerciseWeightHistory(database: AppDatabase, exerciseId: number): Promise<WeightPoint[]> {
  const sets = (await database.sets.where('exerciseId').equals(exerciseId).toArray())
    .filter(({ completed }) => completed)
  const workouts = await database.workouts.bulkGet([...new Set(sets.map(({ workoutId }) => workoutId))])
  const startByWorkout = new Map(workouts.filter((workout) => workout !== undefined).map((workout) => [workout.id, workout.startedAt]))
  return sets.sort((left, right) => (startByWorkout.get(left.workoutId) ?? '').localeCompare(startByWorkout.get(right.workoutId) ?? '')
    || left.createdAt.localeCompare(right.createdAt)
    || left.setOrder - right.setOrder
    || left.id.localeCompare(right.id))
    .map((set) => ({ date: startByWorkout.get(set.workoutId) ?? '', weight: set.weight }))
    .filter(({ date }) => date !== '')
}

export async function getMasteryCollection(database: AppDatabase): Promise<MasteryItem[]> {
  const [exercises, workouts, sets] = await Promise.all([
    database.exercises.toArray(),
    database.workouts.toArray(),
    database.sets.toArray(),
  ])
  return exercises
    .sort((left, right) => left.id - right.id)
    .map((exercise) => ({
      exercise,
      mastery: calculateExerciseMastery(workouts, sets, exercise.id),
    }))
}
