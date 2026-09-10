export type WorkoutTitleLocale = 'ru' | 'en'

export function defaultWorkoutTitle(startedAt: string, locale: WorkoutTitleLocale): string {
  const date = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
  }).format(new Date(startedAt))
  return locale === 'ru' ? `Тренировка ${date}` : `Workout ${date}`
}
