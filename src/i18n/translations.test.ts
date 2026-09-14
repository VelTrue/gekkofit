import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { translations, t } from './translations'

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
  it('keeps both locale catalogs complete and feature UI wired to shared copy', () => {
    expect(Object.keys(translations.en).sort()).toEqual(Object.keys(translations.ru).sort())
    const history = readFileSync(new URL('../screens/HistoryScreen.tsx', import.meta.url), 'utf8')
    const mastery = readFileSync(new URL('../components/mastery/MasteryDetailSheet.tsx', import.meta.url), 'utf8')
    expect(history).not.toMatch(/Training archive|Loading history|Previous month|Back to calendar/)
    expect(mastery).not.toMatch(/Best weight|Maximum level|Personal records|Open exercise/)
  })
  it('keeps screen and shared dialog state copy in the catalog', () => {
    const sources = [
      '../screens/ProgressScreen.tsx',
      '../screens/HistoryScreen.tsx',
      '../components/mastery/MasteryDetailSheet.tsx',
      '../components/workout/ViewModeSwitch.tsx',
      '../components/workout/WorkoutDialog.tsx',
    ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')
    expect(sources).not.toMatch(/Building collection|Could not load mastery|Workout view|Could not save\. Try again\.|Training archive/)
  })
})
