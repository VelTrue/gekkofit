import type { MasteryItem } from '../../data-layer/mastery'
import type { CSSProperties } from 'react'
import { useLang } from '../../i18n/LangContext'
import { MasteryMedallion } from './MasteryMedallion'
import { WorkoutIcon } from '../workout/WorkoutIcon'
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
  return <WorkoutDialog title={name} onClose={onClose} variant="mastery-sheet">
    <article className="mastery-detail">
      <div className="mastery-detail-hero" data-tier={masteryVisualTier(mastery.level)}>
        <MasteryMedallion item={item} />
        <div className="mastery-detail-heading"><h3>{name}</h3><p>{t('masteryLevel')} {mastery.level} <span>· {masteryTierNames[lang][masteryVisualTier(mastery.level)]}</span></p>
          <section className="mastery-progress" aria-label={t('levelProgress')}>
            <div className="mastery-progress-ring" role="progressbar" aria-label={t('levelProgress')} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} style={{ '--progress': `${progress}%` } as CSSProperties}><strong>{Math.round(progress)}<small>%</small></strong></div>
            <div className="mastery-progress-caption"><span>{mastery.nextLevelThreshold === null ? t('maximumLevel') : `${t('toLevel')} ${nextLevel}`}</span><strong>{formatNumber(mastery.points, lang)} / {formatNumber(mastery.nextLevelThreshold ?? mastery.points, lang)}</strong><span>{t('points')}</span></div>
          </section>
        </div>
      </div>
      <dl className="mastery-stats">{[stats[0], stats[4], stats[2], [t('masteryRemaining'), `${formatNumber(mastery.pointsToNextLevel, lang)} ${t('points')}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <details className="mastery-records"><summary>{t('masteryMore')}</summary><div className="mastery-records-content"><p>{mastery.nextLevelThreshold === null ? t('allLevelsUnlocked') : t('reachMasteryPoints').replace('{points}', String(mastery.nextLevelThreshold))}</p><dl className="mastery-extra-stats">{[stats[1], stats[3], stats[5]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3>{t('lastPerformed')}</h3><p>{mastery.lastPerformedAt ? new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(mastery.lastPerformedAt)) : t('notPerformed')}</p><h3>{t('personalRecords')}</h3>{mastery.records.length ? <ol>{mastery.records.slice(-3).reverse().map((record) => <li key={record.setId}><time dateTime={record.performedAt}>{new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(new Date(record.performedAt))}</time><strong>{formatNumber(record.weight, lang, 1)} {unit} × {record.reps}</strong></li>)}</ol> : <p>{t('noRecords')}</p>}</div></details>
      <button type="button" className="mastery-open" onClick={() => onOpenExercise(item)}>{t('openExercise')}<WorkoutIcon name="next" /></button>
    </article>
  </WorkoutDialog>
}
