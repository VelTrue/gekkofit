import type { MasteryItem } from '../../data-layer/mastery'
import type { MuscleId } from '../../db/catalogValidation'
import { useLang } from '../../i18n/LangContext'
import { AnatomyMap } from '../anatomy/AnatomyMap'
import { WorkoutDialog } from '../workout/WorkoutDialog'
import '../workout/workout.css'
import { masteryTierNames, masteryVisualTier } from './masteryTiers'
import './mastery.css'

const formatNumber = (value: number, lang: 'ru' | 'en', digits = 0) => new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(value)

export function MasteryDetailSheet({ item, onClose, onOpenExercise }: { item: MasteryItem; onClose: () => void; onOpenExercise: (item: MasteryItem) => void }) {
  const { lang } = useLang()
  const { exercise, mastery } = item
  const name = lang === 'ru' ? exercise.name_ru : exercise.name_en
  const nextLevel = mastery.level + 1
  const range = mastery.nextLevelThreshold === null ? 1 : mastery.nextLevelThreshold - mastery.currentThreshold
  const progress = mastery.nextLevelThreshold === null ? 100 : Math.max(0, Math.min(100, (mastery.points - mastery.currentThreshold) / range * 100))
  const unit = lang === 'ru' ? 'кг' : 'kg'
  const stats = lang === 'ru'
    ? [['Лучший вес', `${formatNumber(mastery.bestWeight, lang, 1)} ${unit}`], ['Расчетный максимум', `${formatNumber(mastery.estimatedOneRepMax, lang, 1)} ${unit}`], ['Объем', `${formatNumber(mastery.volume, lang, 1)} ${unit}`], ['Тренировки', formatNumber(mastery.workoutCount, lang)], ['Подходы', formatNumber(mastery.setCount, lang)], ['Повторения', formatNumber(mastery.repetitionCount, lang)]]
    : [['Best weight', `${formatNumber(mastery.bestWeight, lang, 1)} ${unit}`], ['Estimated 1RM', `${formatNumber(mastery.estimatedOneRepMax, lang, 1)} ${unit}`], ['Volume', `${formatNumber(mastery.volume, lang, 1)} ${unit}`], ['Workouts', formatNumber(mastery.workoutCount, lang)], ['Sets', formatNumber(mastery.setCount, lang)], ['Repetitions', formatNumber(mastery.repetitionCount, lang)]]
  return <WorkoutDialog title={name} onClose={onClose}>
    <article className="mastery-detail">
      <div className="mastery-detail-hero" data-tier={masteryVisualTier(mastery.level)}>
        <AnatomyMap primary={exercise.primary_muscles as MuscleId[]} secondary={exercise.secondary_muscles as MuscleId[]} view={exercise.preferred_body_view} size="lg" label={name} />
        <div><p>{masteryTierNames[lang][masteryVisualTier(mastery.level)]}</p><strong>{lang === 'ru' ? `Уровень ${mastery.level}` : `Level ${mastery.level}`}</strong></div>
      </div>
      <section className="mastery-progress" aria-label={lang === 'ru' ? 'Прогресс уровня' : 'Level progress'}>
        <div><strong>{mastery.nextLevelThreshold === null ? (lang === 'ru' ? 'Максимальный уровень' : 'Maximum level') : (lang === 'ru' ? `До уровня ${nextLevel}` : `To level ${nextLevel}`)}</strong><span>{mastery.nextLevelThreshold === null ? `${mastery.points}` : `${mastery.pointsToNextLevel} ${lang === 'ru' ? 'очков' : 'points'}`}</span></div>
        <progress value={progress} max="100">{Math.round(progress)}%</progress>
        <p>{mastery.nextLevelThreshold === null ? (lang === 'ru' ? 'Все уровни открыты.' : 'All levels unlocked.') : (lang === 'ru' ? `Наберите ${mastery.nextLevelThreshold} очков мастерства.` : `Reach ${mastery.nextLevelThreshold} mastery points.`)}</p>
      </section>
      <dl className="mastery-stats">{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <section className="mastery-records"><h3>{lang === 'ru' ? 'Последний результат' : 'Last performed'}</h3><p>{mastery.lastPerformedAt ? new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(mastery.lastPerformedAt)) : (lang === 'ru' ? 'Еще не выполнялось' : 'Not performed yet')}</p><h3>{lang === 'ru' ? 'Личные рекорды' : 'Personal records'}</h3>{mastery.records.length ? <ol>{mastery.records.slice(-3).reverse().map((record) => <li key={record.setId}><time dateTime={record.performedAt}>{new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(new Date(record.performedAt))}</time><strong>{formatNumber(record.weight, lang, 1)} {unit} × {record.reps}</strong></li>)}</ol> : <p>{lang === 'ru' ? 'Рекордов пока нет' : 'No records yet'}</p>}</section>
      <button type="button" className="mastery-open" onClick={() => onOpenExercise(item)}>{lang === 'ru' ? 'Открыть упражнение' : 'Open exercise'}</button>
    </article>
  </WorkoutDialog>
}
