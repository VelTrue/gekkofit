import { describe, expect, it } from 'vitest'
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from '../db/schema'
import type { WorkoutDetail } from './workouts'
import { formatWorkoutAsNote, summarizeWorkout } from './workoutSummary'

const workout: Workout = {
  id: 'workout-1',
  title: 'Chest day',
  startedAt: '2026-09-10T10:00:00.000Z',
  finishedAt: '2026-09-10T10:48:00.000Z',
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T10:48:00.000Z',
}

const inclinePress: Exercise = {
  id: 4,
  slug: 'incline-dumbbell-press-4',
  name_ru: 'Жим гантелей под наклоном',
  name_en: 'Incline Dumbbell Press',
  muscle_group: 'ГРУДЬ',
  sub_group: null,
  equipment: 'гантели',
  aliases_ru: ['Жим гантелей на наклонной скамье'],
  primary_muscles: ['chest'],
  secondary_muscles: ['front-deltoids', 'triceps'],
  preferred_body_view: 'front',
}

const benchPress: Exercise = {
  ...inclinePress,
  id: 1,
  slug: 'bench-press-1',
  name_ru: 'Жим штанги лежа',
  name_en: 'Barbell Bench Press',
  equipment: 'штанга',
}

function entry(exercise: Exercise, order: number, setValues: Array<[string, number, number, boolean]>): WorkoutDetail['entries'][number] {
  const workoutExercise: WorkoutExercise = {
    id: `entry-${exercise.id}`,
    workoutId: workout.id,
    exerciseId: exercise.id,
    order,
    createdAt: workout.startedAt,
    updatedAt: workout.updatedAt,
  }
  const sets: WorkoutSet[] = setValues.map(([id, weight, reps, completed], setOrder) => ({
    id,
    workoutId: workout.id,
    exerciseId: exercise.id,
    weight,
    reps,
    setOrder,
    completed,
    createdAt: `2026-09-10T10:${String(setOrder).padStart(2, '0')}:00.000Z`,
    updatedAt: `2026-09-10T10:${String(setOrder).padStart(2, '0')}:00.000Z`,
  }))
  return { workoutExercise, exercise, sets }
}

const detail: WorkoutDetail = {
  workout,
  entries: [
    entry(inclinePress, 0, [
      ['incline-1', 14, 12, true],
      ['incline-2', 14, 10, true],
      ['incline-3', 16, 7, true],
      ['incline-draft', 100, 100, false],
    ]),
    entry(benchPress, 1, [
      ['bench-1', 70, 10, true],
      ['bench-2', 84.2, 10, true],
    ]),
  ],
}

describe('workout summaries', () => {
  it('summarizes actual exercises, sets, reps, and volume', () => {
    expect(summarizeWorkout(detail)).toMatchObject({
      exerciseCount: 2,
      setCount: 5,
      repetitionCount: 49,
      volume: 1962,
      exercises: [
        { exerciseId: 4, setCount: 3, repetitionCount: 29, volume: 420 },
        { exerciseId: 1, setCount: 2, repetitionCount: 20, volume: 1542 },
      ],
    })
  })

  it('formats only completed sets as a localized note', () => {
    expect(formatWorkoutAsNote(detail, 'ru')[0]).toEqual({
      exerciseId: 4,
      title: 'Жим гантелей под наклоном',
      sets: ['14 кг × 12', '14 кг × 10', '16 кг × 7'],
    })
    expect(formatWorkoutAsNote(detail, 'en')[1]).toEqual({
      exerciseId: 1,
      title: 'Barbell Bench Press',
      sets: ['70 kg × 10', '84.2 kg × 10'],
    })
  })

  it('omits exercises without completed sets', () => {
    const draftOnly = { ...detail, entries: [entry(inclinePress, 0, [['draft', 20, 8, false]])] }
    expect(summarizeWorkout(draftOnly).exercises).toEqual([])
    expect(formatWorkoutAsNote(draftOnly, 'ru')).toEqual([])
  })
})
