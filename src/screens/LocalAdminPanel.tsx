import { useEffect, useMemo, useState } from 'react'
import { clearAllMastery, clearMasteryForExercises, MAX_ADMIN_POINTS, pointsForMasteryLevel, resetMasteryPoints, setMasteryPoints } from '../data-layer/admin'
import { getMasteryCollection } from '../data-layer/exerciseHistory'
import { rankExercises } from '../data-layer/exercises'
import { masteryLevel, type MasteryItem } from '../data-layer/mastery'
import { db } from '../db/schema'
import { useLang } from '../i18n/LangContext'

const fieldClass = 'mt-2 min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)]'
const buttonClass = 'min-h-12 rounded-xl border border-[var(--color-border)] px-4 font-bold transition-colors hover:bg-[var(--color-state-hover)] disabled:opacity-50'

export function LocalAdminPanel() {
  const [open, setOpen] = useState(false)
  return <section className="mt-8 border-t border-[var(--color-border)] pt-6">
    <button type="button" className={buttonClass} aria-expanded={open} aria-controls="local-admin" onClick={() => setOpen(!open)}>Админ-панель (локальная)</button>
    {open && <div id="local-admin" className="mt-4"><AdminEditor /></div>}
  </section>
}

function AdminEditor() {
  const { lang } = useLang()
  const [items, setItems] = useState<MasteryItem[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [points, setPoints] = useState('0')
  const [level, setLevel] = useState('0')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const selected = items.find(({ exercise }) => exercise.id === selectedId)
  const results = useMemo(() => rankExercises(items.map(({ exercise }) => exercise), query), [items, query])

  async function load() {
    setLoading(true)
    setError('')
    try { setItems(await getMasteryCollection(db)) }
    catch { setError('Не удалось загрузить упражнения. Попробуйте ещё раз.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    getMasteryCollection(db).then((collection) => { if (active) setItems(collection) })
      .catch(() => { if (active) setError('Не удалось загрузить упражнения. Попробуйте ещё раз.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function choose(id: number) {
    const item = items.find(({ exercise }) => exercise.id === id)
    setSelectedId(item ? id : null)
    setPoints(String(item?.mastery.points ?? 0))
    setLevel(String(item?.mastery.level ?? 0))
    setError('')
    setNotice('')
  }

  async function save(reset = false) {
    if (!selected || busy) return
    if (!reset && (points.trim() === '' || !Number.isSafeInteger(Number(points)) || Number(points) < 0 || Number(points) > MAX_ADMIN_POINTS || level.trim() === '')) {
      setError('Укажите целое число очков от 0 до 1 000 000 и корректный уровень.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (reset) await resetMasteryPoints(db, selected.exercise.id)
      else await setMasteryPoints(db, selected.exercise.id, Number(points))
      const collection = await getMasteryCollection(db)
      setItems(collection)
      const updated = collection.find(({ exercise }) => exercise.id === selected.exercise.id)!
      setPoints(String(updated.mastery.points))
      setLevel(String(updated.mastery.level))
      setNotice(reset ? 'Автоматический расчёт восстановлен.' : 'Сохранено. Результат доступен во вкладке «Мастерство».')
    } catch { setError('Не удалось сохранить изменения. Попробуйте ещё раз.') }
    finally { setBusy(false) }
  }

  async function clearMastery(scope: 'selected' | 'all') {
    if (busy || (scope === 'selected' && !selected)) return
    const label = scope === 'all' ? 'всех упражнений' : `«${lang === 'ru' ? selected!.exercise.name_ru : selected!.exercise.name_en}»`
    if (!window.confirm(`Обнулить мастерство ${label}? История тренировок сохранится.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (scope === 'all') await clearAllMastery(db)
      else await clearMasteryForExercises(db, [selected!.exercise.id])
      const collection = await getMasteryCollection(db)
      setItems(collection)
      if (selected) {
        const updated = collection.find(({ exercise }) => exercise.id === selected.exercise.id)!
        setPoints(String(updated.mastery.points)); setLevel(String(updated.mastery.level))
      }
      setNotice(scope === 'all' ? 'Мастерство всех упражнений обнулено. История сохранена.' : 'Мастерство выбранного упражнения обнулено.')
    } catch { setError('Не удалось обнулить мастерство. Попробуйте ещё раз.') }
    finally { setBusy(false) }
  }

  return <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
    <div><h2 className="text-xl font-bold">Управление мастерством</h2><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">Только для локальной разработки. Изменения сохраняются в этом браузере. Новые тренировки продолжают добавлять очки. История подходов и рекорды сохраняются.</p></div>
    {loading ? <p role="status">Загрузка…</p> : <>
      <label className="block">Поиск упражнения<input type="search" className={fieldClass} value={query} disabled={busy} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className="block">Упражнение<select className={fieldClass} value={selectedId ?? ''} disabled={busy} onChange={(event) => choose(Number(event.target.value))}>
        <option value="">Выберите упражнение</option>
        {selected && !results.some(({ id }) => id === selectedId) && <option value={selectedId!}>{lang === 'ru' ? selected.exercise.name_ru : selected.exercise.name_en}</option>}
        {results.map((exercise) => <option key={exercise.id} value={exercise.id}>{lang === 'ru' ? exercise.name_ru : exercise.name_en}</option>)}
      </select></label>
      {results.length === 0 && <p>Упражнения не найдены.</p>}
      {selected && <form onSubmit={(event) => { event.preventDefault(); void save() }}>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">Сохранено: уровень {selected.mastery.level}, {selected.mastery.points} очков.</p>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          <label>Уровень<input type="number" min="0" max={masteryLevel(MAX_ADMIN_POINTS).level} step="1" required className={fieldClass} value={level} onChange={(event) => {
            const value = event.target.value
            setLevel(value); setNotice('')
            try { setPoints(value === '' ? '' : String(pointsForMasteryLevel(Number(value)))); setError('') }
            catch { setPoints(''); setError('Введите допустимый целый уровень.') }
          }} /></label>
          <label>Очки мастерства<input type="number" min="0" max={MAX_ADMIN_POINTS} step="1" required className={fieldClass} value={points} onChange={(event) => {
            setPoints(event.target.value); setLevel(event.target.value === '' ? '' : String(masteryLevel(Number(event.target.value)).level)); setNotice(''); setError('')
          }} /></label>
        </fieldset>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">Выбор уровня задаёт его минимальное число очков. Очки можно уточнить вручную.</p>
        <div className="mt-5 flex flex-wrap gap-3"><button type="submit" disabled={busy} className={`${buttonClass} bg-[var(--color-accent-fill)] text-[var(--color-accent-text)]`}>{busy ? 'Сохранение…' : 'Сохранить мастерство'}</button><button type="button" disabled={busy} className={buttonClass} onClick={() => void save(true)}>Вернуть автоматический расчёт</button></div>
      </form>}
      <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-5"><button type="button" disabled={busy || !selected} className={`${buttonClass} text-[var(--color-danger)]`} onClick={() => void clearMastery('selected')}>Обнулить выбранное</button><button type="button" disabled={busy} className={`${buttonClass} text-[var(--color-danger)]`} onClick={() => void clearMastery('all')}>Обнулить всё мастерство</button></div>
    </>}
    {error && <div role="alert"><p>{error}</p>{items.length === 0 && <button type="button" className={buttonClass} onClick={() => void load()}>Повторить</button>}</div>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </div>
}
