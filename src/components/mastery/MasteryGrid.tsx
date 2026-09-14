import type { MasteryItem } from '../../data-layer/mastery'
import { useLang } from '../../i18n/LangContext'
import { MasteryBadge } from './MasteryBadge'
import './mastery.css'

export function MasteryGrid({ items, onSelect }: { items: MasteryItem[]; onSelect: (item: MasteryItem) => void }) {
  const { lang } = useLang()
  return <ul className="mastery-grid" aria-label={lang === 'ru' ? 'Коллекция мастерства' : 'Mastery collection'}>
    {items.map((item) => <li key={item.exercise.id}><MasteryBadge item={item} lang={lang} onSelect={onSelect} /></li>)}
  </ul>
}
