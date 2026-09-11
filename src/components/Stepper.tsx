import { useState } from 'react'

interface StepperProps {
  value: number
  step: number
  onChange: (value: number) => void
  min?: number
}

export function Stepper({ value, step, onChange, min = 0 }: StepperProps) {
  const [editing, setEditing] = useState(false)
  return (
    <div className="grid grid-cols-[44px_72px_44px] items-center gap-1 rounded-2xl bg-[var(--color-surface-elevated)] p-1">
      <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} className="h-11 w-11 rounded-xl text-xl text-[var(--color-text-muted)] transition-colors duration-200 hover:bg-[var(--color-state-hover)] hover:text-[var(--color-text)] active:bg-[var(--color-state-pressed)]">−</button>
      {editing ? (
        <input type="number" min={min} step={step} value={value} autoFocus onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(Math.max(min, next)) }} onBlur={() => setEditing(false)} onKeyDown={(event) => event.key === 'Enter' && setEditing(false)} className="h-11 w-[72px] rounded-xl border border-[var(--color-accent)] bg-[var(--color-field)] px-1 text-center text-xl font-black tabular-nums" />
      ) : (
        <button type="button" aria-label={`Edit ${value}`} onClick={() => setEditing(true)} className="h-11 rounded-xl text-center text-xl font-black tabular-nums">{value}</button>
      )}
      <button type="button" aria-label="Increase" onClick={() => onChange(+(value + step).toFixed(2))} className="h-11 w-11 rounded-xl text-xl text-[var(--color-text-muted)] transition-colors duration-200 hover:bg-[var(--color-state-hover)] hover:text-[var(--color-text)] active:bg-[var(--color-state-pressed)]">+</button>
    </div>
  )
}
