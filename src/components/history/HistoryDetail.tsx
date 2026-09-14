import { useState } from 'react'
import { addSet } from '../../data-layer/sets'
import { addExerciseToWorkout, deleteSet, discardWorkout, removeExerciseFromWorkout, renameWorkout, reorderWorkoutExercise, updateSet, type SetChanges } from '../../data-layer/workoutEditor'
import { getWorkoutDetail, type WorkoutDetail as WorkoutDetailData } from '../../data-layer/workouts'
import { summarizeWorkout } from '../../data-layer/workoutSummary'
import { db, type Exercise } from '../../db/schema'
import { useLang } from '../../i18n/LangContext'
import { ExercisePicker } from '../../screens/ExercisePicker'
import { WorkoutTitle } from '../workout/WorkoutTitle'
import { ConfirmAction } from '../workout/WorkoutDialog'
import { WorkoutIcon } from '../workout/WorkoutIcon'
import { WorkoutViews } from '../workout/WorkoutViews'
import '../workout/workout.css'
import './history.css'

export function HistoryDetail({ initialDetail, backLabel, onBack, onChange, onDiscard }: { initialDetail: WorkoutDetailData; backLabel: string; onBack: () => void; onChange: (detail: WorkoutDetailData) => void; onDiscard: () => void }) {
  const { lang } = useLang(), ru = lang === 'ru'
  const [detail, setDetail] = useState(initialDetail), [pickerOpen, setPickerOpen] = useState(false), [confirmDiscard, setConfirmDiscard] = useState(false)
  const summary = summarizeWorkout(detail), number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  async function refresh() { const next = await getWorkoutDetail(db, detail.workout.id); setDetail(next); onChange(next) }
  async function editSet(setId: string, changes: SetChanges) { await updateSet(db, setId, changes); await refresh() }
  async function pick(exercise: Exercise) { setPickerOpen(false); await addExerciseToWorkout(db, detail.workout.id, exercise.id); await refresh() }
  return <section className="history-detail"><button type="button" className="history-back" onClick={onBack}><WorkoutIcon name="back" />{backLabel}</button>
    <header className="history-detail-header"><p className="workout-caption">{ru ? 'Завершенная тренировка' : 'Completed workout'}</p><WorkoutTitle title={detail.workout.title} onSave={async (title) => { await renameWorkout(db, detail.workout.id, title); await refresh() }} /><div className="history-detail-stats"><span>{ru ? 'Подходы' : 'Sets'} <b>{summary.setCount}</b></span><span>{ru ? 'Повторы' : 'Reps'} <b>{summary.repetitionCount}</b></span><span>{ru ? 'Объем' : 'Volume'} <b>{number.format(summary.volume)} {ru ? 'кг' : 'kg'}</b></span></div></header>
    <WorkoutViews detail={detail} onAddSet={async (exerciseId) => { const last = detail.entries.find((entry) => entry.exercise.id === exerciseId)?.sets.at(-1); await addSet(db, detail.workout.id, exerciseId, last?.weight ?? 20, last?.reps ?? 8); await refresh() }} onUpdateSet={editSet} onDeleteSet={async (setId) => { await deleteSet(db, setId); await refresh() }} onRemoveExercise={async (exerciseId) => { await removeExerciseFromWorkout(db, detail.workout.id, exerciseId); await refresh() }} onMoveExercise={async (exerciseId, order) => { await reorderWorkoutExercise(db, detail.workout.id, exerciseId, order); await refresh() }} />
    <button type="button" className="workout-button history-add" onClick={() => setPickerOpen(true)}><WorkoutIcon name="plus" />{ru ? 'Добавить упражнение' : 'Add exercise'}</button><button type="button" className="workout-text-button workout-button-danger history-discard" onClick={() => setConfirmDiscard(true)}>{ru ? 'Удалить тренировку' : 'Delete workout'}</button>
    {pickerOpen && <ExercisePicker onPick={(exercise) => void pick(exercise)} onClose={() => setPickerOpen(false)} />}{confirmDiscard && <ConfirmAction title={ru ? 'Удалить тренировку?' : 'Delete workout?'} description={ru ? `«${detail.workout.title}» и все ее подходы будут удалены.` : `"${detail.workout.title}" and all its sets will be deleted.`} confirmLabel={ru ? 'Удалить' : 'Delete'} onConfirm={async () => { await discardWorkout(db, detail.workout.id); onDiscard() }} onClose={() => setConfirmDiscard(false)} />}
  </section>
}
