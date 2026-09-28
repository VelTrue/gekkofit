import { useEffect, useState } from 'react'
import { equipmentName, muscleNames } from '../../data-layer/exerciseLabels'
import { getLastSetForExercise } from '../../data-layer/sets'
import { db, type Exercise, type WorkoutSet } from '../../db/schema'
import { useLang } from '../../i18n/LangContext'
import { ExerciseVisual } from './ExerciseVisual'
import { WorkoutDialog } from '../workout/WorkoutDialog'
import '../workout/workout.css'
import '../mastery/mastery.css'
import './exercises.css'

export function ExerciseDetailSheet({ exercise, onClose, compact = false, alternatives = [] }: { exercise: Exercise; onClose: () => void; compact?: boolean; alternatives?: Exercise[] }) {
  const { lang, t } = useLang()
  const [result, setResult] = useState<{ value?: WorkoutSet; status: 'loading' | 'ready' | 'error' }>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [alternativesOpen, setAlternativesOpen] = useState(false)
  useEffect(() => {
    let current = true
    void getLastSetForExercise(db, exercise.id).then((value) => {
      if (current) setResult({ value, status: 'ready' })
    }).catch(() => { if (current) setResult({ status: 'error' }) })
    return () => { current = false }
  }, [exercise.id, attempt])
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 20 })
  const name = lang === 'ru' ? exercise.name_ru : exercise.name_en
  return <WorkoutDialog title={name} backLabel={t('backToExercises')} onClose={onClose} variant={compact ? 'mastery-sheet' : 'default'}>
    <div className={`exercise-detail${compact ? ' exercise-detail-compact' : ''}`}>
      {compact && <h3>{name}</h3>}
      <div className="exercise-detail-map"><ExerciseVisual exercise={exercise} size={compact ? 160 : 320} bothViews /></div>
      <dl className="exercise-detail-metadata">
        <div><dt>{t('equipment')}</dt><dd>{equipmentName(exercise.equipment, lang)}</dd></div>
        <div><dt><span className="exercise-muscle-key" />{t('primaryMuscles')}</dt><dd>{muscleNames(exercise.primary_muscles, lang)}</dd></div>
        <div><dt><span className="exercise-muscle-key exercise-muscle-key-secondary" />{t('secondaryMuscles')}</dt><dd>{muscleNames(exercise.secondary_muscles, lang) || t('none')}</dd></div>
      </dl>
      <section className="exercise-latest"><h3>{t('latestSet')}</h3>
        {result.status === 'loading' && <p role="status">{t('resultLoading')}</p>}
        {result.status === 'error' && <><p role="alert">{t('resultLoadError')}</p><button type="button" className="workout-button" onClick={() => { setResult({ status: 'loading' }); setAttempt((value) => value + 1) }}>{t('retry')}</button></>}
        {result.status === 'ready' && (result.value ? <><strong>{number.format(result.value.weight)} {t('kg')} × {number.format(result.value.reps)}</strong><time dateTime={result.value.createdAt}>{new Date(result.value.createdAt).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })}</time>{!result.value.completed && <p>{t('notCompleted')}</p>}</> : <p>{t('noLoggedSets')}</p>)}
      </section>
      {compact && alternatives.length > 0 && <section className="exercise-detail-alternatives">
        <button type="button" className="workout-button exercise-alternatives-trigger" aria-expanded={alternativesOpen} onClick={() => setAlternativesOpen((value) => !value)}>{t('ifEquipmentBusy')} <span>{alternatives.length}</span></button>
        {alternativesOpen && <ul className="exercise-alternatives-list" aria-label={t('alternatives')}>{alternatives.slice(0, 3).map((alternative) => <li key={alternative.id}><strong>{lang === 'ru' ? alternative.name_ru : alternative.name_en}</strong><span>{equipmentName(alternative.equipment, lang)}</span></li>)}</ul>}
      </section>}
    </div>
  </WorkoutDialog>
}
