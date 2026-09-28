import { useId, useRef, useState } from 'react'
import type { WorkoutSet } from '../../db/schema'
import type { SetChanges } from '../../data-layer/workoutEditor'
import { useLang } from '../../i18n/LangContext'
import { ConfirmAction } from './WorkoutDialog'
import { WorkoutIcon } from './WorkoutIcon'

export function SetRow({ cardio = false, ...props }: {
  set: WorkoutSet; cardio?: boolean; onSave: (changes: SetChanges) => Promise<void>; onDelete: () => Promise<void>
}) {
  return cardio ? <CardioSetRow {...props} /> : <StrengthSetRow {...props} />
}

function StrengthSetRow({ set, onSave, onDelete }: {
  set: WorkoutSet; onSave: (changes: SetChanges) => Promise<void>; onDelete: () => Promise<void>
}) {
  const { t } = useLang()
  const id = useId()
  const ordinal = set.setOrder + 1
  const [weight, setWeight] = useState(String(set.weight))
  const [reps, setReps] = useState(String(set.reps))
  const [error, setError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState<'weight' | 'reps' | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [retry, setRetry] = useState<SetChanges | null>(null)
  const lock = useRef(false)
  const weightInput = useRef<HTMLInputElement>(null)
  const repsInput = useRef<HTMLInputElement>(null)
  const dirty = weight !== String(set.weight) || reps !== String(set.reps)

  async function save(completed?: boolean, previousAttempt?: SetChanges) {
    if (lock.current) return
    const nextWeight = Number(weight.trim().replace(',', '.'))
    const nextReps = Number(reps.trim())
    if (!weight.trim() || !Number.isFinite(nextWeight) || nextWeight < 0) {
      setInvalid('weight'); setError(t('weightError')); weightInput.current?.focus(); return
    }
    if (!reps.trim() || !Number.isInteger(nextReps) || nextReps <= 0) {
      setInvalid('reps'); setError(t('repsError')); repsInput.current?.focus(); return
    }
    const changes = previousAttempt ?? { weight: nextWeight, reps: nextReps, ...(completed === undefined ? {} : { completed }) }
    lock.current = true
    setPending(true); setError(null); setInvalid(null); setSaved(false); setRetry(null)
    try { await onSave(changes); setWeight(String(changes.weight)); setReps(String(changes.reps)); setSaved(true) }
    catch { setError(t('setSaveError')); setRetry(changes) }
    finally { lock.current = false; setPending(false) }
  }

  return <div className="workout-set" data-completed={set.completed} data-set-id={set.id}>
    <form className="workout-set-fields" noValidate onSubmit={(event) => { event.preventDefault(); void save() }}>
      <span className="workout-set-ordinal" aria-label={`${t('set')} ${ordinal}`}>{ordinal}</span>
      <label className="workout-field" htmlFor={`${id}-weight`}><span>{t('weightKg')}</span>
        <input ref={weightInput} id={`${id}-weight`} aria-label={`${t('weightSet')} ${ordinal}`} aria-invalid={invalid === 'weight'} aria-describedby={error ? `${id}-error` : undefined} inputMode="decimal" value={weight} disabled={pending} onChange={(event) => { setWeight(event.target.value); setSaved(false); setRetry(null) }} />
      </label>
      <label className="workout-field" htmlFor={`${id}-reps`}><span>{t('repsShort')}</span>
        <input ref={repsInput} id={`${id}-reps`} aria-label={`${t('repsSet')} ${ordinal}`} aria-invalid={invalid === 'reps'} aria-describedby={error ? `${id}-error` : undefined} inputMode="numeric" value={reps} disabled={pending} onChange={(event) => { setReps(event.target.value); setSaved(false); setRetry(null) }} />
      </label>
      <button type="button" className="workout-complete" aria-pressed={set.completed} aria-label={`${t(set.completed ? 'markIncomplete' : 'completeSet')} ${ordinal}`} disabled={pending} onClick={() => void save(!set.completed)}><WorkoutIcon name="check" /></button>
      <button type="button" className="workout-icon-button workout-set-delete" aria-label={`${t('deleteSet')} ${ordinal}`} disabled={pending} onClick={() => setDeleting(true)}><WorkoutIcon name="remove" /></button>
      <div className="workout-set-feedback">
        <span role="status">{t(pending ? 'saving' : saved ? 'saved' : set.completed ? 'completed' : 'incomplete')}</span>
        {dirty && <button type="submit" disabled={pending} className="workout-text-button" aria-label={`${t('saveSet')} ${ordinal}`}>{t('save')}</button>}
      </div>
    </form>
    {error && <div className="workout-error" id={`${id}-error`}><p role="alert">{error}</p>{retry && <button type="button" className="workout-text-button" onClick={() => void save(undefined, retry)}>{t('retry')}</button>}</div>}
    {deleting && <ConfirmAction title={t('deleteSetConfirm').replace('{index}', String(ordinal))} description={t('deleteSetDescription')} confirmLabel={t('delete')} onConfirm={onDelete} onClose={() => setDeleting(false)} />}
  </div>
}

function CardioSetRow({ set, onSave, onDelete }: { set: WorkoutSet; onSave: (changes: SetChanges) => Promise<void>; onDelete: () => Promise<void> }) {
  const { t } = useLang()
  const [values, setValues] = useState({ distance: String(set.distance ?? 0), incline: String(set.incline ?? 0), duration: String(set.duration ?? 0), intensity: String(set.intensity ?? 5) })
  const [pending, setPending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(false)
  const fields = [['distance', t('distanceKm'), 'decimal'], ['incline', t('inclinePercent'), 'decimal'], ['duration', t('durationMin'), 'decimal'], ['intensity', t('intensityTen'), 'decimal']] as const
  async function save(completed = set.completed) {
    const parsed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value.replace(',', '.'))])) as unknown as SetChanges
    if (Object.values(parsed).some((value) => !Number.isFinite(value) || Number(value) < 0) || Number(parsed.intensity) > 10) { setError(true); return }
    setPending(true); setError(false)
    try { await onSave({ ...parsed, weight: 0, reps: 1, completed }) } catch { setError(true) } finally { setPending(false) }
  }
  return <div className="workout-set workout-set-cardio" data-completed={set.completed}>
    <span className="workout-set-ordinal">{set.setOrder + 1}</span>
    <div className="workout-cardio-fields">{fields.map(([key, label, inputMode]) => <label className="workout-field" key={key}><span>{label}</span><input inputMode={inputMode} value={values[key]} disabled={pending} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
    <div className="workout-cardio-actions"><button type="button" className="workout-button" disabled={pending} onClick={() => void save()}>{t('save')}</button><button type="button" className="workout-complete" aria-pressed={set.completed} aria-label={t(set.completed ? 'markIncomplete' : 'completeSet')} disabled={pending} onClick={() => void save(!set.completed)}><WorkoutIcon name="check" /></button><button type="button" className="workout-icon-button workout-button-danger" aria-label={t('deleteSet')} onClick={() => setDeleting(true)}><WorkoutIcon name="remove" /></button></div>
    {error && <p role="alert" className="workout-error">{t('cardioValuesError')}</p>}
    {deleting && <ConfirmAction title={t('deleteSetConfirm').replace('{index}', String(set.setOrder + 1))} description={t('deleteSetDescription')} confirmLabel={t('delete')} onConfirm={onDelete} onClose={() => setDeleting(false)} />}
  </div>
}
