import { motion, useReducedMotion } from 'motion/react'
import type { LevelInfo } from '../data-layer/mastery'

export function LevelBar({ label, info }: { label: string; info: LevelInfo }) {
  const progress = Math.min(1, info.currentInLevel / info.neededForNextLevel)
  const reduceMotion = useReducedMotion()
  return <div><div className="mb-2 flex items-end justify-between"><div><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</span><p className="text-2xl font-black">LV.{info.level}</p></div><span className="text-xs tabular-nums text-[var(--color-text-muted)]">{Math.round(info.currentInLevel)} / {info.neededForNextLevel}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]"><motion.div className="h-full origin-left rounded-full bg-[var(--color-accent)]" initial={reduceMotion ? false : { scaleX: 0 }} animate={{ scaleX: progress }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div></div>
}
