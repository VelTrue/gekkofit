import { useCallback, useEffect, useState } from 'react'
import { Stepper } from '../components/Stepper'
import { addSet, getLastSetForExercise, getWorkoutExercisesWithSets } from '../data-layer/sets'
import { finishWorkout, getActiveWorkout, getWorkoutHistory, startWorkout } from '../data-layer/workouts'
import { db, type Exercise, type Workout, type WorkoutSet } from '../db/schema'
import { useLang } from '../i18n/LangContext'
import { ExercisePicker } from './ExercisePicker'

const REST_SECONDS = 90
type Entry = { exercise: Exercise; sets: WorkoutSet[] }

export function HomeScreen() {
  const { lang, t } = useLang()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draft, setDraft] = useState<Record<number, { weight: number; reps: number }>>({})
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)

  const refreshEntries = useCallback(async (workoutId: string) => {
    setEntries(await getWorkoutExercisesWithSets(db, workoutId))
  }, [])

  useEffect(() => {
    void (async () => {
      const active = await getActiveWorkout(db)
      setWorkout(active ?? null)
      if (active) await refreshEntries(active.id)
      else setRecentWorkouts((await getWorkoutHistory(db)).slice(0, 4))
    })()
  }, [refreshEntries])

  useEffect(() => {
    if (restSecondsLeft === null || restSecondsLeft <= 0) return
    const timer = window.setTimeout(() => setRestSecondsLeft((seconds) => (seconds ?? 1) - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [restSecondsLeft])

  async function handleStart() {
    if (starting) return
    setStarting(true)
    try {
      const nextWorkout = await startWorkout(db)
      setWorkout(nextWorkout)
      setEntries([])
    } finally {
      setStarting(false)
    }
  }

  async function handleFinish() {
    if (!workout) return
    await finishWorkout(db, workout.id)
    setWorkout(null)
    setEntries([])
    setRestSecondsLeft(null)
    setRecentWorkouts((await getWorkoutHistory(db)).slice(0, 4))
  }

  async function handlePickExercise(exercise: Exercise) {
    setPickerOpen(false)
    const lastSet = await getLastSetForExercise(db, exercise.id)
    setDraft((current) => ({ ...current, [exercise.id]: { weight: lastSet?.weight ?? 20, reps: lastSet?.reps ?? 8 } }))
    setEntries((current) => current.some(({ exercise: item }) => item.id === exercise.id) ? current : [...current, { exercise, sets: [] }])
  }

  async function handleSetDone(exercise: Exercise) {
    if (!workout) return
    const values = draft[exercise.id] ?? { weight: 20, reps: 8 }
    await addSet(db, workout.id, exercise.id, values.weight, values.reps)
    await refreshEntries(workout.id)
    setRestSecondsLeft(REST_SECONDS)
  }

  if (!workout) return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">Workout log / 01</p>
      <h1 className="max-w-md text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">{lang === 'ru' ? 'Сегодня — хороший день стать сильнее.' : 'A good day to get stronger.'}</h1>
      <button type="button" disabled={starting} onClick={handleStart} className="mt-9 min-h-14 rounded-2xl bg-[var(--color-accent)] px-7 text-base font-black text-[#071006] shadow-[0_0_40px_rgba(124,255,107,.15)] transition-transform active:scale-[.98] disabled:cursor-wait disabled:opacity-60">{t('startWorkout')}</button>
      <p className="mt-3 text-center text-sm text-[var(--color-text-muted)]">{t('emptyHomeHint')}</p>
      {recentWorkouts.length > 0 && <div className="mt-10 border-t border-[var(--color-border)] pt-5"><p className="mb-3 text-xs uppercase tracking-widest text-[var(--color-text-muted)]">{t('recent')}</p><ul className="space-y-2">{recentWorkouts.map((item) => <li key={item.id} className="flex justify-between rounded-xl bg-[var(--color-surface)] px-4 py-3 text-sm"><span>{new Date(item.startedAt).toLocaleDateString(lang)}</span><span className="text-[var(--color-text-muted)]">✓</span></li>)}</ul></div>}
    </section>
  )

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between border-b border-[var(--color-border)] pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">Live session</p><h1 className="mt-1 text-3xl font-black">{t('tabWorkout')}</h1></div>{restSecondsLeft !== null && <div className="text-right"><p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Rest</p><p className="text-3xl font-black tabular-nums text-[var(--color-accent)]">{restSecondsLeft}s</p></div>}</header>
      {entries.map(({ exercise, sets }, index) => {
        const values = draft[exercise.id] ?? { weight: 20, reps: 8 }
        return <article key={exercise.id} className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]"><div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-4"><span className="text-xs font-black text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span><h2 className="font-bold">{lang === 'ru' ? exercise.name_ru : exercise.name_en}</h2><span className="ml-auto text-xs text-[var(--color-text-muted)]">{sets.length} sets</span></div><ul className="px-4 pt-3">{sets.map((set) => <li key={set.id} className="grid grid-cols-[32px_1fr] border-b border-white/5 py-2 text-sm"><span className="text-[var(--color-text-muted)]">{set.setOrder + 1}</span><strong className="tabular-nums">{set.weight} kg × {set.reps}</strong></li>)}</ul><div className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_56px] lg:items-end"><label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">kg<Stepper value={values.weight} step={2.5} onChange={(weight) => setDraft((current) => ({ ...current, [exercise.id]: { weight, reps: current[exercise.id]?.reps ?? 8 } }))} /></label><label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">reps<Stepper value={values.reps} step={1} onChange={(reps) => setDraft((current) => ({ ...current, [exercise.id]: { weight: current[exercise.id]?.weight ?? 20, reps } }))} /></label><button type="button" aria-label={t('setDone')} onClick={() => handleSetDone(exercise)} className="min-h-14 rounded-2xl bg-[var(--color-accent)] text-2xl font-black text-[#071006] active:scale-95">✓</button></div></article>
      })}
      <button type="button" onClick={() => setPickerOpen(true)} className="min-h-14 w-full rounded-2xl border border-dashed border-[var(--color-border)] font-bold text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-white">{t('addExercise')}</button>
      <button type="button" onClick={handleFinish} className="min-h-12 w-full rounded-2xl bg-white/5 font-bold hover:bg-white/10">{t('finishWorkout')}</button>
      {pickerOpen && <ExercisePicker onPick={handlePickExercise} onClose={() => setPickerOpen(false)} />}
    </section>
  )
}
