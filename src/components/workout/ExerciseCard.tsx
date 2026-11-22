import { useState } from 'react'
import type { SetChanges, WorkoutEntry } from '../../data-layer/workoutEditor'
import type { ExerciseHistorySession } from '../../data-layer/workoutSummary'
import { useLang } from '../../i18n/LangContext'
import { ExerciseVisual } from '../exercises/ExerciseVisual'
import { SetRow } from './SetRow'
import { ConfirmAction, WorkoutDialog } from './WorkoutDialog'
import { WorkoutIcon } from './WorkoutIcon'
import { equipmentName, muscleNames } from './exercisePresentation'
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
  historyResults?: ExerciseHistorySession[]
  onPrevious?: () => void
  onNext?: () => void
  onReplace?: (exerciseId: number) => void
  onAddExercise?: () => void
}

export function ExerciseCard({ entry, index, total, historyResults, onPrevious, onNext, onReplace, onAddExercise, ...actions }: ExerciseCardProps) {
  const { lang, t } = useLang()
  const { exercise, sets } = entry
  const title = lang === 'ru' ? exercise.name_ru : exercise.name_en
  const completedSets = sets.filter(({ completed }) => completed).length
  const volume = exercise.muscle_group === 'КАРДИО' ? 0 : sets.filter(({ completed }) => completed).reduce((sum, set) => sum + set.weight * set.reps, 0)
  const [removing, setRemoving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
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
      {total > 1 && <button type="button" className="workout-exercise-arrow" disabled={!onPrevious} aria-label={t('previous')} onClick={onPrevious}><WorkoutIcon name="back" /></button>}
      <div className="workout-anatomy"><ExerciseVisual exercise={exercise} size={180} /></div>
      <div className="workout-exercise-identity"><p className="workout-caption">{t('exercisePosition').replace('{index}', String(index + 1)).replace('{total}', String(total))}</p><h2>{title}</h2><p className="workout-muted">{equipmentName(exercise.equipment, lang)} · {muscleNames(exercise.primary_muscles, lang)}</p></div>
      {total > 1 && <button type="button" className="workout-exercise-arrow" disabled={!onNext} aria-label={t('next')} onClick={onNext}><WorkoutIcon name="next" /></button>}
    </header>
    <div className="workout-exercise-shortcuts"><button type="button" className="workout-button" onClick={() => { setShowAllHistory(false); setHistoryOpen(true) }}><WorkoutIcon name="history" />{t('exerciseHistory')}</button><button type="button" className="workout-button" onClick={() => onReplace?.(exercise.id)} disabled={!onReplace}><WorkoutIcon name="replace" />{t('replaceExercise')}</button></div>
    <div className="workout-sets-heading"><div><h3>{t('sets')}</h3><span>{t('completedProgress').replace('{done}', String(completedSets)).replace('{total}', String(sets.length))}</span></div><div className="workout-sets-progress" role="progressbar" aria-label={t('completedSets')} aria-valuenow={completedSets} aria-valuemin={0} aria-valuemax={Math.max(sets.length, 1)}><span style={{ width: `${sets.length ? completedSets / sets.length * 100 : 0}%` }} /></div></div>
    <div className="workout-set-list">{sets.length ? sets.map((set) => <SetRow key={set.id} set={set} cardio={exercise.muscle_group === 'КАРДИО'} onSave={(changes) => actions.onUpdateSet(set.id, changes)} onDelete={() => actions.onDeleteSet(set.id)} />) : <p className="workout-empty-copy">{t('addFirstSet')}</p>}</div>
    {retry && <div className="workout-error"><p role="alert">{t('changeSaveError')}</p><button className="workout-text-button" type="button" onClick={() => void perform(retry)}>{t('retry')}</button></div>}
    <div className="workout-exercise-tools"><button type="button" className="workout-button" disabled={pending} onClick={() => void perform(() => actions.onAddSet(exercise.id))}><WorkoutIcon name="plus" />{t('addSet')}</button>
      {onAddExercise && <button type="button" className="workout-button workout-exercise-add" onClick={onAddExercise}><WorkoutIcon name="plus" />{t('addExercisePlain')}</button>}
    </div>
    <div className="workout-exercise-volume"><span>{t('volume')}</span><strong>{new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(volume)} {t('kg')}</strong></div>
    <div className="workout-exercise-secondary">
      <button type="button" className="workout-icon-button" disabled={pending || index === 0} aria-label={t('moveEarlier')} onClick={() => void perform(() => actions.onMoveExercise(exercise.id, index - 1))}><WorkoutIcon name="up" /></button>
      <button type="button" className="workout-icon-button" disabled={pending || index === total - 1} aria-label={t('moveLater')} onClick={() => void perform(() => actions.onMoveExercise(exercise.id, index + 1))}><WorkoutIcon name="down" /></button>
      <button type="button" className="workout-icon-button workout-button-danger" disabled={pending} aria-label={t('removeExercise')} onClick={() => setRemoving(true)}><WorkoutIcon name="remove" /></button>
    </div>
    {removing && <ConfirmAction title={t('removeExerciseConfirm')} description={t('removeExerciseDescription').replace('{title}', title)} confirmLabel={t('delete')} onConfirm={() => actions.onRemoveExercise(exercise.id)} onClose={() => setRemoving(false)} />}
    {historyOpen && <WorkoutDialog title={t('exerciseHistory')} variant="history-sheet" onClose={() => setHistoryOpen(false)}><div className="workout-history-layout"><div className="workout-history-scroll">{historyResults?.length ? <div className="workout-history-results">{(showAllHistory ? historyResults : historyResults.slice(0, 1)).map((session) => <section className="workout-history-session" key={session.workoutId}><h3>{session.date}, {session.weekday}</h3>{!session.title.includes(session.date) && <p className="workout-history-tag">{session.title}</p>}<ol>{session.sets.map((result, position) => <li key={position}><span className="workout-history-number">{position + 1}</span><span>{result}</span></li>)}</ol></section>)}</div> : <p className="workout-history-empty">{t('notPerformed')}</p>}</div><div className="workout-history-footer"><button type="button" onClick={() => setShowAllHistory((value) => !value)}>{t(showAllHistory ? 'showLatestHistory' : 'allHistory')}</button></div></div></WorkoutDialog>}
  </article>
}
