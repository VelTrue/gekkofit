export type Lang = 'ru' | 'en'

export const translations = {
  ru: {
    startWorkout: 'Начать тренировку', continueWorkout: 'Продолжить тренировку', finishWorkout: 'Завершить тренировку',
    addExercise: '+ Добавить упражнение', recent: 'Недавние', search: 'Поиск', setDone: 'Подход выполнен',
    tabWorkout: 'Тренировка', tabProgress: 'Прогресс', tabHistory: 'История', tabSettings: 'Настройки',
    historyList: 'Список', historyCalendar: 'Календарь', settingsLanguage: 'Язык', settingsExport: 'Экспорт данных',
    settingsImport: 'Импорт данных', importConfirm: 'Это заменит текущие данные. Продолжить?',
    emptyHomeHint: 'Первый подход займёт 10 секунд', volumeLevel: 'Объём', strengthLevel: 'Сила',
  },
  en: {
    startWorkout: 'Start Workout', continueWorkout: 'Continue Workout', finishWorkout: 'Finish Workout',
    addExercise: '+ Add Exercise', recent: 'Recent', search: 'Search', setDone: 'Set done',
    tabWorkout: 'Workout', tabProgress: 'Progress', tabHistory: 'History', tabSettings: 'Settings',
    historyList: 'List', historyCalendar: 'Calendar', settingsLanguage: 'Language', settingsExport: 'Export data',
    settingsImport: 'Import data', importConfirm: 'This will replace your current data. Continue?',
    emptyHomeHint: 'Your first set takes 10 seconds', volumeLevel: 'Volume', strengthLevel: 'Strength',
  },
} as const

export type TranslationKey = keyof typeof translations.ru

export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key]
}
