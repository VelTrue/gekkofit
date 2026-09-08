import type { AppDatabase, Exercise, ExerciseProgress } from '../db/schema'

export async function getExercisesWithProgress(database: AppDatabase): Promise<Array<{ exercise: Exercise; progress: ExerciseProgress }>> {
  const progress = await database.exerciseProgress.toArray()
  const exercises = await database.exercises.bulkGet(progress.map(({ exerciseId }) => exerciseId))
  return progress.map((item, index) => ({ exercise: exercises[index], progress: item }))
    .filter((item): item is { exercise: Exercise; progress: ExerciseProgress } => item.exercise !== undefined)
}

export interface WeightPoint { date: string; weight: number }

export async function getExerciseWeightHistory(database: AppDatabase, exerciseId: number): Promise<WeightPoint[]> {
  const sets = await database.sets.where('exerciseId').equals(exerciseId).toArray()
  const workouts = await database.workouts.bulkGet([...new Set(sets.map(({ workoutId }) => workoutId))])
  const startByWorkout = new Map(workouts.filter((workout) => workout !== undefined).map((workout) => [workout.id, workout.startedAt]))
  return sets.map((set) => ({ date: startByWorkout.get(set.workoutId) ?? '', weight: set.weight }))
    .filter(({ date }) => date !== '')
    .sort((a, b) => a.date.localeCompare(b.date))
}
