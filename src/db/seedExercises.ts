import exercisesJson from '../../data/exercises.json'
import { db } from './schema'
import type { AppDatabase, Exercise } from './schema'

export async function seedExercisesIfEmpty(database: AppDatabase, exercises: Exercise[]): Promise<void> {
  if (await database.exercises.count()) return
  await database.exercises.bulkAdd(exercises)
}

export async function initExerciseCatalog(): Promise<void> {
  await seedExercisesIfEmpty(db, exercisesJson as Exercise[])
}
