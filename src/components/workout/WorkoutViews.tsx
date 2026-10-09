import { useState } from 'react'
import type { WorkoutDetail } from '../../data-layer/workouts'
import { useLang } from '../../i18n/LangContext'
import { ExerciseCard, type WorkoutEditingActions } from './ExerciseCard'
import { ViewModeSwitch, type WorkoutViewMode } from './ViewModeSwitch'
import { WorkoutDialog } from './WorkoutDialog'
import { WorkoutNoteView } from './WorkoutNoteView'
import { WorkoutIcon } from './WorkoutIcon'

export function WorkoutViews({ detail, previousResults, selectedExerciseId, ...actions }: WorkoutEditingActions & {
  detail: WorkoutDetail; previousResults?: Record<number, string>; selectedExerciseId?: number | null; onAddExercise?: () => void
}) {
  const { lang, t } = useLang()
  const [mode, setMode] = useState<WorkoutViewMode>(() => {
    try { return localStorage.getItem('workout-view-mode') === 'list' ? 'list' : 'cards' }
    catch { return 'cards' }
  })
  const [selected, setSelected] = useState<number | null>(selectedExerciseId ?? null)
  const [editing, setEditing] = useState(false)
  const [addedOpen, setAddedOpen] = useState(false)
  const [focusSetId, setFocusSetId] = useState<string | undefined>()
  const entries = detail.entries
  const onAddExercise = actions.onAddExercise
  const index = Math.max(0, entries.findIndex(({ exercise }) => exercise.id === selected))
  const entry = entries[index]
  function changeMode(next: WorkoutViewMode) {
    setMode(next)
    try { localStorage.setItem('workout-view-mode', next) } catch { /* The view still works when storage is unavailable. */ }
  }

  const card = entry && <ExerciseCard key={entry.exercise.id} entry={entry} index={index} total={entries.length} previousResult={previousResults?.[entry.exercise.id]} onPrevious={index > 0 ? () => setSelected(entries[index - 1].exercise.id) : undefined} onNext={index < entries.length - 1 ? () => setSelected(entries[index + 1].exercise.id) : undefined} {...actions} />

  return <div className={`workout-views${entries.length === 0 ? ' workout-views-empty' : ''}`}>
    <div className="workout-views-heading"><h2>{t('exercisesHeading')}</h2><ViewModeSwitch value={mode} onChange={changeMode} /></div>
    {entries.length === 0 ? <div className="workout-empty-layout"><div className="workout-empty"><div className="workout-empty-illustration" aria-hidden="true"><span className="workout-barbell-reference" /></div><div className="workout-empty-mobile-copy"><h2>{t('workoutEmptyTitle')}</h2><p>{t('workoutEmptyText')}</p></div><div className="workout-empty-desktop-copy"><h2>{t('firstExerciseTitle')}</h2><p>{t('firstExerciseText')}</p></div><button type="button" className="workout-button workout-button-primary workout-empty-cta" onClick={onAddExercise}><WorkoutIcon name="plus" />{t('addExercisePlain')}</button></div><aside className="workout-plan"><h3>{t('workoutPlan')}</h3><ol><li><span>1</span><div><strong>{t('planChooseTitle')}</strong><p>{t('planChooseText')}</p></div></li><li><span>2</span><div><strong>{t('planLogTitle')}</strong><p>{t('planLogText')}</p></div></li><li><span>3</span><div><strong>{t('planCompleteTitle')}</strong><p>{t('planCompleteText')}</p></div></li></ol></aside></div> : <>
      <div hidden={mode !== 'cards'} className="workout-view-panel">
        {entries.length > 1 && <button type="button" className="workout-button workout-added-button" onClick={() => setAddedOpen(true)}>{t('addedExercises')} <span>{entries.length}</span></button>}
        {!editing && card}
      </div>
      <div hidden={mode !== 'list'} className="workout-view-panel"><WorkoutNoteView detail={detail} onEdit={(exerciseId, setId) => { setSelected(exerciseId); setFocusSetId(setId); setEditing(true) }} /></div>
      {editing && entry && <WorkoutDialog title={t('editExercise')} backLabel={t('backToList')} focusSetId={focusSetId} onClose={() => setEditing(false)}>{card}</WorkoutDialog>}
      {addedOpen && <WorkoutDialog title={t('addedExercises')} onClose={() => setAddedOpen(false)}><nav className="workout-added-list" aria-label={t('workoutExercises')}>{entries.map(({ exercise }, order) => <button type="button" key={exercise.id} aria-current={entry.exercise.id === exercise.id} onClick={() => { setSelected(exercise.id); setAddedOpen(false) }}><span>{order + 1}</span>{lang === 'ru' ? exercise.name_ru : exercise.name_en}</button>)}</nav></WorkoutDialog>}
    </>}
  </div>
}
