import { useState } from 'react'
import type { WorkoutDetail } from '../../data-layer/workouts'
import { useLang } from '../../i18n/LangContext'
import { ExerciseCard, type WorkoutEditingActions } from './ExerciseCard'
import { ViewModeSwitch, type WorkoutViewMode } from './ViewModeSwitch'
import { WorkoutDialog } from './WorkoutDialog'
import { WorkoutNoteView } from './WorkoutNoteView'

export function WorkoutViews({ detail, previousResults, ...actions }: WorkoutEditingActions & {
  detail: WorkoutDetail; previousResults?: Record<number, string>
}) {
  const { lang } = useLang()
  const [mode, setMode] = useState<WorkoutViewMode>(() => {
    try { return localStorage.getItem('workout-view-mode') === 'list' ? 'list' : 'cards' }
    catch { return 'cards' }
  })
  const [selected, setSelected] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [focusSetId, setFocusSetId] = useState<string | undefined>()
  const entries = detail.entries
  const index = Math.max(0, entries.findIndex(({ exercise }) => exercise.id === selected))
  const entry = entries[index]

  function changeMode(next: WorkoutViewMode) {
    setMode(next)
    try { localStorage.setItem('workout-view-mode', next) } catch { /* The view still works when storage is unavailable. */ }
  }

  const card = entry && <ExerciseCard key={entry.exercise.id} entry={entry} index={index} total={entries.length} previousResult={previousResults?.[entry.exercise.id]} onPrevious={index > 0 ? () => setSelected(entries[index - 1].exercise.id) : undefined} onNext={index < entries.length - 1 ? () => setSelected(entries[index + 1].exercise.id) : undefined} {...actions} />

  return <div className="workout-views">
    <ViewModeSwitch value={mode} onChange={changeMode} />
    {entries.length === 0 ? <div className="workout-empty"><h2>{lang === 'ru' ? 'С чего начнём?' : 'Where shall we start?'}</h2><p>{lang === 'ru' ? 'Добавьте упражнение, затем запишите вес и повторы.' : 'Add an exercise, then log your weight and reps.'}</p></div> : <>
      <div hidden={mode !== 'cards'} className="workout-view-panel">
        {entries.length > 1 && <nav className="workout-quick-nav" aria-label={lang === 'ru' ? 'Упражнения тренировки' : 'Workout exercises'}>{entries.map(({ exercise }) => <button type="button" key={exercise.id} className="workout-button" aria-pressed={entry.exercise.id === exercise.id} onClick={() => setSelected(exercise.id)}>{lang === 'ru' ? exercise.name_ru : exercise.name_en}</button>)}</nav>}
        {!editing && card}
      </div>
      <div hidden={mode !== 'list'} className="workout-view-panel"><WorkoutNoteView detail={detail} onEdit={(exerciseId, setId) => { setSelected(exerciseId); setFocusSetId(setId); setEditing(true) }} /></div>
      {editing && entry && <WorkoutDialog title={lang === 'ru' ? 'Редактирование упражнения' : 'Edit exercise'} backLabel={lang === 'ru' ? 'Назад к списку' : 'Back to list'} focusSetId={focusSetId} onClose={() => setEditing(false)}>{card}</WorkoutDialog>}
    </>}
  </div>
}
