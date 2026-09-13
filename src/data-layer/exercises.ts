import type { AppDatabase, Exercise } from '../db/schema'
import { equipmentName, muscleGroupName, muscleNames } from './exerciseLabels'

export async function getAllExercises(database: AppDatabase): Promise<Exercise[]> {
  return database.exercises.toArray()
}

export function normalizeExerciseQuery(query: string): string {
  return query.normalize('NFC').toLocaleLowerCase('ru').replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

function searchRank(exercise: Exercise, query: string): number {
  const name = normalizeExerciseQuery(exercise.name_ru)
  const matches = (value: string) => normalizeExerciseQuery(value).includes(query)
  if (name === query) return 700
  if (name.startsWith(query)) return 600
  if (name.includes(query)) return 550
  if (exercise.aliases_ru.some((alias) => matches(alias) || matches(`${alias} ${exercise.equipment}`))) return 500
  if (matches(exercise.name_en)) return 400
  const muscles = [...exercise.primary_muscles, ...exercise.secondary_muscles]
  if ([exercise.muscle_group, exercise.sub_group ?? '', muscleGroupName(exercise.muscle_group, 'en'),
    muscleNames(muscles, 'ru'), muscleNames(muscles, 'en'), ...muscles].some(matches)) return 300
  if ([exercise.equipment, equipmentName(exercise.equipment, 'en')].some(matches)) return 200
  return 0
}

/** Empty queries retain the supplied recent order; equal search ranks use stable numeric ids. */
export function rankExercises(exercises: Exercise[], query: string, recent: Exercise[] = []): Exercise[] {
  const normalized = normalizeExerciseQuery(query)
  if (!normalized) {
    const recentIds = new Set(recent.map(({ id }) => id))
    return [...recent, ...exercises.filter(({ id }) => !recentIds.has(id)).sort((left, right) => left.id - right.id)]
  }
  return exercises.map((exercise) => ({ exercise, rank: searchRank(exercise, normalized) }))
    .filter(({ rank }) => rank > 0)
    .sort((left, right) => right.rank - left.rank || left.exercise.id - right.exercise.id)
    .map(({ exercise }) => exercise)
}

export async function searchExercises(database: AppDatabase, query: string): Promise<Exercise[]> {
  const [exercises, recent] = await Promise.all([
    getAllExercises(database), normalizeExerciseQuery(query) ? Promise.resolve([]) : getRecentExercises(database),
  ])
  return rankExercises(exercises, query, recent)
}

export async function getRecentExercises(database: AppDatabase, limit = 10): Promise<Exercise[]> {
  if (limit <= 0) return []
  const sets = (await database.sets.toArray()).filter(({ completed }) => completed)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt)
      || right.setOrder - left.setOrder || left.id.localeCompare(right.id))
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

/** Count distinct sessions so one long workout does not outweigh a regular habit. */
export async function getFrequentExercises(database: AppDatabase, limit = 10): Promise<Exercise[]> {
  if (limit <= 0) return []
  const usage = new Map<number, { sessions: Set<string>; latest: string }>()
  for (const set of await database.sets.toArray()) {
    if (!set.completed) continue
    const item = usage.get(set.exerciseId) ?? { sessions: new Set<string>(), latest: '' }
    item.sessions.add(set.workoutId)
    if (set.createdAt > item.latest) item.latest = set.createdAt
    usage.set(set.exerciseId, item)
  }
  const ids = [...usage].sort(([leftId, left], [rightId, right]) => right.sessions.size - left.sessions.size
    || right.latest.localeCompare(left.latest) || leftId - rightId).map(([id]) => id)
  return (await database.exercises.bulkGet(ids)).filter((exercise): exercise is Exercise => exercise !== undefined).slice(0, limit)
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
