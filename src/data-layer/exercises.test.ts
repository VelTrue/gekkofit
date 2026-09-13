import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../db/schema'
import type { Exercise } from '../db/schema'
import { addSet } from './sets'
import { finishWorkout, startWorkout } from './workouts'
import { getAllExercises, getFrequentExercises, getRecentExercises, groupExercisesByMuscleGroup, searchExercises } from './exercises'
import { initExerciseCatalog } from '../db/seedExercises'

const bench: Exercise = {
  id: 1, slug: 'bench-1', name_ru: 'Жим штанги лежа', name_en: 'Barbell Bench Press', muscle_group: 'ГРУДЬ',
  sub_group: 'Середина', equipment: 'штанга', aliases_ru: ['Жим лежа'], primary_muscles: ['chest'],
  secondary_muscles: ['front-deltoids', 'triceps'], preferred_body_view: 'front',
}
const squat: Exercise = {
  id: 2, slug: 'squat-2', name_ru: 'Приседания со штангой', name_en: 'Barbell Squat', muscle_group: 'НОГИ',
  sub_group: 'Квадрицепс', equipment: 'штанга', aliases_ru: ['Приседания'], primary_muscles: ['quadriceps', 'glutes'],
  secondary_muscles: ['abs'], preferred_body_view: 'both',
}
const plank: Exercise = {
  id: 3, slug: 'plank-3', name_ru: 'Планка', name_en: 'Plank', muscle_group: 'ФУЛБОДИ', sub_group: null,
  equipment: 'свой вес', aliases_ru: ['Планка на предплечьях'], primary_muscles: ['abs'],
  secondary_muscles: ['obliques', 'glutes'], preferred_body_view: 'front',
}

