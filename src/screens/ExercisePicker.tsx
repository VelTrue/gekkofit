import { useEffect, useMemo, useState } from 'react'
import { getAllExercises, getRecentExercises, groupExercisesByMuscleGroup, searchExercises } from '../data-layer/exercises'
import { db, type Exercise } from '../db/schema'
import { useLang } from '../i18n/LangContext'

export function ExercisePicker({ onPick, onClose }: { onPick: (exercise: Exercise) => void; onClose: () => void }) {
  const { lang, t } = useLang()
  const [recent, setRecent] = useState<Exercise[]>([])
  const [all, setAll] = useState<Exercise[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Exercise[]>([])

  useEffect(() => {
    void Promise.all([getRecentExercises(db), getAllExercises(db)]).then(([recentExercises, allExercises]) => {
      setRecent(recentExercises)
      setAll(allExercises)
    })
  }, [])

  useEffect(() => {
    let current = true
    if (!query.trim()) return
    void searchExercises(db, query).then((matches) => current && setResults(matches))
    return () => { current = false }
  }, [query])

  const tree = useMemo(() => groupExercisesByMuscleGroup(all), [all])
  const isSearching = query.trim().length > 0
  const name = (exercise: Exercise) => lang === 'ru' ? exercise.name_ru : exercise.name_en
  const exerciseButton = (exercise: Exercise) => (
    <button key={exercise.id} type="button" onClick={() => onPick(exercise)} className="grid min-h-14 w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-3 text-left transition-colors duration-200 hover:bg-[var(--color-state-hover)] active:bg-[var(--color-state-pressed)]">
      <span className="font-semibold">{name(exercise)}</span>
      <span className="max-w-28 text-right text-xs text-[var(--color-text-muted)]">{exercise.equipment}</span>
    </button>
  )

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 overflow-y-auto bg-[var(--color-bg)]">
      <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-nav)] px-4 pb-4 pt-[max(16px,var(--safe-area-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button type="button" onClick={onClose} aria-label="Close" className="h-11 w-11 rounded-xl bg-[var(--color-state-hover)] text-xl transition-colors duration-200 active:bg-[var(--color-state-pressed)]">×</button>
          <div className="relative flex-1"><svg viewBox="0 0 24 24" aria-hidden="true" className="absolute left-4 top-3.5 h-5 w-5 fill-none stroke-[var(--color-text-muted)] stroke-2"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-12 pr-4 outline-none focus:border-[var(--color-accent)]" /></div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4 pb-12">
        {isSearching ? (
          <section><p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{results.length} results</p><div className="divide-y divide-[var(--color-divider-subtle)]">{results.map(exerciseButton)}</div></section>
        ) : (
          <>
            {recent.length > 0 && <section className="mb-8"><h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">{t('recent')}</h2><div className="grid gap-2 sm:grid-cols-2">{recent.map((exercise) => <button key={exercise.id} type="button" onClick={() => onPick(exercise)} className="min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-left text-sm font-semibold hover:border-[var(--color-accent)]">{name(exercise)}</button>)}</div></section>}
            <section className="space-y-2">{Object.entries(tree).map(([group, subgroups], groupIndex) => <details key={group} open={groupIndex === 0} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"><summary className="flex min-h-14 cursor-pointer list-none items-center px-4 font-black"><span className="mr-3 text-xs text-[var(--color-accent)]">{String(groupIndex + 1).padStart(2, '0')}</span>{group}<span className="ml-auto text-[var(--color-text-muted)]">＋</span></summary><div className="border-t border-[var(--color-border)] p-2">{Object.entries(subgroups).map(([subgroup, exercises]) => <div key={subgroup} className="mb-3 last:mb-0">{subgroup !== '_none' && <h3 className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{subgroup}</h3>}<div className="divide-y divide-[var(--color-divider-subtle)]">{exercises.map(exerciseButton)}</div></div>)}</div></details>)}</section>
          </>
        )}
      </div>
    </div>
  )
}
