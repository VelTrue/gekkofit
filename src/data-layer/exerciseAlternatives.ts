import type { Exercise } from '../db/schema'

const curatedAlternativeIds: Record<string, number[]> = {
  'ГРУДЬ': [1, 2, 3, 5],
  'СПИНА': [33, 34, 35, 38],
  'НОГИ': [70, 71, 72, 74],
  'ПЛЕЧИ': [172, 173, 174, 175],
  'РУКИ': [208, 209, 210, 211],
  'КОРПУС': [261, 262, 263, 264],
  'ФУЛБОДИ': [305, 307, 311, 317],
  'КАРДИО': [321, 322, 323, 327],
}

function overlap(left: string[], right: string[]): number {
  const rightSet = new Set(right)
  return left.reduce((count, muscle) => count + Number(rightSet.has(muscle)), 0)
}

export function getExerciseAlternatives(source: Exercise, catalog: Exercise[], limit = 3): Exercise[] {
  const curated = new Map((curatedAlternativeIds[source.muscle_group] ?? []).map((id, index) => [id, index]))
  return catalog
    .filter((candidate) => candidate.id !== source.id && overlap(source.primary_muscles, candidate.primary_muscles) > 0)
    .sort((left, right) => Number(right.equipment !== source.equipment) - Number(left.equipment !== source.equipment)
      || Number(curated.has(right.id)) - Number(curated.has(left.id))
      || (curated.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (curated.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      || overlap(source.primary_muscles, right.primary_muscles) - overlap(source.primary_muscles, left.primary_muscles)
      || Number(left.muscle_group !== source.muscle_group) - Number(right.muscle_group !== source.muscle_group)
      || left.id - right.id)
    .slice(0, Math.max(0, limit))
}
