import type { AppDatabase, Workout } from '../db/schema'
import { defaultWorkoutTitle, type WorkoutTitleLocale } from '../db/workoutTitle'
import { nextTimestamp } from './timestamps'
import { getEntriesForWorkouts, getWorkoutEntries, type WorkoutEntry } from './workoutEditor'
import { formatExerciseHistory, type ExerciseHistorySession, type Locale } from './workoutSummary'

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

/**
 * Completed sessions per exercise across finished workouts, newest first.
 * Entries are read with three bulk queries instead of a query pair per workout.
 */
export async function getExerciseHistoryResults(
  database: AppDatabase,
  locale: Locale,
  history?: Workout[],
): Promise<Record<number, ExerciseHistorySession[]>> {
  const workouts = history ?? await getWorkoutHistory(database)
  const entriesByWorkout = await getEntriesForWorkouts(database, workouts.map(({ id }) => id))
  const results: Record<number, ExerciseHistorySession[]> = {}
  for (const workout of workouts) {
    const detail = { workout, entries: entriesByWorkout.get(workout.id) ?? [] }
    for (const { exercise } of detail.entries) {
      const session = formatExerciseHistory(detail, exercise.id, locale)
      if (session) (results[exercise.id] ??= []).push(session)
    }
  }
  return results
}