describe('exercises data layer', () => {
  let database: AppDatabase

  beforeEach(async () => {
    database = new AppDatabase(`test-db-${crypto.randomUUID()}`)
    await database.exercises.bulkAdd([bench, squat, plank])
  })

  afterEach(async () => { await database.delete() })

  it('returns all exercises', async () => expect(await getAllExercises(database)).toHaveLength(3))

  it('searches case-insensitively in Russian and English', async () => {
    expect((await searchExercises(database, 'жим')).map(({ id }) => id)).toEqual([1])
    expect((await searchExercises(database, 'SQUAT')).map(({ id }) => id)).toEqual([2])
  })

  it('returns no results when nothing matches', async () => {
    expect(await searchExercises(database, 'zzz')).toEqual([])
  })

  it('returns recently used exercises most recent first without duplicates', async () => {
    const workout = await startWorkout(database, 'ru')
    for (const [exerciseId, weight, reps] of [[bench.id, 60, 8], [squat.id, 80, 5], [bench.id, 62.5, 6]]) {
      const set = await addSet(database, workout.id, exerciseId, weight, reps)
      await database.sets.update(set.id, { completed: true })
    }
    expect((await getRecentExercises(database)).map(({ id }) => id)).toEqual([1, 2])
    expect((await searchExercises(database, '  !!! ')).map(({ id }) => id)).toEqual([1, 2, 3])
    expect(await getRecentExercises(database, 0)).toEqual([])
  })

  it('finds the real legacy incline dumbbell alias after punctuation and yo normalization', async () => {
    await initExerciseCatalog(database)
    const result = await searchExercises(database, '  ЖИМ ЛЁЖА (НАКЛОН) - ГАНТЕЛИ  ')
    expect(result[0]).toMatchObject({ id: 19, name_ru: 'Жим гантелей под наклоном' })
    expect((await searchExercises(database, 'жим лежа наклон гантели'))[0].id).toBe(19)
  })

  it('ranks exact name, prefix, alias, English, muscle, and equipment before a contained name fallback', async () => {
    await database.exercises.clear()
    const fixture = (id: number, values: Partial<Exercise>): Exercise => ({
      ...plank, id, name_ru: `Движение ${id}`, name_en: `Movement ${id}`, aliases_ru: [],
      muscle_group: 'НОГИ', sub_group: null, equipment: 'свой вес', primary_muscles: ['quadriceps'],
      secondary_muscles: [], ...values,
    })
    await database.exercises.bulkAdd([
      fixture(7, { equipment: 'пресс' }), fixture(6, { primary_muscles: ['abs'] }),
      fixture(5, { name_en: 'Пресс' }), fixture(4, { aliases_ru: ['Пресс'] }),
      fixture(3, { name_ru: 'Подъем на пресс' }), fixture(2, { name_ru: 'Пресс на скамье' }),
      fixture(1, { name_ru: 'Пресс' }),
    ])
    expect((await searchExercises(database, 'ПрЕсС')).map(({ id }) => id)).toEqual([1, 2, 4, 5, 6, 7, 3])
  })

  it('keeps a legacy alias ahead of a contained current-name phrase despite a lower competing id', async () => {
    await database.exercises.clear()
    await database.exercises.bulkAdd([
      { ...bench, id: 1, name_ru: 'Французский жим лежа', aliases_ru: [] },
      { ...bench, id: 9, name_ru: 'Жим штанги на горизонтальной скамье', aliases_ru: ['Жим лежа'] },
    ])
    expect((await searchExercises(database, 'жим лежа')).map(({ id }) => id)).toEqual([9, 1])
  })

  it('matches English and Russian equipment, groups, subgroups, and secondary muscle labels', async () => {
    expect((await searchExercises(database, 'штанга')).map(({ id }) => id)).toEqual([1, 2])
    expect((await searchExercises(database, 'barbell')).map(({ id }) => id)).toEqual([1, 2])
    expect((await searchExercises(database, 'грудь')).map(({ id }) => id)).toEqual([1])
    expect((await searchExercises(database, 'СЕРЕДИНА')).map(({ id }) => id)).toEqual([1])
    expect((await searchExercises(database, 'трицепс')).map(({ id }) => id)).toEqual([1])
    expect((await searchExercises(database, 'front deltoids')).map(({ id }) => id)).toEqual([1])
  })

  it('breaks equal ranks by stable exercise id', async () => {
    await database.exercises.put({ ...bench, id: 9, slug: 'alternate-bench', name_ru: 'Жим штанги узким хватом' })
    expect((await searchExercises(database, 'штанга')).map(({ id }) => id)).toEqual([1, 2, 9])
    expect((await searchExercises(database, 'штанга')).map(({ id }) => id)).toEqual([1, 2, 9])
  })

  it('ranks frequency by distinct completed sessions and excludes incomplete work', async () => {
    const first = await startWorkout(database, 'ru')
    await finishWorkout(database, first.id)
    const second = await startWorkout(database, 'ru')
    for (const [workoutId, exerciseId] of [[first.id, squat.id], [second.id, squat.id], [second.id, bench.id], [second.id, bench.id], [second.id, bench.id]] as const) {
      const set = await addSet(database, workoutId, exerciseId, 20, 8)
      await database.sets.update(set.id, { completed: true })
    }
    await addSet(database, second.id, plank.id, 0, 30)
    expect((await getFrequentExercises(database)).map(({ id }) => id)).toEqual([2, 1])
    expect((await getFrequentExercises(database, 1)).map(({ id }) => id)).toEqual([2])
    expect(await getFrequentExercises(database, 0)).toEqual([])
    expect((await getRecentExercises(database)).map(({ id }) => id)).toEqual([1, 2])
  })

  it('groups exercises by muscle group and subgroup', () => {
    const tree = groupExercisesByMuscleGroup([bench, squat, plank])
    expect(tree['ГРУДЬ']['Середина']).toEqual([bench])
    expect(tree['НОГИ']['Квадрицепс']).toEqual([squat])
    expect(tree['ФУЛБОДИ']._none).toEqual([plank])
  })
})
