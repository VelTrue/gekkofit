export type Lang = 'ru' | 'en'

export const translations = {
  ru: {
    startWorkout: 'Начать тренировку', continueWorkout: 'Продолжить тренировку', finishWorkout: 'Завершить тренировку',
    addExercise: '+ Добавить упражнение', recent: 'Недавние', search: 'Поиск', setDone: 'Подход выполнен',
    tabWorkout: 'Тренировка', tabMastery: 'Мастерство', tabHistory: 'История', tabSettings: 'Настройки',
    historyList: 'Список', historyCalendar: 'Календарь', settingsLanguage: 'Язык', settingsExport: 'Экспорт данных',
    settingsImport: 'Импорт данных', importConfirm: 'Это заменит текущие данные. Продолжить?',
    settingsTheme: 'Тема', themeSystem: 'Системная', themeDark: 'Тёмная', themeLight: 'Светлая',
    back: 'Назад', workoutCards: 'Карточки', workoutList: 'Список', edit: 'Редактировать', delete: 'Удалить', cancel: 'Отмена', retry: 'Повторить', loading: 'Загрузка…',
    primaryMuscles: 'Основные мышцы', secondaryMuscles: 'Вспомогательные мышцы',
    masteryUnlocked: 'Открытые', masteryAll: 'Все упражнения', masteryLevel: 'Уровень', masteryStats: 'Статистика мастерства',
    confirmDiscardWorkout: 'Удалить тренировку?', emptyState: 'Пока здесь пусто',
    settingsKicker: 'Система', installApp: 'Установить приложение', backupInvalid: 'Файл резервной копии повреждён или несовместим.',
    backupReminderTitle: 'Не потеряйте прогресс', backupReminderText: 'Сохраните свежую резервную копию.', localDataNotice: 'Все данные хранятся только на этом устройстве. Аккаунт и облако не используются.', updateAvailable: 'Доступно обновление - применить',
    emptyHomeHint: 'Первый подход займёт 10 секунд', volumeLevel: 'Объём', strengthLevel: 'Сила',
  },
  en: {
    startWorkout: 'Start Workout', continueWorkout: 'Continue Workout', finishWorkout: 'Finish Workout',
    addExercise: '+ Add Exercise', recent: 'Recent', search: 'Search', setDone: 'Set done',
    tabWorkout: 'Workout', tabMastery: 'Mastery', tabHistory: 'History', tabSettings: 'Settings',
    historyList: 'List', historyCalendar: 'Calendar', settingsLanguage: 'Language', settingsExport: 'Export data',
    settingsImport: 'Import data', importConfirm: 'This will replace your current data. Continue?',
    settingsTheme: 'Theme', themeSystem: 'System', themeDark: 'Dark', themeLight: 'Light',
    back: 'Back', workoutCards: 'Cards', workoutList: 'List', edit: 'Edit', delete: 'Delete', cancel: 'Cancel', retry: 'Retry', loading: 'Loading…',
    primaryMuscles: 'Primary muscles', secondaryMuscles: 'Secondary muscles',
    masteryUnlocked: 'Unlocked', masteryAll: 'All exercises', masteryLevel: 'Level', masteryStats: 'Mastery statistics',
    confirmDiscardWorkout: 'Delete workout?', emptyState: 'Nothing here yet',
    settingsKicker: 'System', installApp: 'Install app', backupInvalid: 'The backup file is corrupt or incompatible.',
    backupReminderTitle: 'Keep your progress safe', backupReminderText: 'Save a fresh backup copy.', localDataNotice: 'All data stays on this device. No account or cloud is used.', updateAvailable: 'Update available - apply',
    emptyHomeHint: 'Your first set takes 10 seconds', volumeLevel: 'Volume', strengthLevel: 'Strength',
  },
} as const

export type TranslationKey = keyof typeof translations.ru

export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key]
}
