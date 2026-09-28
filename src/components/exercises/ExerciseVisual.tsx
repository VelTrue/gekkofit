import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import type { Exercise } from '../../db/schema'
import { anatomyLabel, validMuscles } from '../../data-layer/exerciseLabels'
import { useLang } from '../../i18n/LangContext'
import { AnatomyMap } from '../anatomy/AnatomyMap'
import { exerciseArtwork } from '../mastery/exerciseArtwork'
import { WorkoutIcon } from '../workout/WorkoutIcon'
import './exerciseVisual.css'

interface Props {
  exercise: Exercise
  size?: number
  bothViews?: boolean
  frame?: (art: ReactNode) => ReactNode
  onActivate?: () => void
  activationLabel?: string
}

export function ExerciseVisual(props: Props) {
  return <Visual key={props.exercise.slug} {...props} />
}

function Visual({ exercise, size = 88, bothViews = false, frame, onActivate, activationLabel }: Props) {
  const { lang, t } = useLang()
  const [muscles, setMuscles] = useState(false)
  const [failed, setFailed] = useState(false)
  const source = exerciseArtwork(exercise.slug)
  const hasArtwork = Boolean(source) && !failed
  const showIllustration = hasArtwork && !muscles
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null)
  const suppressClick = useRef(false)
  const name = lang === 'ru' ? exercise.name_ru : exercise.name_en

  function pointerDown(event: PointerEvent<HTMLElement>) {
    suppressClick.current = false
    if (!hasArtwork || event.button !== 0 || event.isPrimary === false) return
    gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function pointerUp(event: PointerEvent<HTMLElement>) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    gesture.current = null
    const dx = Math.abs(event.clientX - start.x), dy = Math.abs(event.clientY - start.y)
    suppressClick.current = dx > 10 || dy > 10
    if (dx >= 28 && dx > dy * 1.3) setMuscles((value) => !value)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const art = showIllustration
    ? <img className="exercise-visual-image" src={source} alt={name} width="512" height="512" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
    : <AnatomyMap primary={validMuscles(exercise.primary_muscles)} secondary={validMuscles(exercise.secondary_muscles)} view={bothViews ? 'both' : exercise.preferred_body_view} size={size} label={anatomyLabel(exercise, lang)} />
  const Media = onActivate ? 'button' : 'div'
  return <div className={`exercise-visual${frame ? ' exercise-visual-framed' : ''}`} style={{ '--visual-size': `${size}px` } as CSSProperties}>
    <Media type={onActivate ? 'button' : undefined} className="exercise-visual-media" data-illustrated={showIllustration} aria-label={onActivate ? activationLabel : undefined}
      onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { gesture.current = null; suppressClick.current = true }}
      onClick={(event) => {
        if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; return }
        onActivate?.()
      }}
      onKeyDown={(event) => {
        if (hasArtwork && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { event.preventDefault(); setMuscles((value) => !value) }
        if (event.key === 'Enter' || event.key === ' ') suppressClick.current = false
      }}>
      {frame ? frame(art) : art}
    </Media>
    {hasArtwork && <button type="button" className="exercise-visual-toggle" aria-label={`${showIllustration ? t('showMuscleMap') : t('showIllustration')}: ${name}`} onClick={() => setMuscles((value) => !value)}>
      <WorkoutIcon name="back" /><span className="exercise-visual-dot" data-active={showIllustration} /><span className="exercise-visual-dot" data-active={!showIllustration} /><WorkoutIcon name="next" />
    </button>}
    {bothViews && !showIllustration && <div className="exercise-body-labels"><span>{t('front')}</span><span>{t('backView')}</span></div>}
  </div>
}
