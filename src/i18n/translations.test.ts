import { describe, expect, it } from 'vitest'
import { t } from './translations'

describe('translation lookup', () => {
  it('returns Russian text', () => expect(t('ru', 'startWorkout')).toBe('Начать тренировку'))
  it('returns English text', () => expect(t('en', 'startWorkout')).toBe('Start Workout'))
  it('translates theme settings in both languages', () => {
    expect([
      t('ru', 'settingsTheme'),
      t('ru', 'themeSystem'),
      t('ru', 'themeDark'),
      t('ru', 'themeLight'),
    ]).toEqual(['Тема', 'Системная', 'Тёмная', 'Светлая'])
    expect([
      t('en', 'settingsTheme'),
      t('en', 'themeSystem'),
      t('en', 'themeDark'),
      t('en', 'themeLight'),
    ]).toEqual(['Theme', 'System', 'Dark', 'Light'])
  })
})
