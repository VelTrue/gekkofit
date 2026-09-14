import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HistoryCard } from '../components/history/HistoryCard'
import { HistoryDetail } from '../components/history/HistoryDetail'
import { historyItem, type HistoryItem } from '../components/history/historyModel'
import '../components/history/history.css'
import { WorkoutIcon } from '../components/workout/WorkoutIcon'
import { estimateOneRepMax } from '../data-layer/mastery'
import type { WorkoutDetail } from '../data-layer/workouts'
import { db, type Workout, type WorkoutSet } from '../db/schema'
import { useLang } from '../i18n/LangContext'
import { t as translate } from '../i18n/translations'

type Mode = 'list' | 'calendar'
const HISTORY_MARKER = 'workout-history-detail'

function dateKey(iso: string) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function loadHistoryItems(): Promise<HistoryItem[]> {
  const [allWorkouts, memberships, sets] = await Promise.all([db.workouts.toArray(), db.workoutExercises.toArray(), db.sets.toArray()])
  const workouts = allWorkouts.filter(({ finishedAt }) => finishedAt !== null).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const exerciseIds = [...new Set(memberships.map(({ exerciseId }) => exerciseId))]
  const exercises = await db.exercises.bulkGet(exerciseIds)
  const exerciseById = new Map(exerciseIds.flatMap((id, index) => exercises[index] ? [[id, exercises[index]!] as const] : []))
  const details = workouts.map<WorkoutDetail>((workout) => ({
    workout,
    entries: memberships.filter((row) => row.workoutId === workout.id).sort((a, b) => a.order - b.order).flatMap((workoutExercise) => {
      const exercise = exerciseById.get(workoutExercise.exerciseId)
      return exercise ? [{ workoutExercise, exercise, sets: sets.filter((set) => set.workoutId === workout.id && set.exerciseId === exercise.id).sort((a, b) => a.setOrder - b.setOrder) }] : []
    }),
  }))
  const recordsByWorkout = recordCounts(workouts, sets)
  return details.map((detail) => historyItem(detail, recordsByWorkout.get(detail.workout.id) ?? 0))
}

function recordCounts(workouts: Workout[], sets: WorkoutSet[]) {
  const completedIds = new Set(workouts.map(({ id }) => id))
  const order = new Map(workouts.slice().sort((a, b) => a.startedAt.localeCompare(b.startedAt)).map((workout, index) => [workout.id, index]))
  const best = new Map<number, { weight: number; oneRepMax: number }>(), counts = new Map<string, number>()
  sets.filter((set) => set.completed && completedIds.has(set.workoutId)).sort((a, b) => (order.get(a.workoutId)! - order.get(b.workoutId)!) || a.setOrder - b.setOrder).forEach((set) => {
    const previous = best.get(set.exerciseId) ?? { weight: 0, oneRepMax: 0 }, oneRepMax = estimateOneRepMax(set.weight, set.reps)
    if (set.weight > previous.weight || oneRepMax > previous.oneRepMax) counts.set(set.workoutId, (counts.get(set.workoutId) ?? 0) + 1)
    best.set(set.exerciseId, { weight: Math.max(previous.weight, set.weight), oneRepMax: Math.max(previous.oneRepMax, oneRepMax) })
  })
  return counts
}

function Calendar({ items, lang, monthOffset, selectedDate, onMonthOffset, onSelectDate, onSelect }: { items: HistoryItem[]; lang: 'ru' | 'en'; monthOffset: number; selectedDate: string | null; onMonthOffset: (offset: number) => void; onSelectDate: (date: string | null) => void; onSelect: (id: string, opener: HTMLButtonElement) => void }) {
  const initial = items[0] ? new Date(items[0].detail.workout.startedAt) : new Date()
  const base = new Date(initial.getFullYear(), initial.getMonth() + monthOffset, 1), year = base.getFullYear(), month = base.getMonth()
  const first = (new Date(year, month, 1).getDay() + 6) % 7
  const cells: Array<number | null> = [...Array(first).fill(null), ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => index + 1)]
  const byDate = useMemo(() => {
    const map = new Map<string, HistoryItem[]>()
    items.forEach((item) => { const key = dateKey(item.detail.workout.startedAt); map.set(key, [...(map.get(key) ?? []), item]) })
    return map
  }, [items])
  const weekdays = translate(lang, 'historyWeekdays').split(',')
  const selectedItems = selectedDate ? byDate.get(selectedDate) ?? [] : []
  return <div className="history-calendar"><div className="history-calendar-nav"><button type="button" aria-label={translate(lang, 'previousMonth')} onClick={() => { onSelectDate(null); onMonthOffset(monthOffset - 1) }}><WorkoutIcon name="back" /></button><strong>{base.toLocaleDateString(lang, { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label={translate(lang, 'nextMonth')} onClick={() => { onSelectDate(null); onMonthOffset(monthOffset + 1) }}><WorkoutIcon name="next" /></button></div><div className="history-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="history-days">{cells.map((day, index) => {
    if (day === null) return <span key={`blank-${index}`} />
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, dayItems = byDate.get(key) ?? []
    const label = new Date(year, month, day).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
    const countLabel = dayItems.length > 1 ? `, ${dayItems.length} ${translate(lang, 'workoutsCount')}` : ''
    return <button type="button" key={key} aria-label={`${label}${countLabel}`} aria-pressed={selectedDate === key} disabled={!dayItems.length} onClick={(event) => dayItems.length === 1 ? onSelect(dayItems[0].detail.workout.id, event.currentTarget) : onSelectDate(key)}>{day}</button>
  })}</div>{selectedItems.length > 1 && <section className="history-calendar-results" aria-label={translate(lang, 'selectedDayWorkouts')}>{selectedItems.map((item) => <HistoryCard key={item.detail.workout.id} item={item} lang={lang} onOpen={(source) => onSelect(item.detail.workout.id, source)} />)}</section>}</div>
}

