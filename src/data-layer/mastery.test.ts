import { describe, expect, it } from 'vitest'
import type { Workout, WorkoutSet } from '../db/schema'
import { calculateExerciseMastery, estimateOneRepMax, masteryLevel } from './mastery'

const workouts: Workout[] = [
  {
    id: 'workout-1', title: 'First', startedAt: '2026-09-01T10:00:00.000Z', finishedAt: '2026-09-01T11:00:00.000Z',
    createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T11:00:00.000Z',
  },
  {
    id: 'workout-2', title: 'Second', startedAt: '2026-09-03T10:00:00.000Z', finishedAt: null,
    createdAt: '2026-09-03T10:00:00.000Z', updatedAt: '2026-09-03T10:30:00.000Z',
  },
]

function workoutSet(
  id: string,
  workoutId: string,
  weight: number,
  reps: number,
  setOrder: number,
  completed = true,
  exerciseId = 4,
): WorkoutSet {
  const createdAt = `${workoutId === 'workout-1' ? '2026-09-01' : '2026-09-03'}T10:${String(setOrder).padStart(2, '0')}:00.000Z`
  return { id, workoutId, exerciseId, weight, reps, setOrder, completed, createdAt, updatedAt: createdAt }
}

const sets: WorkoutSet[] = [
  workoutSet('first-set', 'workout-1', 10, 10, 0),
  workoutSet('weight-record', 'workout-1', 12, 5, 1),
  workoutSet('draft-set', 'workout-1', 100, 30, 2, false),
  workoutSet('estimated-record', 'workout-2', 11, 20, 0),
  workoutSet('record-set', 'workout-2', 20, 1, 1),
  workoutSet('other-exercise', 'workout-2', 200, 10, 2, true, 9),
]

describe('mastery levels', () => {
  it.each([[1, 1], [25, 2], [75, 3], [150, 4], [250, 5], [500, 6], [750, 7], [1500, 10]])('maps %s points to level %s', (points, level) => {
    expect(masteryLevel(points).level).toBe(level)
  })

  it('returns the exact next threshold and remaining points', () => {
    expect(masteryLevel(0)).toEqual({ level: 0, currentThreshold: 0, nextLevelThreshold: 1, pointsToNextLevel: 1 })
    expect(masteryLevel(24)).toEqual({ level: 1, currentThreshold: 0, nextLevelThreshold: 25, pointsToNextLevel: 1 })
    expect(masteryLevel(250)).toEqual({ level: 5, currentThreshold: 250, nextLevelThreshold: 500, pointsToNextLevel: 250 })
    expect(masteryLevel(749)).toEqual({ level: 6, currentThreshold: 500, nextLevelThreshold: 750, pointsToNextLevel: 1 })
  })
})

describe('deterministic exercise mastery', () => {
  it('uses the Epley formula', () => {
    expect(estimateOneRepMax(60, 10)).toBe(80)
  })

  it('scores completed sets, distinct workouts, and record events', () => {
    expect(calculateExerciseMastery(workouts, sets, 4)).toMatchObject({
      exerciseId: 4,
      points: 20,
      level: 1,
      nextLevelThreshold: 25,
      pointsToNextLevel: 5,
      bestWeight: 20,
      estimatedOneRepMax: 20 * (1 + 1 / 30),
      volume: 400,
      workoutCount: 2,
      setCount: 4,
      repetitionCount: 36,
      lastPerformedAt: '2026-09-03T10:00:00.000Z',
    })
    expect(calculateExerciseMastery(workouts, sets, 4).records).toHaveLength(4)
  })

  it('removes points and records when source sets are deleted', () => {
    const before = calculateExerciseMastery(workouts, sets, 4)
    const after = calculateExerciseMastery(workouts, sets.filter(({ id }) => id !== 'record-set'), 4)
    expect(after.points).toBeLessThan(before.points)
    expect(after.bestWeight).toBeLessThan(before.bestWeight)
    expect(after.records).toHaveLength(before.records.length - 1)
  })

  it('does not depend on input order and grants one bonus when a set breaks both records', () => {
    const chronological = calculateExerciseMastery(workouts, sets, 4)
    const reversed = calculateExerciseMastery([...workouts].reverse(), [...sets].reverse(), 4)
    expect(reversed).toEqual(chronological)
    expect(chronological.points).toBe(4 + 4 + 4 * 3)
  })

  it('ignores incomplete, unrelated, and orphaned sets', () => {
    const orphan = workoutSet('orphan', 'missing-workout', 500, 10, 0)
    expect(calculateExerciseMastery(workouts, [...sets, orphan], 4)).toEqual(calculateExerciseMastery(workouts, sets, 4))
  })
})
