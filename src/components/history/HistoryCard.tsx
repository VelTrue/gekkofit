import type { Lang } from '../../i18n/translations'
import { WorkoutIcon } from '../workout/WorkoutIcon'
import './history.css'
import { exerciseTotals, pluralRu, workoutDurationMinutes, type HistoryItem } from './historyModel'

export function HistoryCard({ item, lang, onOpen }: { item: HistoryItem; lang: Lang; onOpen: (source: HTMLButtonElement) => void }) {
  const { detail, summary, recordCount } = item
  const duration = workoutDurationMinutes(detail)
  const date = new Date(detail.workout.startedAt).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
  const durationLabel = duration === null ? null : lang === 'ru' ? `${duration} ${pluralRu(duration, 'минута', 'минуты', 'минут')}` : `${duration} min`
  const meta = [date, durationLabel].filter(Boolean).join(', ')
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  return <button type="button" className="history-card" data-workout-id={detail.workout.id} onClick={(event) => onOpen(event.currentTarget)} aria-label={`${detail.workout.title}, ${meta}`}>
    <span className="history-card-kicker">{meta}</span><span className="history-card-heading"><strong>{detail.workout.title}</strong><WorkoutIcon name="next" /></span>
    <span className="history-card-exercises">{summary.exercises.map(({ exercise, setCount, repetitionCount }) => <span className="history-exercise-summary" key={exercise.id}><b>{lang === 'ru' ? exercise.name_ru : exercise.name_en}</b><small>{exerciseTotals(setCount, repetitionCount, lang)}</small></span>)}</span>
    <span className="history-result-strip"><span>{lang === 'ru' ? 'Объем' : 'Volume'} <b>{number.format(summary.volume)} {lang === 'ru' ? 'кг' : 'kg'}</b></span>{recordCount > 0 && <span className="history-record">{lang === 'ru' ? 'Личные рекорды' : 'Personal records'} <b>{recordCount}</b></span>}</span>
  </button>
}
