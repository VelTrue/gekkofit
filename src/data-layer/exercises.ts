import type { AppDatabase, Exercise } from '../db/schema'

export async function getAllExercises(database: AppDatabase): Promise<Exercise[]> {
  return database.exercises.toArray()
}

export async function searchExercises(database: AppDatabase, query: string): Promise<Exercise[]> {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return []
  return (await database.exercises.toArray()).filter((exercise) =>
    exercise.name_ru.toLocaleLowerCase().includes(normalizedQuery)
    || exercise.name_en.toLocaleLowerCase().includes(normalizedQuery),
  )
}

export async function getRecentExercises(database: AppDatabase, limit = 10): Promise<Exercise[]> {
  const sets = await database.sets.orderBy('createdAt').reverse().toArray()
  const seen = new Set<number>()
  const exerciseIds: number[] = []
  for (const workoutSet of sets) {
    if (seen.has(workoutSet.exerciseId)) continue
    seen.add(workoutSet.exerciseId)
    exerciseIds.push(workoutSet.exerciseId)
    if (exerciseIds.length === limit) break
  }
  return (await database.exercises.bulkGet(exerciseIds)).filter((exercise): exercise is Exercise => exercise !== undefined)
}

export type ExerciseTree = Record<string, Record<string, Exercise[]>>

export function groupExercisesByMuscleGroup(exercises: Exercise[]): ExerciseTree {
  const tree: ExerciseTree = {}
  for (const exercise of exercises) {
    const subgroup = exercise.sub_group ?? '_none'
    tree[exercise.muscle_group] ??= {}
    tree[exercise.muscle_group][subgroup] ??= []
    tree[exercise.muscle_group][subgroup].push(exercise)
  }
  return tree
}
