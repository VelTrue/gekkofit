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
  const { lang, t } = useLang()
  const { exercise, mastery } = item
  const name = lang === 'ru' ? exercise.name_ru : exercise.name_en
  const nextLevel = mastery.level + 1
  const range = mastery.nextLevelThreshold === null ? 1 : mastery.nextLevelThreshold - mastery.currentThreshold
  const progress = mastery.nextLevelThreshold === null ? 100 : Math.max(0, Math.min(100, (mastery.points - mastery.currentThreshold) / range * 100))
  const unit = t('kg')
  const stats = [[t('bestWeight'), `${formatNumber(mastery.bestWeight, lang, 1)} ${unit}`], [t('estimatedMax'), `${formatNumber(mastery.estimatedOneRepMax, lang, 1)} ${unit}`], [t('volume'), `${formatNumber(mastery.volume, lang, 1)} ${unit}`], [t('workouts'), formatNumber(mastery.workoutCount, lang)], [t('sets'), formatNumber(mastery.setCount, lang)], [t('repetitions'), formatNumber(mastery.repetitionCount, lang)]]
  return <WorkoutDialog title={name} onClose={onClose}>
    <article className="mastery-detail">
      <div className="mastery-detail-hero" data-tier={masteryVisualTier(mastery.level)}>
        <AnatomyMap primary={exercise.primary_muscles as MuscleId[]} secondary={exercise.secondary_muscles as MuscleId[]} view={exercise.preferred_body_view} size="lg" label={name} />
        <div><p>{masteryTierNames[lang][masteryVisualTier(mastery.level)]}</p><strong>{t('masteryLevel')} {mastery.level}</strong></div>
      </div>
      <section className="mastery-progress" aria-label={t('levelProgress')}>
        <div><strong>{mastery.nextLevelThreshold === null ? t('maximumLevel') : `${t('toLevel')} ${nextLevel}`}</strong><span>{mastery.nextLevelThreshold === null ? `${mastery.points}` : `${mastery.pointsToNextLevel} ${t('points')}`}</span></div>
        <progress value={progress} max="100">{Math.round(progress)}%</progress>
        <p>{mastery.nextLevelThreshold === null ? t('allLevelsUnlocked') : t('reachMasteryPoints').replace('{points}', String(mastery.nextLevelThreshold))}</p>
      </section>
      <dl className="mastery-stats">{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <section className="mastery-records"><h3>{t('lastPerformed')}</h3><p>{mastery.lastPerformedAt ? new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(mastery.lastPerformedAt)) : t('notPerformed')}</p><h3>{t('personalRecords')}</h3>{mastery.records.length ? <ol>{mastery.records.slice(-3).reverse().map((record) => <li key={record.setId}><time dateTime={record.performedAt}>{new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(new Date(record.performedAt))}</time><strong>{formatNumber(record.weight, lang, 1)} {unit} × {record.reps}</strong></li>)}</ol> : <p>{t('noRecords')}</p>}</section>
      <button type="button" className="mastery-open" onClick={() => onOpenExercise(item)}>{t('openExercise')}</button>
    </article>
  </WorkoutDialog>
}
