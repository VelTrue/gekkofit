import { useEffect, useState } from 'react'
import { anatomyLabel, equipmentName, muscleNames, validMuscles } from '../../data-layer/exerciseLabels'
import { getLastSetForExercise } from '../../data-layer/sets'
import { db, type Exercise, type WorkoutSet } from '../../db/schema'
import { useLang } from '../../i18n/LangContext'
import { AnatomyMap } from '../anatomy/AnatomyMap'
import { WorkoutDialog } from '../workout/WorkoutDialog'
import '../workout/workout.css'
import './exercises.css'

export function ExerciseDetailSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const { lang, t } = useLang()
  const [result, setResult] = useState<{ value?: WorkoutSet; status: 'loading' | 'ready' | 'error' }>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    void getLastSetForExercise(db, exercise.id).then((value) => {
      if (current) setResult({ value, status: 'ready' })
    }).catch(() => { if (current) setResult({ status: 'error' }) })
    return () => { current = false }
  }, [exercise.id, attempt])
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 20 })
  return <WorkoutDialog title={lang === 'ru' ? exercise.name_ru : exercise.name_en} backLabel={t('backToExercises')} onClose={onClose}>
    <div className="exercise-detail">
      <div className="exercise-detail-map"><AnatomyMap primary={validMuscles(exercise.primary_muscles)} secondary={validMuscles(exercise.secondary_muscles)} view="both" size="lg" label={anatomyLabel(exercise, lang)} /><div className="exercise-body-labels"><span>{t('front')}</span><span>{t('backView')}</span></div></div>
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
    </div>
  </WorkoutDialog>
}
