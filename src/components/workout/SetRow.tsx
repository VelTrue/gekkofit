import { useId, useRef, useState } from 'react'
import type { WorkoutSet } from '../../db/schema'
import type { SetChanges } from '../../data-layer/workoutEditor'
import { useLang } from '../../i18n/LangContext'
import { ConfirmAction } from './WorkoutDialog'
import { WorkoutIcon } from './WorkoutIcon'

export function SetRow({ set, onSave, onDelete }: {
  set: WorkoutSet; onSave: (changes: SetChanges) => Promise<void>; onDelete: () => Promise<void>
}) {
  const { lang } = useLang()
  const ru = lang === 'ru'
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
      setInvalid('weight'); setError(ru ? 'Вес должен быть числом от 0.' : 'Weight must be a number of 0 or more.'); weightInput.current?.focus(); return
    }
    if (!reps.trim() || !Number.isInteger(nextReps) || nextReps <= 0) {
      setInvalid('reps'); setError(ru ? 'Повторы должны быть целым числом от 1.' : 'Repetitions must be a whole number of 1 or more.'); repsInput.current?.focus(); return
    }
    const changes = previousAttempt ?? { weight: nextWeight, reps: nextReps, ...(completed === undefined ? {} : { completed }) }
    lock.current = true
    setPending(true); setError(null); setInvalid(null); setSaved(false); setRetry(null)
    try { await onSave(changes); setWeight(String(changes.weight)); setReps(String(changes.reps)); setSaved(true) }
    catch { setError(ru ? 'Не удалось сохранить. Значения остались в строке.' : 'Could not save. Your values are still here.'); setRetry(changes) }
    finally { lock.current = false; setPending(false) }
  }

  return <div className="workout-set" data-completed={set.completed} data-set-id={set.id}>
    <form className="workout-set-fields" noValidate onSubmit={(event) => { event.preventDefault(); void save() }}>
      <span className="workout-set-ordinal" aria-label={`${ru ? 'Подход' : 'Set'} ${ordinal}`}>{ordinal}</span>
      <label className="workout-field" htmlFor={`${id}-weight`}><span>{ru ? 'Вес, кг' : 'Weight, kg'}</span>
        <input ref={weightInput} id={`${id}-weight`} aria-label={`${ru ? 'Вес, подход' : 'Weight, set'} ${ordinal}`} aria-invalid={invalid === 'weight'} aria-describedby={error ? `${id}-error` : undefined} inputMode="decimal" value={weight} disabled={pending} onChange={(event) => { setWeight(event.target.value); setSaved(false); setRetry(null) }} />
      </label>
      <label className="workout-field" htmlFor={`${id}-reps`}><span>{ru ? 'Повторы' : 'Reps'}</span>
        <input ref={repsInput} id={`${id}-reps`} aria-label={`${ru ? 'Повторы, подход' : 'Repetitions, set'} ${ordinal}`} aria-invalid={invalid === 'reps'} aria-describedby={error ? `${id}-error` : undefined} inputMode="numeric" value={reps} disabled={pending} onChange={(event) => { setReps(event.target.value); setSaved(false); setRetry(null) }} />
      </label>
      <button type="button" className="workout-complete" aria-pressed={set.completed} aria-label={`${set.completed ? (ru ? 'Отменить выполнение подхода' : 'Mark set incomplete') : (ru ? 'Завершить подход' : 'Complete set')} ${ordinal}`} disabled={pending} onClick={() => void save(!set.completed)}><WorkoutIcon name="check" /></button>
      <button type="button" className="workout-icon-button workout-set-delete" aria-label={`${ru ? 'Удалить подход' : 'Delete set'} ${ordinal}`} disabled={pending} onClick={() => setDeleting(true)}><WorkoutIcon name="remove" /></button>
      <div className="workout-set-feedback">
        <span role="status">{pending ? (ru ? 'Сохранение…' : 'Saving…') : saved ? (ru ? 'Сохранено' : 'Saved') : set.completed ? (ru ? 'Выполнен' : 'Completed') : (ru ? 'Не выполнен' : 'Not completed')}</span>
        {dirty && <button type="submit" disabled={pending} className="workout-text-button" aria-label={`${ru ? 'Сохранить подход' : 'Save set'} ${ordinal}`}>{ru ? 'Сохранить' : 'Save'}</button>}
      </div>
    </form>
    {error && <div className="workout-error" id={`${id}-error`}><p role="alert">{error}</p>{retry && <button type="button" className="workout-text-button" onClick={() => void save(undefined, retry)}>{ru ? 'Повторить' : 'Retry'}</button>}</div>}
    {deleting && <ConfirmAction title={ru ? `Удалить подход ${ordinal}?` : `Delete set ${ordinal}?`} description={ru ? 'Подход будет удалён из этой тренировки.' : 'This set will be removed from this workout.'} confirmLabel={ru ? 'Удалить' : 'Delete'} onConfirm={onDelete} onClose={() => setDeleting(false)} />}
  </div>
}
