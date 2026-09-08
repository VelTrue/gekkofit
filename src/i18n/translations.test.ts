import { describe, expect, it } from 'vitest'
import { t } from './translations'

describe('translation lookup', () => {
  it('returns Russian text', () => expect(t('ru', 'startWorkout')).toBe('Начать тренировку'))
  it('returns English text', () => expect(t('en', 'startWorkout')).toBe('Start Workout'))
})
