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
  const { lang } = useLang()
  const ru = lang === 'ru'
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
  return <WorkoutDialog title={ru ? exercise.name_ru : exercise.name_en} backLabel={ru ? 'Назад к упражнениям' : 'Back to exercises'} onClose={onClose}>
    <div className="exercise-detail">
      <div className="exercise-detail-map"><AnatomyMap primary={validMuscles(exercise.primary_muscles)} secondary={validMuscles(exercise.secondary_muscles)} view="both" size="lg" label={anatomyLabel(exercise, lang)} /><div className="exercise-body-labels"><span>{ru ? 'Спереди' : 'Front'}</span><span>{ru ? 'Сзади' : 'Back'}</span></div></div>
      <dl className="exercise-detail-metadata">
        <div><dt>{ru ? 'Оборудование' : 'Equipment'}</dt><dd>{equipmentName(exercise.equipment, lang)}</dd></div>
        <div><dt><span className="exercise-muscle-key" />{ru ? 'Основные мышцы' : 'Primary muscles'}</dt><dd>{muscleNames(exercise.primary_muscles, lang)}</dd></div>
        <div><dt><span className="exercise-muscle-key exercise-muscle-key-secondary" />{ru ? 'Вспомогательные мышцы' : 'Secondary muscles'}</dt><dd>{muscleNames(exercise.secondary_muscles, lang) || (ru ? 'Нет' : 'None')}</dd></div>
      </dl>
      <section className="exercise-latest"><h3>{ru ? 'Последний записанный подход' : 'Latest logged set'}</h3>
        {result.status === 'loading' && <p role="status">{ru ? 'Загружаем результат…' : 'Loading result…'}</p>}
        {result.status === 'error' && <><p role="alert">{ru ? 'Не удалось загрузить результат.' : 'Could not load the result.'}</p><button type="button" className="workout-button" onClick={() => { setResult({ status: 'loading' }); setAttempt((value) => value + 1) }}>{ru ? 'Повторить' : 'Retry'}</button></>}
        {result.status === 'ready' && (result.value ? <><strong>{number.format(result.value.weight)} {ru ? 'кг' : 'kg'} × {number.format(result.value.reps)}</strong><time dateTime={result.value.createdAt}>{new Date(result.value.createdAt).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })}</time>{!result.value.completed && <p>{ru ? 'Ещё не выполнен' : 'Not completed yet'}</p>}</> : <p>{ru ? 'Записанных подходов пока нет' : 'No logged sets yet'}</p>)}
      </section>
    </div>
  </WorkoutDialog>
}
