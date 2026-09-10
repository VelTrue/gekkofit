import type { AppDatabase, Exercise } from './schema'
import { validateExerciseCatalog } from './catalogValidation'

export async function syncExerciseCatalog(database: AppDatabase, catalog: Exercise[]): Promise<void> {
  const issues = validateExerciseCatalog(catalog)
  if (issues.length) throw new Error(`INVALID_EXERCISE_CATALOG:${issues[0].code}`)
  await database.transaction('rw', database.exercises, async () => {
    await database.exercises.bulkPut(catalog)
  })
}
