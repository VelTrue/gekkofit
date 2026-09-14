import { plural, t, type Lang } from '../../i18n/translations'
import { WorkoutIcon } from '../workout/WorkoutIcon'
import './history.css'
import { exerciseTotals, workoutDurationMinutes, type HistoryItem } from './historyModel'

export function HistoryCard({ item, lang, onOpen }: { item: HistoryItem; lang: Lang; onOpen: (source: HTMLButtonElement) => void }) {
  const { detail, summary, recordCount } = item
  const duration = workoutDurationMinutes(detail)
  const date = new Date(detail.workout.startedAt).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
  const durationLabel = duration === null ? null : `${duration} ${plural(lang, duration, 'minuteOne', 'minuteFew', 'minuteMany')}`
  const meta = [date, durationLabel].filter(Boolean).join(', ')
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const exerciseLabel = summary.exercises.map(({ exercise, setCount, repetitionCount }) => `${lang === 'ru' ? exercise.name_ru : exercise.name_en}, ${exerciseTotals(setCount, repetitionCount, lang)}`).join(', ')
  const volumeLabel = `${t(lang, 'volume')} ${number.format(summary.volume)} ${t(lang, 'kg')}`
  const recordLabel = recordCount > 0 ? `${t(lang, 'personalRecords')} ${recordCount}` : ''
  return <button type="button" className="history-card" data-workout-id={detail.workout.id} onClick={(event) => onOpen(event.currentTarget)} aria-label={[detail.workout.title, meta, exerciseLabel, volumeLabel, recordLabel].filter(Boolean).join(', ')}>
    <span className="history-card-kicker">{meta}</span><span className="history-card-heading"><strong>{detail.workout.title}</strong><WorkoutIcon name="next" /></span>
    <span className="history-card-exercises">{summary.exercises.map(({ exercise, setCount, repetitionCount }) => <span className="history-exercise-summary" key={exercise.id}><b>{lang === 'ru' ? exercise.name_ru : exercise.name_en}</b><small>{exerciseTotals(setCount, repetitionCount, lang)}</small></span>)}</span>
    <span className="history-result-strip"><span>{t(lang, 'volume')} <b>{number.format(summary.volume)} {t(lang, 'kg')}</b></span>{recordCount > 0 && <span className="history-record">{t(lang, 'personalRecords')} <b>{recordCount}</b></span>}</span>
  </button>
}
