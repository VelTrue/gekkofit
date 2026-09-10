import type { Exercise } from './schema'

export const muscleIds = [
  'chest', 'front-deltoids', 'side-deltoids', 'rear-deltoids', 'biceps',
  'triceps', 'forearms', 'upper-back', 'lats', 'lower-back', 'abs',
  'obliques', 'glutes', 'quadriceps', 'hamstrings', 'adductors', 'calves',
  'hip-flexors', 'rotator-cuff',
] as const

export type MuscleId = typeof muscleIds[number]

export type CatalogIssueCode =
  | 'MISSING_NAME'
  | 'DUPLICATE_ID'
  | 'DUPLICATE_RUSSIAN_NAME'
  | 'MISSING_PRIMARY_MUSCLES'
  | 'INVALID_SECONDARY_MUSCLES'
  | 'INVALID_MUSCLE_ID'
  | 'INVALID_ALIASES'
  | 'INVALID_BODY_VIEW'
  | 'FORBIDDEN_CHARACTER'

export interface CatalogIssue {
  code: CatalogIssueCode
  exerciseId: number
}

const validMuscles = new Set<string>(muscleIds)

export function validateExerciseCatalog(exercises: Exercise[]): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const ids = new Set<number>()
  const names = new Set<string>()

  for (const exercise of exercises) {
    const issue = (code: CatalogIssueCode) => issues.push({ code, exerciseId: exercise.id })
    if (ids.has(exercise.id)) issue('DUPLICATE_ID')
    ids.add(exercise.id)

    if (typeof exercise.name_ru !== 'string' || !exercise.name_ru.trim()
      || typeof exercise.name_en !== 'string' || !exercise.name_en.trim()) {
      issue('MISSING_NAME')
    }
    if (typeof exercise.name_ru === 'string' && exercise.name_ru.trim()) {
      const name = exercise.name_ru.normalize('NFC').trim().toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ')
      if (names.has(name)) issue('DUPLICATE_RUSSIAN_NAME')
      names.add(name)
    }

    if (!Array.isArray(exercise.aliases_ru)
      || exercise.aliases_ru.some((alias) => typeof alias !== 'string' || !alias.trim())) issue('INVALID_ALIASES')
    if (!Array.isArray(exercise.primary_muscles) || !exercise.primary_muscles.length) issue('MISSING_PRIMARY_MUSCLES')
    if (!Array.isArray(exercise.secondary_muscles)) issue('INVALID_SECONDARY_MUSCLES')
    for (const muscles of [exercise.primary_muscles, exercise.secondary_muscles]) {
      if (Array.isArray(muscles) && muscles.some((muscle) => !validMuscles.has(muscle))) issue('INVALID_MUSCLE_ID')
    }

    if (!['front', 'back', 'both'].includes(exercise.preferred_body_view)) issue('INVALID_BODY_VIEW')
    if (Object.values(exercise).flat().some((value) => typeof value === 'string' && value.includes('\u2014'))) {
      issue('FORBIDDEN_CHARACTER')
    }
  }
  return issues
}
