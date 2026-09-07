import type { AppDatabase, Exercise, Workout, WorkoutSet } from '../db/schema'
import { getWorkoutExercisesWithSets } from './sets'
import { nextTimestamp } from './timestamps'

export async function startWorkout(database: AppDatabase): Promise<Workout> {
  const now = nextTimestamp()
  const workout: Workout = {
    id: crypto.randomUUID(),
    startedAt: now,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await database.workouts.add(workout)
  return workout
}

export async function finishWorkout(database: AppDatabase, workoutId: string): Promise<void> {
  const now = nextTimestamp()
  await database.workouts.update(workoutId, { finishedAt: now, updatedAt: now })
}

export async function getActiveWorkout(database: AppDatabase): Promise<Workout | undefined> {
  return (await database.workouts.toArray()).find(({ finishedAt }) => finishedAt === null)
}

export async function getWorkoutHistory(database: AppDatabase): Promise<Workout[]> {
  const workouts = await database.workouts.toArray()
  return workouts
    .filter(({ finishedAt }) => finishedAt !== null)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function getWorkoutDetail(
  database: AppDatabase,
  workoutId: string,
): Promise<{ workout: Workout; entries: Array<{ exercise: Exercise; sets: WorkoutSet[] }> }> {
  const workout = await database.workouts.get(workoutId)
  if (!workout) throw new Error(`Workout ${workoutId} not found`)
  return { workout, entries: await getWorkoutExercisesWithSets(database, workoutId) }
}
