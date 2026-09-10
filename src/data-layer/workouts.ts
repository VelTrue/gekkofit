import type { AppDatabase, Workout } from '../db/schema'
import { defaultWorkoutTitle, type WorkoutTitleLocale } from '../db/workoutTitle'
import { nextTimestamp } from './timestamps'
import { getWorkoutEntries, type WorkoutEntry } from './workoutEditor'

export interface WorkoutDetail {
  workout: Workout
  entries: WorkoutEntry[]
}

export async function startWorkout(database: AppDatabase, locale: WorkoutTitleLocale): Promise<Workout> {
  return database.transaction('rw', database.workouts, async () => {
    const active = (await database.workouts.toArray()).find(({ finishedAt }) => finishedAt === null)
    if (active) return active
    const now = nextTimestamp()
    const workout: Workout = {
      id: crypto.randomUUID(),
      startedAt: now,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
      title: defaultWorkoutTitle(now, locale),
    }
    await database.workouts.add(workout)
    return workout
  })
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
): Promise<WorkoutDetail> {
  const workout = await database.workouts.get(workoutId)
  if (!workout) throw new Error(`Workout ${workoutId} not found`)
  return { workout, entries: await getWorkoutEntries(database, workoutId) }
}
