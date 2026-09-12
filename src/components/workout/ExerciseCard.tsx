import { useState } from 'react'
import type { SetChanges, WorkoutEntry } from '../../data-layer/workoutEditor'
import { useLang } from '../../i18n/LangContext'
import { AnatomyMap } from '../anatomy/AnatomyMap'
import { SetRow } from './SetRow'
import { ConfirmAction } from './WorkoutDialog'
import { WorkoutIcon } from './WorkoutIcon'
import { anatomyLabel, equipmentName, muscleNames, validMuscles } from './exercisePresentation'
import './workout.css'

export interface WorkoutEditingActions {
  onAddSet: (exerciseId: number) => Promise<void>
  onUpdateSet: (setId: string, changes: SetChanges) => Promise<void>
  onDeleteSet: (setId: string) => Promise<void>
  onRemoveExercise: (exerciseId: number) => Promise<void>
  onMoveExercise: (exerciseId: number, order: number) => Promise<void>
}

export interface ExerciseCardProps extends WorkoutEditingActions {
  entry: WorkoutEntry
  index: number
  total: number
  previousResult?: string
  onPrevious?: () => void
  onNext?: () => void
}

export function ExerciseCard({ entry, index, total, previousResult, onPrevious, onNext, ...actions }: ExerciseCardProps) {
  const { lang } = useLang()
  const ru = lang === 'ru'
  const { exercise, sets } = entry
  const title = ru ? exercise.name_ru : exercise.name_en
  const [removing, setRemoving] = useState(false)
  const [pending, setPending] = useState(false)
  const [retry, setRetry] = useState<(() => Promise<void>) | null>(null)
  async function perform(action: () => Promise<void>) {
    if (pending) return
    setPending(true); setRetry(null)
    try { await action() }
    catch { setRetry(() => action) }
    finally { setPending(false) }
  }
  return <article className="workout-exercise" aria-label={title}>
    <header className="workout-exercise-header">
      <div className="workout-anatomy"><AnatomyMap primary={validMuscles(exercise.primary_muscles)} secondary={validMuscles(exercise.secondary_muscles)} view={exercise.preferred_body_view} size={112} label={anatomyLabel(exercise, lang)} /></div>
      <div className="workout-exercise-identity"><p className="workout-caption">{ru ? `Упражнение ${index + 1} из ${total}` : `Exercise ${index + 1} of ${total}`}</p><h2>{title}</h2><p className="workout-muted">{equipmentName(exercise.equipment, lang)} · {muscleNames(exercise.primary_muscles, lang)}</p></div>
    </header>
    <div className="workout-previous"><span>{ru ? 'В прошлый раз' : 'Previous session'}</span><strong>{previousResult || (ru ? 'Первый подход впереди' : 'Your first set awaits')}</strong></div>
    <div className="workout-set-list">{sets.length ? sets.map((set) => <SetRow key={set.id} set={set} onSave={(changes) => actions.onUpdateSet(set.id, changes)} onDelete={() => actions.onDeleteSet(set.id)} />) : <p className="workout-empty-copy">{ru ? 'Добавьте первый подход. Вес и повторы можно изменить.' : 'Add your first set. Weight and reps stay editable.'}</p>}</div>
    {retry && <div className="workout-error"><p role="alert">{ru ? 'Не удалось сохранить изменение.' : 'Could not save the change.'}</p><button className="workout-text-button" type="button" onClick={() => void perform(retry)}>{ru ? 'Повторить' : 'Retry'}</button></div>}
    <div className="workout-exercise-tools"><button type="button" className="workout-button" disabled={pending} onClick={() => void perform(() => actions.onAddSet(exercise.id))}><WorkoutIcon name="plus" />{ru ? 'Добавить подход' : 'Add set'}</button>
      <details className="workout-exercise-menu"><summary>{ru ? 'Действия' : 'Actions'}</summary><div>
        <button type="button" className="workout-button" disabled={pending || index === 0} onClick={() => void perform(() => actions.onMoveExercise(exercise.id, index - 1))}><WorkoutIcon name="up" />{ru ? 'Переместить выше' : 'Move earlier'}</button>
        <button type="button" className="workout-button" disabled={pending || index === total - 1} onClick={() => void perform(() => actions.onMoveExercise(exercise.id, index + 1))}><WorkoutIcon name="down" />{ru ? 'Переместить ниже' : 'Move later'}</button>
        <button type="button" className="workout-button workout-button-danger" disabled={pending} onClick={() => setRemoving(true)}><WorkoutIcon name="remove" />{ru ? 'Удалить упражнение' : 'Remove exercise'}</button>
      </div></details>
    </div>
    {total > 1 && <nav className="workout-exercise-nav" aria-label={ru ? 'Переход между упражнениями' : 'Exercise navigation'}><button type="button" className="workout-button" disabled={!onPrevious} onClick={onPrevious}><WorkoutIcon name="back" />{ru ? 'Предыдущее' : 'Previous'}</button><button type="button" className="workout-button" disabled={!onNext} onClick={onNext}>{ru ? 'Следующее' : 'Next'}<WorkoutIcon name="next" /></button></nav>}
    {removing && <ConfirmAction title={ru ? 'Удалить упражнение?' : 'Remove exercise?'} description={ru ? `«${title}» и все его подходы будут удалены из тренировки.` : `“${title}” and all its sets will be removed from the workout.`} confirmLabel={ru ? 'Удалить' : 'Remove'} onConfirm={() => actions.onRemoveExercise(exercise.id)} onClose={() => setRemoving(false)} />}
  </article>
}
