import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { exerciseTotals } from '../components/history/historyModel'
import { plural, translations, t, unlockedCount } from './translations'

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
  it('formats localized count grammar from typed catalog keys', () => {
    expect([1, 2, 5, 11, 21].map((count) => unlockedCount('ru', count))).toEqual([
      '1 упражнение открыто',
      '2 упражнения открыто',
      '5 упражнений открыто',
      '11 упражнений открыто',
      '21 упражнение открыто',
    ])
    expect(unlockedCount('en', 1)).toBe('1 exercise unlocked')
    expect(unlockedCount('en', 2)).toBe('2 exercises unlocked')
    expect(plural('ru', 22, 'setOne', 'setFew', 'setMany')).toBe('подхода')
    expect(plural('en', 1, 'repOne', 'repFew', 'repMany')).toBe('rep')
    expect(exerciseTotals(2, 5, 'ru')).toBe('2 подхода, 5 повторений')
    expect(exerciseTotals(1, 2, 'en')).toBe('1 set, 2 reps')
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
  it('does not keep bilingual interface literals in screen or component source', () => {
    const roots = ['../screens', '../components']
    const files = roots.flatMap((root) => {
      const directory = new URL(`${root}/`, import.meta.url)
      const walk = (url: URL): URL[] => readdirSync(url, { withFileTypes: true }).flatMap((entry) => {
        const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, url)
        return entry.isDirectory() ? walk(child) : /\.tsx?$/.test(entry.name) ? [child] : []
      })
      return walk(directory)
    })
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      const withoutLocalizedExerciseNames = source.replace(/lang\s*===\s*'ru'\s*\?\s*exercise\.name_ru\s*:\s*exercise\.name_en/g, '')
      expect(withoutLocalizedExerciseNames, file.pathname).not.toMatch(/lang\s*===\s*['"](?:ru|en)['"][^?\n]*\?\s*[`'"]/)
      expect(withoutLocalizedExerciseNames, file.pathname).not.toMatch(/if\s*\([^)]*lang\s*===\s*['"](?:ru|en)['"][^)]*\)\s*(?:return\s*)?[`'"]/)
      expect(withoutLocalizedExerciseNames, file.pathname).not.toMatch(/switch\s*\(\s*lang\s*\)/)
    }
  })
})