export function HistoryScreen() {
  const { lang, t } = useLang()
  const [mode, setMode] = useState<Mode>('list'), [items, setItems] = useState<HistoryItem[]>([]), [selectedId, setSelectedId] = useState<string | null>(null), [selectedDate, setSelectedDate] = useState<string | null>(null), [monthOffset, setMonthOffset] = useState(0)
  const [loading, setLoading] = useState(true), [failed, setFailed] = useState(false)
  const opener = useRef<HTMLElement | null>(null), openerWorkoutId = useRef<string | null>(null)
  const load = useCallback(async () => { setFailed(false); try { setItems(await loadHistoryItems()) } catch { setFailed(true) } finally { setLoading(false) } }, [])
  useEffect(() => { void Promise.resolve().then(load) }, [load])
  useEffect(() => {
    const pop = () => { if (selectedId && history.state?.modal !== HISTORY_MARKER) { setSelectedId(null); requestAnimationFrame(() => { const replacement = openerWorkoutId.current ? document.querySelector<HTMLElement>(`[data-workout-id="${openerWorkoutId.current}"]`) : null; (replacement ?? opener.current)?.focus() }) } }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [selectedId])
  function open(id: string, source: HTMLElement) { opener.current = source; openerWorkoutId.current = id; history.pushState({ modal: HISTORY_MARKER }, ''); setSelectedId(id) }
  function close() { if (history.state?.modal === HISTORY_MARKER) history.back(); else { setSelectedId(null); requestAnimationFrame(() => opener.current?.focus()) } }
  const selected = items.find((item) => item.detail.workout.id === selectedId)
  if (selected) return <HistoryDetail initialDetail={selected.detail} backLabel={t(mode === 'calendar' ? 'historyBackCalendar' : 'historyBack')} onBack={close} onChange={(detail) => { setItems((current) => current.map((item) => item.detail.workout.id === detail.workout.id ? historyItem(detail, item.recordCount) : item)); void load() }} onDiscard={() => { setItems((current) => current.filter((item) => item.detail.workout.id !== selected.detail.workout.id)); setSelectedId(null) }} />
  return <section className="history-screen"><header className="history-header"><div><p className="history-eyebrow">{t('historyArchive')}</p><h1>{t('tabHistory')}</h1></div><div className="history-mode" aria-label={t('historyView')}><button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>{t('historyList')}</button><button type="button" aria-pressed={mode === 'calendar'} onClick={() => setMode('calendar')}>{t('historyCalendar')}</button></div></header>
    {loading ? <div role="status" className="history-empty">{t('historyLoading')}</div> : failed ? <div className="history-empty"><p role="alert">{t('historyLoadError')}</p><button type="button" className="workout-button" onClick={() => void load()}>{t('retry')}</button></div> : items.length === 0 ? <div className="history-empty">{t('historyEmpty')}</div> : mode === 'calendar' ? <Calendar items={items} lang={lang} monthOffset={monthOffset} selectedDate={selectedDate} onMonthOffset={setMonthOffset} onSelectDate={setSelectedDate} onSelect={open} /> : <div className="history-list">{items.map((item) => <HistoryCard key={item.detail.workout.id} item={item} lang={lang} onOpen={(source) => open(item.detail.workout.id, source)} />)}</div>}
  </section>
}
