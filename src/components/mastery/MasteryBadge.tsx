import { AnatomyMap } from '../anatomy/AnatomyMap'
import type { MasteryItem } from '../../data-layer/mastery'
import type { MuscleId } from '../../db/catalogValidation'
import { masteryTierNames, masteryVisualTier } from './masteryTiers'
import { t } from '../../i18n/translations'

export function MasteryBadge({ item, lang, onSelect }: { item: MasteryItem; lang: 'ru' | 'en'; onSelect: (item: MasteryItem) => void }) {
  const { exercise, mastery } = item
  const name = lang === 'ru' ? exercise.name_ru : exercise.name_en
  const visualTier = masteryVisualTier(mastery.level)
  const tier = masteryTierNames[lang][visualTier]
  return <button type="button" className="mastery-badge" data-tier={visualTier} aria-label={`${name}, ${t(lang, 'levelLower')} ${mastery.level}, ${tier}`} onClick={() => onSelect(item)}>
    <span className="mastery-badge-frame" aria-hidden="true"><span className="mastery-badge-notch" /></span>
    <span className="mastery-badge-map"><AnatomyMap primary={exercise.primary_muscles as MuscleId[]} secondary={exercise.secondary_muscles as MuscleId[]} view={exercise.preferred_body_view} size={112} label={name} /></span>
    <span className="mastery-level" aria-hidden="true">{mastery.level}</span>
    <span className="mastery-badge-name">{name}</span>
    <span className="mastery-badge-tier">{tier}</span>
  </button>
}
