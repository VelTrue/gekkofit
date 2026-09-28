import { MasteryMedallion } from './MasteryMedallion'
import type { MasteryItem } from '../../data-layer/mastery'
import { masteryTierNames, masteryVisualTier } from './masteryTiers'
import { t } from '../../i18n/translations'

export function MasteryBadge({ item, lang, onSelect }: { item: MasteryItem; lang: 'ru' | 'en'; onSelect: (item: MasteryItem) => void }) {
  const { exercise, mastery } = item
  const name = lang === 'ru' ? exercise.name_ru : exercise.name_en
  const visualTier = masteryVisualTier(mastery.level)
  const tier = masteryTierNames[lang][visualTier]
  return <div className="mastery-badge" data-tier={visualTier}>
    <MasteryMedallion item={item} onActivate={() => onSelect(item)} activationLabel={`${name}, ${t(lang, 'levelLower')} ${mastery.level}, ${tier}`} />
    <button type="button" className="mastery-badge-name" onClick={() => onSelect(item)}>{name}</button>
  </div>
}
