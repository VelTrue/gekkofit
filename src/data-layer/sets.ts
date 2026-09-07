import type { AppDatabase, Exercise, WorkoutSet } from '../db/schema'
import { applySetToProgress } from './mastery'
import { nextTimestamp } from './timestamps'

export async function addSet(
  database: AppDatabase,
  workoutId: string,
  exerciseId: number,
  weight: number,
  reps: number,
): Promise<WorkoutSet> {
  return database.transaction('rw', database.sets, database.exerciseProgress, async () => {
    const setOrder = await database.sets.where({ workoutId, exerciseId }).count()
    const now = nextTimestamp()
    const workoutSet: WorkoutSet = {
      id: crypto.randomUUID(),
      workoutId,
      exerciseId,
      weight,
      reps,
      setOrder,
      createdAt: now,
      updatedAt: now,
    }
    await database.sets.add(workoutSet)

    const currentProgress = (await database.exerciseProgress.get(exerciseId)) ?? {
      exerciseId,
      totalSets: 0,
      totalXp: 0,
      bestWeightEver: 0,
    }
    await database.exerciseProgress.put(applySetToProgress(currentProgress, weight, reps))
    return workoutSet
  })
}

export async function getLastSetForExercise(database: AppDatabase, exerciseId: number): Promise<WorkoutSet | undefined> {
  const sets = await database.sets.where('exerciseId').equals(exerciseId).sortBy('createdAt')
  return sets.at(-1)
}

export async function getWorkoutExercisesWithSets(
  database: AppDatabase,
  workoutId: string,
): Promise<Array<{ exercise: Exercise; sets: WorkoutSet[] }>> {
  const sets = await database.sets.where({ workoutId }).toArray()
  const exerciseIds = [...new Set(sets.map(({ exerciseId }) => exerciseId))]
  const exercises = await database.exercises.bulkGet(exerciseIds)
  return exerciseIds.map((exerciseId, index) => ({
    exercise: exercises[index]!,
    sets: sets.filter((set) => set.exerciseId === exerciseId).sort((a, b) => a.setOrder - b.setOrder),
  }))
}
