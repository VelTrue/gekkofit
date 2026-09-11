import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase, type Exercise, type Workout, type WorkoutSet } from '../db/schema'
import { getExercisesWithProgress, getExerciseWeightHistory, getMasteryCollection } from './exerciseHistory'

const bench: Exercise = {
  id: 1,
  slug: 'bench-1',
  name_ru: 'Жим штанги лежа',
  name_en: 'Bench Press',
  muscle_group: 'ГРУДЬ',
  sub_group: null,
  equipment: 'штанга',
  aliases_ru: ['Жим лежа'],
  primary_muscles: ['chest'],
  secondary_muscles: ['front-deltoids', 'triceps'],
  preferred_body_view: 'front',
}
const squat: Exercise = {
  ...bench,
  id: 2,
  slug: 'squat-2',
  name_ru: 'Приседания со штангой',
  name_en: 'Back Squat',
  primary_muscles: ['quadriceps', 'glutes'],
}

const workouts: Workout[] = [
  {
    id: 'first', title: 'First', startedAt: '2026-09-01T10:00:00.000Z', finishedAt: '2026-09-01T11:00:00.000Z',
    createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T11:00:00.000Z',
  },
  {
    id: 'second', title: 'Second', startedAt: '2026-09-02T10:00:00.000Z', finishedAt: '2026-09-02T11:00:00.000Z',
    createdAt: '2026-09-02T10:00:00.000Z', updatedAt: '2026-09-02T11:00:00.000Z',
  },
]

function set(id: string, workoutId: string, weight: number, completed = true): WorkoutSet {
  const createdAt = workouts.find((workout) => workout.id === workoutId)?.startedAt ?? '2026-09-03T10:00:00.000Z'
  return { id, workoutId, exerciseId: bench.id, weight, reps: 8, setOrder: 0, completed, createdAt, updatedAt: createdAt }
}

describe('exercise history', () => {
  let database: AppDatabase

  beforeEach(async () => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
    await database.exercises.bulkAdd([bench, squat])
    await database.workouts.bulkAdd(workouts)
  })

  it('derives the full mastery collection and ignores stale cached progress', async () => {
    await database.sets.bulkAdd([set('completed', 'first', 60), set('draft', 'second', 100, false)])
    await database.exerciseProgress.put({ exerciseId: bench.id, totalSets: 99, totalXp: 999, bestWeightEver: 999 })

    const result = await getMasteryCollection(database)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      exercise: { id: bench.id },
      mastery: { exerciseId: bench.id, setCount: 1, bestWeight: 60, points: 6 },
    })
    expect(result[1]).toMatchObject({ exercise: { id: squat.id }, mastery: { level: 0, points: 0 } })
  })

  it('keeps the legacy cached-progress selector available', async () => {
    expect(await getExercisesWithProgress(database)).toEqual([])
    await database.exerciseProgress.put({ exerciseId: bench.id, totalSets: 1, totalXp: 10, bestWeightEver: 60 })
    expect(await getExercisesWithProgress(database)).toMatchObject([{ exercise: { id: bench.id }, progress: { totalSets: 1 } }])
  })

  it('sorts completed weight history oldest first and excludes drafts', async () => {
    await database.sets.bulkAdd([
      set('newest', 'second', 55),
      set('oldest', 'first', 50),
      set('draft', 'second', 100, false),
    ])
    expect((await getExerciseWeightHistory(database, bench.id)).map(({ weight }) => weight)).toEqual([50, 55])
  })
})
