import { formatWorkoutAsNote } from '../../data-layer/workoutSummary'
import type { WorkoutDetail } from '../../data-layer/workouts'
import { useLang } from '../../i18n/LangContext'
import { AnatomyMap } from '../anatomy/AnatomyMap'
import { anatomyLabel, validMuscles } from './exercisePresentation'
import { WorkoutIcon } from './WorkoutIcon'

export function WorkoutNoteView({ detail, onEdit }: { detail: WorkoutDetail; onEdit: (exerciseId: number, setId?: string) => void }) {
  const { lang } = useLang()
  const ru = lang === 'ru'
  const notes = formatWorkoutAsNote(detail, lang)
  return <div className="workout-note">
    <p className="workout-caption workout-note-hint">{ru ? 'Выберите упражнение или подход для редактирования' : 'Select an exercise or set to edit'}</p>
    {detail.entries.map(({ exercise, sets }) => {
      const title = ru ? exercise.name_ru : exercise.name_en
      const note = notes.find((item) => item.exerciseId === exercise.id)
      let completedIndex = 0
      return <article key={exercise.id} className="workout-note-exercise">
        <div className="workout-note-identity"><AnatomyMap primary={validMuscles(exercise.primary_muscles)} secondary={validMuscles(exercise.secondary_muscles)} view={exercise.preferred_body_view} size="sm" label={anatomyLabel(exercise, lang)} />
          <h2><button type="button" className="workout-note-name" aria-label={`${ru ? 'Редактировать упражнение' : 'Edit exercise'} ${title}`} onClick={() => onEdit(exercise.id)}>{title}<WorkoutIcon name="edit" /></button></h2>
        </div>
        <div className="workout-note-sets">{sets.map((set) => {
          const formatted = set.completed ? note?.sets[completedIndex++] : `${new Intl.NumberFormat(lang).format(set.weight)} ${ru ? 'кг' : 'kg'} × ${set.reps}`
          return <button type="button" key={set.id} className="workout-note-chip" data-completed={set.completed} aria-label={`${ru ? 'Редактировать подход' : 'Edit set'} ${set.setOrder + 1}: ${formatted}${set.completed ? '' : ru ? ', не выполнен' : ', incomplete'}`} onClick={() => onEdit(exercise.id, set.id)}>{set.completed && <WorkoutIcon name="check" />}<span>{formatted}</span>{!set.completed && <small>{ru ? 'Не выполнен' : 'Incomplete'}</small>}</button>
        })}{sets.length === 0 && <button type="button" className="workout-button" onClick={() => onEdit(exercise.id)}><WorkoutIcon name="plus" />{ru ? 'Первый подход' : 'First set'}</button>}</div>
      </article>
    })}
  </div>
}
