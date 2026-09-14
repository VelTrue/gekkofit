import { useEffect, useMemo, useState } from 'react'
import { MasteryDetailSheet } from '../components/mastery/MasteryDetailSheet'
import { MasteryGrid } from '../components/mastery/MasteryGrid'
import { ExerciseDetailSheet } from '../components/exercises/ExerciseDetailSheet'
import '../components/mastery/mastery.css'
import { calculateExerciseMastery, type MasteryItem } from '../data-layer/mastery'
import { db } from '../db/schema'
import { useLang } from '../i18n/LangContext'

type Filter = 'unlocked' | 'all'

function unlockedLabel(count: number, lang: 'ru' | 'en') {
  if (lang === 'en') return `${count} ${count === 1 ? 'exercise' : 'exercises'} unlocked`
  const mod10 = count % 10, mod100 = count % 100
  const noun = mod10 === 1 && mod100 !== 11 ? 'упражнение' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'упражнения' : 'упражнений'
  return `${count} ${noun} открыто`
}

export function ProgressScreen() {
  const { lang } = useLang()
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
      const [exercises, workouts, sets] = await Promise.all([db.exercises.toArray(), db.workouts.toArray(), db.sets.toArray()])
      setItems(exercises.map((exercise) => ({ exercise, mastery: calculateExerciseMastery(workouts, sets, exercise.id) })))
      setStatus('ready')
    } catch { setStatus('error') }
  }
  useEffect(() => {
    let active = true
    Promise.all([db.exercises.toArray(), db.workouts.toArray(), db.sets.toArray()]).then(([exercises, workouts, sets]) => {
      if (!active) return
      setItems(exercises.map((exercise) => ({ exercise, mastery: calculateExerciseMastery(workouts, sets, exercise.id) })))
      setStatus('ready')
    }).catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [])
  const unlocked = useMemo(() => items.filter(({ mastery }) => mastery.level > 0), [items])
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(lang).replaceAll('ё', 'е')
    return (filter === 'unlocked' ? unlocked : items).filter(({ exercise }) => !normalized || [exercise.name_ru, exercise.name_en, ...exercise.aliases_ru].some((value) => value.toLocaleLowerCase(lang).replaceAll('ё', 'е').includes(normalized)))
  }, [filter, items, lang, query, unlocked])

  return <section className="mastery-screen">
    <header className="mastery-header"><div><p className="mastery-kicker">{lang === 'ru' ? 'Коллекция' : 'Collection'}</p><h1>{lang === 'ru' ? 'Мастерство' : 'Mastery'}</h1></div><p className="mastery-unlocked">{unlockedLabel(unlocked.length, lang)}</p></header>
    <div className="mastery-tools">
      <label className="mastery-search"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(36) }} aria-label={lang === 'ru' ? 'Поиск упражнений' : 'Search exercises'} placeholder={lang === 'ru' ? 'Найти упражнение' : 'Find exercise'} /></label>
      <div className="mastery-filters" role="group" aria-label={lang === 'ru' ? 'Фильтр коллекции' : 'Collection filter'}><button type="button" aria-pressed={filter === 'unlocked'} onClick={() => setFilter('unlocked')}>{lang === 'ru' ? 'Открытые' : 'Unlocked'}</button><button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{lang === 'ru' ? 'Все упражнения' : 'All exercises'}</button></div>
    </div>
    {status === 'loading' && <div className="mastery-message" role="status">{lang === 'ru' ? 'Собираем коллекцию…' : 'Building collection…'}</div>}
    {status === 'error' && <div className="mastery-message"><strong>{lang === 'ru' ? 'Не удалось загрузить мастерство' : 'Could not load mastery'}</strong><button type="button" className="mastery-open" onClick={() => void load()}>{lang === 'ru' ? 'Повторить' : 'Retry'}</button></div>}
    {status === 'ready' && visible.length > 0 && <><MasteryGrid items={visible.slice(0, visibleCount)} onSelect={(item) => { setSelected(item); setDetailMode('mastery') }} />{visible.length > visibleCount && <button type="button" className="mastery-open" onClick={() => setVisibleCount((count) => count + 36)}>{lang === 'ru' ? 'Показать еще' : 'Show more'}</button>}</>}
    {status === 'ready' && visible.length === 0 && <div className="mastery-message"><strong>{query ? (lang === 'ru' ? 'Ничего не найдено' : 'No matches') : filter === 'unlocked' ? (lang === 'ru' ? 'Пока нет открытых упражнений' : 'No unlocked exercises yet') : (lang === 'ru' ? 'Каталог пуст' : 'Catalog is empty')}</strong><span>{filter === 'unlocked' && !query ? (lang === 'ru' ? 'Завершите первый рабочий подход, чтобы открыть жетон.' : 'Complete your first working set to unlock a badge.') : (lang === 'ru' ? 'Измените поиск или фильтр.' : 'Change the search or filter.')}</span></div>}
    {selected && detailMode === 'mastery' && <MasteryDetailSheet item={selected} onClose={() => setSelected(null)} onOpenExercise={() => setDetailMode('exercise')} />}
    {selected && detailMode === 'exercise' && <ExerciseDetailSheet exercise={selected.exercise} onClose={() => setSelected(null)} />}
  </section>
}
