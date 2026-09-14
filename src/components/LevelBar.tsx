import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { LevelInfo } from '../data-layer/mastery'
import { useLang } from '../i18n/LangContext'

export function LevelBar({ label, info }: { label: string; info: LevelInfo }) {
  const { t } = useLang()
  const progress = Math.min(1, info.currentInLevel / info.neededForNextLevel)
  const reduceMotion = useReducedMotion()
  const previousLevel = useRef(info.level)
  const [leveledUp, setLeveledUp] = useState(false)
  useEffect(() => {
    if (info.level <= previousLevel.current) { previousLevel.current = info.level; return }
    previousLevel.current = info.level
    const show = window.setTimeout(() => setLeveledUp(true), 0)
    const hide = window.setTimeout(() => setLeveledUp(false), 1200)
    return () => { window.clearTimeout(show); window.clearTimeout(hide) }
  }, [info.level])
  return <div className="relative"><div className="mb-2 flex items-end justify-between"><div><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</span><p className="text-2xl font-black">LV.{info.level}</p></div><span className="text-xs tabular-nums text-[var(--color-text-muted)]">{Math.round(info.currentInLevel)} / {info.neededForNextLevel}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]"><motion.div className="h-full origin-left rounded-full bg-[var(--color-accent-fill)]" initial={reduceMotion ? false : { scaleX: 0 }} animate={{ scaleX: progress }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div><AnimatePresence>{leveledUp && <motion.span initial={{ opacity: 0, scale: .7, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .85 }} className="absolute -top-2 right-0 rounded-full bg-[var(--color-accent-fill)] px-2 py-1 text-[10px] font-black uppercase text-[var(--color-accent-text)]">{t('levelUp')}</motion.span>}</AnimatePresence></div>
}
