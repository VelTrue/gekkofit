import { memo, useId, useState } from 'react'
import type { Exercise } from '../../db/schema'
import { equipmentName, muscleNames } from '../../data-layer/exerciseLabels'
import { useLang } from '../../i18n/LangContext'
import { ExerciseVisual } from './ExerciseVisual'
import { WorkoutIcon } from '../workout/WorkoutIcon'

export const ExerciseListItem = memo(function ExerciseListItem({ exercise, alternatives = [], onPick, onInfo }: {
  exercise: Exercise; alternatives?: Exercise[]; onPick: (exercise: Exercise) => void; onInfo: (exercise: Exercise) => void
}) {
  const { lang, t } = useLang()
  const [alternativesOpen, setAlternativesOpen] = useState(false)
  const alternativesId = useId()
  const name = lang === 'ru' ? exercise.name_ru : exercise.name_en
  return <li className="exercise-list-item" data-exercise-id={exercise.id}>
    <div className="exercise-thumbnail"><ExerciseVisual exercise={exercise} size={88} /></div>
    <button type="button" className="exercise-select" onClick={() => onPick(exercise)} aria-label={`${t('add')} ${name}`}>
      <span className="exercise-identity"><strong>{name}</strong><span className="exercise-metadata"><span>{equipmentName(exercise.equipment, lang)}</span><span>{muscleNames(exercise.primary_muscles, lang)}</span></span></span>
      <span className="exercise-add-icon"><WorkoutIcon name="plus" /></span>
    </button>
    <div className="exercise-row-actions">
      {alternatives.length > 0 && <div className="exercise-alternatives" onMouseEnter={() => setAlternativesOpen(true)} onMouseLeave={() => setAlternativesOpen(false)} onFocus={() => setAlternativesOpen(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setAlternativesOpen(false) }}>
        <button type="button" className="exercise-help" aria-expanded={alternativesOpen} aria-controls={alternativesId} aria-label={`${t('alternativesFor')} ${name}`} onClick={() => setAlternativesOpen((value) => !value)}><span aria-hidden="true">?</span></button>
        {alternativesOpen && <div id={alternativesId} className="exercise-alternative-popover" role="dialog" aria-label={`${t('alternativesFor')} ${name}`}><strong>{t('ifEquipmentBusy')}</strong><ul>{alternatives.map((alternative) => <li key={alternative.id}><button type="button" onClick={() => onPick(alternative)}>{lang === 'ru' ? alternative.name_ru : alternative.name_en}<span>{equipmentName(alternative.equipment, lang)}</span></button></li>)}</ul></div>}
      </div>}
      <button type="button" className="exercise-info" onClick={() => onInfo(exercise)} aria-label={`${t('about')} ${name}`}><WorkoutIcon name="info" /></button>
    </div>
  </li>
})
