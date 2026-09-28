import { useEffect, useMemo, useState } from 'react'
import { MasteryDetailSheet } from '../components/mastery/MasteryDetailSheet'
import { MasteryGrid } from '../components/mastery/MasteryGrid'
import { ExerciseDetailSheet } from '../components/exercises/ExerciseDetailSheet'
import '../components/mastery/mastery.css'
import { type MasteryItem } from '../data-layer/mastery'
import { getMasteryCollection } from '../data-layer/exerciseHistory'
import { db } from '../db/schema'
import { useLang } from '../i18n/LangContext'
import { unlockedCount } from '../i18n/translations'

type Filter = 'unlocked' | 'all' | `level-${0 | 1 | 2 | 3 | 4 | 5}`

export function ProgressScreen() {
  const { lang, t } = useLang()
  const [items, setItems] = useState<MasteryItem[]>([])
  const [filter, setFilter] = useState<Filter>('unlocked')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<MasteryItem | null>(null)
  const [detailMode, setDetailMode] = useState<'mastery' | 'exercise'>('mastery')
  const [visibleCount, setVisibleCount] = useState(36)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  async function load() {
    setStatus('loading')
    try {
      setItems(await getMasteryCollection(db))
      setStatus('ready')
    } catch { setStatus('error') }
  }
  useEffect(() => {
    let active = true
    getMasteryCollection(db).then((collection) => {
      if (!active) return
      setItems(collection)
      setStatus('ready')
    }).catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [])
  const unlocked = useMemo(() => items.filter(({ mastery }) => mastery.level > 0), [items])
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(lang).replaceAll('ё', 'е')
    const source = filter.startsWith('level-') ? items.filter(({ mastery }) => Math.min(5, mastery.level) === Number(filter.slice(6))) : filter === 'unlocked' ? unlocked : items
    return source.filter(({ exercise }) => !normalized || [exercise.name_ru, exercise.name_en, ...exercise.aliases_ru].some((value) => value.toLocaleLowerCase(lang).replaceAll('ё', 'е').includes(normalized)))
  }, [filter, items, lang, query, unlocked])

  return <section className="mastery-screen">
    <header className="mastery-header"><div><p className="mastery-kicker">{t('collection')}</p><h1>{t('tabMastery')}</h1></div><p className="mastery-unlocked">{unlockedCount(lang, unlocked.length)}</p></header>
    <div className="mastery-tools">
      <label className="mastery-search"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(36) }} aria-label={t('exerciseSearch')} placeholder={t('findExercise')} /></label>
      <div className="mastery-filters" role="group" aria-label={t('collectionFilter')}><button type="button" aria-pressed={filter === 'unlocked'} onClick={() => setFilter('unlocked')}>{t('masteryUnlocked')}</button><button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{t('masteryAll')}</button></div>
      <label className="mastery-level-filter"><span>{t('masteryLevel')}</span><select value={filter.startsWith('level-') ? filter : ''} onChange={(event) => { setFilter((event.target.value || 'all') as Filter); setVisibleCount(36) }}><option value="">{t('allLevels')}</option>{[0, 1, 2, 3, 4, 5].map((level) => <option key={level} value={`level-${level}`}>{level === 5 ? '5+' : level}</option>)}</select></label>
    </div>
    {status === 'loading' && <div className="mastery-message" role="status">{t('collectionLoading')}</div>}
    {status === 'error' && <div className="mastery-message"><strong>{t('masteryLoadError')}</strong><button type="button" className="mastery-open" onClick={() => void load()}>{t('retry')}</button></div>}
    {status === 'ready' && visible.length > 0 && <><MasteryGrid items={visible.slice(0, visibleCount)} onSelect={(item) => { setSelected(item); setDetailMode('mastery') }} />{visible.length > visibleCount && <button type="button" className="mastery-open" onClick={() => setVisibleCount((count) => count + 36)}>{t('showMore')}</button>}</>}
    {status === 'ready' && visible.length === 0 && <div className="mastery-message"><strong>{query ? t('noMatches') : filter === 'unlocked' ? t('noUnlocked') : t('catalogEmpty')}</strong><span>{filter === 'unlocked' && !query ? t('unlockHint') : t('changeSearch')}</span></div>}
    {selected && detailMode === 'mastery' && <MasteryDetailSheet item={selected} onClose={() => setSelected(null)} onOpenExercise={() => setDetailMode('exercise')} />}
    {selected && detailMode === 'exercise' && <ExerciseDetailSheet exercise={selected.exercise} onClose={() => setSelected(null)} />}
  </section>
}
