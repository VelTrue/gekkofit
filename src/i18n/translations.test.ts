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
  it('uses mastery navigation and exposes integrated interface copy', () => {
    expect(t('ru', 'tabMastery')).toBe('Мастерство')
    expect(t('en', 'tabMastery')).toBe('Mastery')
    expect(t('ru', 'back')).toBe('Назад')
    expect(t('en', 'masteryAll')).toBe('All exercises')
    expect(t('ru', 'backupInvalid')).toContain('резервной копии')
    expect(t('en', 'retry')).toBe('Retry')
  })
})
