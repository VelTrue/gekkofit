import { memo } from 'react'
import type { Exercise } from '../../db/schema'
import { anatomyLabel, equipmentName, muscleNames, validMuscles } from '../../data-layer/exerciseLabels'
import { useLang } from '../../i18n/LangContext'
import { AnatomyMap } from '../anatomy/AnatomyMap'
import { WorkoutIcon } from '../workout/WorkoutIcon'

export const ExerciseListItem = memo(function ExerciseListItem({ exercise, onPick, onInfo }: {
  exercise: Exercise; onPick: (exercise: Exercise) => void; onInfo: (exercise: Exercise) => void
}) {
  const { lang } = useLang()
  const name = lang === 'ru' ? exercise.name_ru : exercise.name_en
  return <li className="exercise-list-item" data-exercise-id={exercise.id}>
    <button type="button" className="exercise-select" onClick={() => onPick(exercise)} aria-label={`${lang === 'ru' ? 'Добавить' : 'Add'} ${name}`}>
      <span className="exercise-thumbnail"><AnatomyMap primary={validMuscles(exercise.primary_muscles)} secondary={validMuscles(exercise.secondary_muscles)} view={exercise.preferred_body_view} size="sm" label={anatomyLabel(exercise, lang)} /></span>
      <span className="exercise-identity"><strong>{name}</strong><span className="exercise-metadata"><span>{equipmentName(exercise.equipment, lang)}</span><span>{muscleNames(exercise.primary_muscles, lang)}</span></span></span>
      <span className="exercise-add-icon"><WorkoutIcon name="plus" /></span>
    </button>
    <button type="button" className="exercise-info" onClick={() => onInfo(exercise)} aria-label={`${lang === 'ru' ? 'Об упражнении' : 'About'} ${name}`}><WorkoutIcon name="info" /></button>
  </li>
})
