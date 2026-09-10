import exercisesJson from '../../data/exercises.json'
import { db } from './schema'
import type { AppDatabase, Exercise } from './schema'
import { syncExerciseCatalog } from './migrateCatalog'

export async function initExerciseCatalog(database: AppDatabase = db): Promise<void> {
  await syncExerciseCatalog(database, exercisesJson as Exercise[])
}
