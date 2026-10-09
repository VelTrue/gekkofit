import { useCallback, useEffect, useState } from 'react'
import { ConfirmAction, WorkoutDialog } from '../components/workout/WorkoutDialog'
import { WorkoutTitle } from '../components/workout/WorkoutTitle'
import { WorkoutViews } from '../components/workout/WorkoutViews'
import { WorkoutIcon } from '../components/workout/WorkoutIcon'
import '../components/workout/workout.css'
import { addSet, getLastSetForExercise } from '../data-layer/sets'
import {
  addExerciseToWorkout, deleteSet, discardWorkout, getWorkoutEntries, removeExerciseFromWorkout,
  renameWorkout, reorderWorkoutExercise, updateSet, type SetChanges, type WorkoutEntry,
} from '../data-layer/workoutEditor'
import { formatWorkoutAsNote, summarizeWorkout } from '../data-layer/workoutSummary'
import { finishWorkout, getActiveWorkout, getWorkoutDetail, getWorkoutHistory, startWorkout } from '../data-layer/workouts'
import { db, type Exercise, type Workout } from '../db/schema'
import { useLang } from '../i18n/LangContext'
import { ExercisePicker } from './ExercisePicker'

const REST_SECONDS = 90

export function HomeScreen() {
  const { lang, t } = useLang()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [entries, setEntries] = useState<WorkoutEntry[]>([])
  const [recent, setRecent] = useState<Workout[]>([])
  const [previousResults, setPreviousResults] = useState<Record<number, string>>({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [rest, setRest] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [retry, setRetry] = useState<(() => Promise<void>) | null>(null)
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null)
  const [recentOpen, setRecentOpen] = useState(false)
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    const [active, history] = await Promise.all([getActiveWorkout(db), getWorkoutHistory(db)])
    const loadedEntries = active ? await getWorkoutEntries(db, active.id) : []
    const previous: Record<number, string> = {}
    for (const item of history) {
      const detail = await getWorkoutDetail(db, item.id)
      for (const note of formatWorkoutAsNote(detail, lang)) previous[note.exerciseId] ??= note.sets.join(' · ')
    }
    setWorkout(active ?? null); setEntries(loadedEntries); setRecent(history.slice(0, 4)); setPreviousResults(previous)
  }, [lang])

  useEffect(() => {
    let mounted = true
    void Promise.resolve().then(load).catch(() => { if (mounted) setRetry(() => load) }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [load])

  useEffect(() => {
    if (rest === null || rest <= 0) return
    const timer = window.setTimeout(() => setRest((seconds) => Math.max(0, (seconds ?? 1) - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [rest])

  useEffect(() => {
    if (!workout) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [workout])

  async function perform(action: () => Promise<void>) {
    if (pending) return
    setPending(true); setRetry(null)
    try { await action() }
    catch { setRetry(() => action) }
    finally { setPending(false) }
  }

  async function refresh() {
    if (!workout) return
    const detail = await getWorkoutDetail(db, workout.id)
    setWorkout(detail.workout); setEntries(detail.entries)
  }

  async function handleStart() {
    const next = await startWorkout(db, lang)
    setWorkout(next); setEntries(await getWorkoutEntries(db, next.id))
  }

  async function handlePick(exercise: Exercise) {
    if (!workout) return
    setPickerOpen(false)
    await perform(async () => { await addExerciseToWorkout(db, workout.id, exercise.id); await refresh(); setSelectedExerciseId(exercise.id) })
  }

  async function handleAddSet(exerciseId: number) {
    if (!workout) return
    const workoutEntry = entries.find(({ exercise }) => exercise.id === exerciseId)
    const last = workoutEntry?.sets.at(-1)
      ?? await getLastSetForExercise(db, exerciseId)
    const cardio = workoutEntry?.exercise.muscle_group === 'КАРДИО'
    await addSet(db, workout.id, exerciseId, cardio ? 0 : last?.weight ?? 20, cardio ? 1 : last?.reps ?? 8)
    await refresh()
  }

  async function handleUpdateSet(setId: string, changes: SetChanges) {
    const before = await db.sets.get(setId)
    await updateSet(db, setId, changes)
    await refresh()
    if (changes.completed === true && before?.completed === false) setRest(REST_SECONDS)
  }

  async function closeWorkout() {
    if (!workout) return
    if (confirm === 'discard') await discardWorkout(db, workout.id)
    else await finishWorkout(db, workout.id)
    await load()
    setRest(null); setConfirm(null)
  }

  const error = retry && <div className="workout-screen-error"><p role="alert">{t('homeLoadError')}</p><button type="button" className="workout-button" disabled={pending} onClick={() => void perform(retry)}>{t('retry')}</button></div>
  if (loading) return <section className="workout-loading" role="status">{t('workoutLoading')}</section>

  if (!workout) return <section className="workout-home">
    {error}
    <p className="workout-caption">{t('journalKicker')}</p>
    <h1>{t('homeHeadline')}</h1>
    <p className="workout-muted">{t('homeIntro')}</p>
    <button type="button" className="workout-button workout-button-primary" disabled={pending} onClick={() => void perform(handleStart)}><WorkoutIcon name="plus" />{pending ? t('starting') : t('startWorkout')}</button>
    {recent.length > 0 && <section className="workout-recent"><button type="button" className="workout-button" onClick={() => setRecentOpen(true)}>{t('recent')}<WorkoutIcon name="next" /></button></section>}
    {recentOpen && <WorkoutDialog title={t('recent')} onClose={() => setRecentOpen(false)}><ul className="workout-recent-list">{recent.map((item) => <li key={item.id}><strong>{item.title}</strong><time dateTime={item.startedAt}>{new Date(item.startedAt).toLocaleDateString(lang, { day: 'numeric', month: 'short' })}</time></li>)}</ul></WorkoutDialog>}
  </section>

  const detail = { workout, entries }
  const summary = summarizeWorkout(detail)
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const elapsedMinutes = Math.max(0, Math.floor((now - new Date(workout.startedAt).getTime()) / 60000))
  const elapsed = `${String(Math.floor(elapsedMinutes / 60)).padStart(2, '0')}:${String(elapsedMinutes % 60).padStart(2, '0')}`
  return <section className="workout-session">
    <header className="workout-session-header"><p className="workout-caption"><span className="workout-mobile-label">{t('sessionInProgress')}</span><span className="workout-desktop-label">{t('activeWorkoutLabel')}</span></p><WorkoutTitle title={workout.title} onSave={async (title) => { await renameWorkout(db, workout.id, title); await refresh() }} />
      <div className="workout-session-summary workout-session-summary-mobile"><span>{t('completedSets')} <strong>{summary.setCount}</strong></span><span>{t('volume')} <strong>{number.format(summary.volume)} {t('kg')}</strong></span></div>
      <div className="workout-session-summary workout-session-summary-desktop"><div className="workout-summary-item"><span className="workout-summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 9v6m3-9v12m10-12v12m3-9v6M7 12h10" strokeLinecap="round"/></svg></span><div><strong>{summary.setCount}</strong><span>{t('completedSets')}</span></div></div><div className="workout-summary-item"><span className="workout-summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 8h8l2 12H6L8 8Zm2 0V5a2 2 0 0 1 4 0v3" strokeLinejoin="round"/></svg></span><div><strong>{number.format(summary.volume)} {t('kg')}</strong><span>{t('volume')}</span></div></div><div className="workout-summary-item"><span className="workout-summary-icon"><WorkoutIcon name="clock" /></span><div><strong>{elapsed}</strong><span>{t('workoutTime')}</span></div></div></div>
    </header>
    {rest !== null && <aside className="workout-rest"><div><WorkoutIcon name="clock" /><span>{t('rest')}</span><output aria-label={t('restTimer')}>{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}</output></div><button type="button" className="workout-text-button" onClick={() => setRest(null)}>{t(rest === 0 ? 'done' : 'skip')}</button></aside>}
    {error}
    <WorkoutViews key={selectedExerciseId ?? 'workout-views'} detail={detail} previousResults={previousResults} selectedExerciseId={selectedExerciseId} onAddExercise={() => setPickerOpen(true)} onAddSet={handleAddSet} onUpdateSet={handleUpdateSet} onDeleteSet={async (setId) => { await deleteSet(db, setId); await refresh() }} onRemoveExercise={async (exerciseId) => { await removeExerciseFromWorkout(db, workout.id, exerciseId); await refresh() }} onMoveExercise={async (exerciseId, order) => { await reorderWorkoutExercise(db, workout.id, exerciseId, order); await refresh() }} />
    <div className={`workout-bottom-actions${entries.length === 0 ? ' workout-bottom-actions-empty' : ''}`}>
      <button type="button" className="workout-button workout-add-exercise" disabled={pending} onClick={() => setPickerOpen(true)}><WorkoutIcon name="plus" />{t('addExercisePlain')}</button>
      <footer className="workout-session-footer"><button type="button" className="workout-button workout-button-primary" disabled={pending} onClick={() => setConfirm('finish')}><WorkoutIcon name="check" />{t('finishWorkout')}</button><button type="button" className="workout-button workout-button-danger" disabled={pending} onClick={() => setConfirm('discard')}><span className="workout-discard-icon"><WorkoutIcon name="remove" /></span>{t('discardWorkout')}</button></footer>
    </div>
    {pickerOpen && <ExercisePicker onPick={(exercise) => void handlePick(exercise)} onClose={() => setPickerOpen(false)} />}
    {confirm && <ConfirmAction title={t(confirm === 'discard' ? 'confirmDiscardWorkout' : 'finishWorkoutConfirm')} description={t(confirm === 'discard' ? 'discardDescription' : 'finishDescription').replace('{title}', workout.title)} confirmLabel={t(confirm === 'discard' ? 'discard' : 'finish')} onConfirm={closeWorkout} onClose={() => setConfirm(null)} />}
  </section>
}
