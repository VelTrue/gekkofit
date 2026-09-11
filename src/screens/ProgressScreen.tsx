import { useEffect, useState } from 'react'
import { LevelBar } from '../components/LevelBar'
import { getExercisesWithProgress, getExerciseWeightHistory, type WeightPoint } from '../data-layer/exerciseHistory'
import { strengthLevelInfo, volumeLevelInfo } from '../data-layer/mastery'
import { db, type Exercise, type ExerciseProgress } from '../db/schema'
import { useLang } from '../i18n/LangContext'

function LineChart({ points }: { points: WeightPoint[] }) {
  if (!points.length) return <div className="grid h-40 place-items-center text-sm text-[var(--color-text-muted)]">No data</div>
  const weights = points.map(({ weight }) => weight), min = Math.min(...weights), max = Math.max(...weights), range = max - min || 1
  const coords = points.map((point, index) => `${points.length === 1 ? 150 : index * 300 / (points.length - 1)},${92 - (point.weight - min) / range * 72}`).join(' ')
  return <div><svg viewBox="0 0 300 110" role="img" aria-label="Weight history" className="h-44 w-full overflow-visible"><defs><linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--color-accent)" stopOpacity=".35"/><stop offset="1" stopColor="var(--color-accent)" stopOpacity="0"/></linearGradient></defs><path d="M0 100H300M0 64H300M0 28H300" stroke="var(--color-chart-grid)" strokeWidth="1"/><polyline points={`0,105 ${coords} 300,105`} fill="url(#chartGlow)" stroke="none"/><polyline points={coords} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map((point, index) => { const x = points.length === 1 ? 150 : index * 300 / (points.length - 1), y = 92 - (point.weight - min) / range * 72; return <circle key={`${point.date}-${index}`} cx={x} cy={y} r="4" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2"/> })}</svg><div className="flex justify-between text-xs text-[var(--color-text-muted)]"><span>{min} kg</span><span>{max} kg</span></div></div>
}

export function ProgressScreen() {
  const { lang, t } = useLang()
  const [list, setList] = useState<Array<{ exercise: Exercise; progress: ExerciseProgress }>>([])
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [history, setHistory] = useState<WeightPoint[]>([])
  useEffect(() => { void getExercisesWithProgress(db).then(setList) }, [])
  useEffect(() => { if (selected) void getExerciseWeightHistory(db, selected.id).then(setHistory) }, [selected])
  const name = (exercise: Exercise) => lang === 'ru' ? exercise.name_ru : exercise.name_en

  if (selected) {
    const entry = list.find(({ exercise }) => exercise.id === selected.id)
    if (!entry) return null
    return <section><button type="button" onClick={() => setSelected(null)} className="mb-6 min-h-11 text-sm text-[var(--color-text-muted)]">← {name(selected)}</button><div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Weight / kg</p><LineChart points={history}/></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><LevelBar label={t('volumeLevel')} info={volumeLevelInfo(entry.progress.totalSets)}/></div><div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><LevelBar label={t('strengthLevel')} info={strengthLevelInfo(entry.progress.totalXp)}/></div></div></section>
  }

  return <section><header className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">Mastery</p><h1 className="mt-1 text-4xl font-black tracking-tight">{t('tabProgress')}</h1></header>{list.length === 0 ? <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">{lang === 'ru' ? 'Завершите первый подход - прогресс появится здесь.' : 'Complete your first set to see progress.'}</div> : <div className="grid gap-3 sm:grid-cols-2">{list.map(({ exercise, progress }) => <button key={exercise.id} type="button" onClick={() => setSelected(exercise)} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition-colors duration-200 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-elevated)] active:bg-[var(--color-state-pressed)]"><div className="mb-5 flex justify-between gap-3"><h2 className="font-black">{name(exercise)}</h2><span className="text-xs text-[var(--color-text-muted)]">{progress.bestWeightEver} kg</span></div><div className="space-y-4"><LevelBar label={t('volumeLevel')} info={volumeLevelInfo(progress.totalSets)}/><LevelBar label={t('strengthLevel')} info={strengthLevelInfo(progress.totalXp)}/></div></button>)}</div>}</section>
}
