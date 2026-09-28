import type { MasteryItem } from '../../data-layer/mastery'
import { ExerciseVisual } from '../exercises/ExerciseVisual'
import { masteryVisualTier } from './masteryTiers'

/** Artwork is independent of the frame so exercise illustrations can change later. */
export function MasteryMedallion({ item, onActivate, activationLabel }: { item: MasteryItem; onActivate?: () => void; activationLabel?: string }) {
  const { exercise, mastery } = item
  return <ExerciseVisual exercise={exercise} size={160} onActivate={onActivate} activationLabel={activationLabel} frame={(art) => <span className="mastery-medallion" data-tier={masteryVisualTier(mastery.level)}>
    <span className="mastery-medallion-rim"><span className="mastery-medallion-face" /></span>
    <span className="mastery-medallion-art">{art}</span>
    <span className="mastery-level"><span>{mastery.level}</span></span>
  </span>} />
}
