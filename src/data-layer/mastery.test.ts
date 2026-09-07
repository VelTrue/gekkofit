import { describe, expect, it } from 'vitest'
import { applySetToProgress, levelInfo, strengthLevelInfo, volumeLevelInfo, xpForSet } from './mastery'

describe('xpForSet', () => {
  it('gives full XP for the first weighted set', () => expect(xpForSet(50, 5, 0)).toBe(10))
  it('gives full XP when weight and reps qualify', () => {
    expect(xpForSet(100, 5, 100)).toBe(10)
    expect(xpForSet(100, 8, 100)).toBe(10)
  })
  it('reduces XP for low reps', () => expect(xpForSet(100, 1, 100)).toBeCloseTo(2, 5))
  it('reduces XP for light weight', () => expect(xpForSet(20, 5, 100)).toBeCloseTo(2, 5))
  it('caps weight factor for a new record', () => expect(xpForSet(120, 5, 100)).toBe(10))
  it('returns zero for a zero-weight set', () => expect(xpForSet(0, 5, 0)).toBe(0))
})

describe('levelInfo', () => {
  it('starts at level 1', () => {
    expect(levelInfo(0, 100, 1.25)).toEqual({ level: 1, currentInLevel: 0, neededForNextLevel: 100 })
  })
  it('levels up exactly at the threshold', () => {
    expect(levelInfo(100, 100, 1.25)).toEqual({ level: 2, currentInLevel: 0, neededForNextLevel: 125 })
  })
  it('tracks partial progress in the current level', () => {
    expect(levelInfo(150, 100, 1.25)).toEqual({ level: 2, currentInLevel: 50, neededForNextLevel: 125 })
  })
  it('compounds thresholds across levels', () => {
    expect(levelInfo(225, 100, 1.25)).toEqual({ level: 3, currentInLevel: 0, neededForNextLevel: 156 })
  })
})

describe('mastery scales', () => {
  it('uses the volume threshold', () => {
    expect(volumeLevelInfo(10)).toEqual({ level: 2, currentInLevel: 0, neededForNextLevel: 13 })
  })
  it('uses the strength threshold', () => expect(strengthLevelInfo(0).level).toBe(1))
})

describe('applySetToProgress', () => {
  const empty = { exerciseId: 1, totalSets: 0, totalXp: 0, bestWeightEver: 0 }

  it('records the first qualifying set', () => {
    expect(applySetToProgress(empty, 50, 5)).toEqual({ exerciseId: 1, totalSets: 1, totalXp: 10, bestWeightEver: 50 })
  })
  it('uses the prior best when computing XP', () => {
    const afterFirst = applySetToProgress(empty, 50, 5)
    expect(applySetToProgress(afterFirst, 25, 5).totalXp).toBeCloseTo(15, 5)
  })
  it('updates the best weight after a record', () => {
    const result = applySetToProgress(applySetToProgress(empty, 50, 5), 60, 5)
    expect(result.bestWeightEver).toBe(60)
    expect(result.totalXp).toBeCloseTo(20, 5)
  })
})
