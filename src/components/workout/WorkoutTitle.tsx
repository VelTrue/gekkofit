import { useRef, useState } from 'react'
import { useLang } from '../../i18n/LangContext'
import { WorkoutIcon } from './WorkoutIcon'
import './workout.css'

export function WorkoutTitle({ title, onSave }: { title: string; onSave: (title: string) => Promise<void> }) {
  const { lang } = useLang()
  const ru = lang === 'ru'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  async function save() {
    if (pending) return
    const normalized = draft.trim()
    if ([...normalized].length < 1 || [...normalized].length > 80) { setError(ru ? 'От 1 до 80 символов.' : 'Use 1 to 80 characters.'); return }
    setPending(true); setError(null)
    try { await onSave(normalized); setEditing(false); opener.current?.focus() }
    catch { setFailed(true); setError(ru ? 'Не удалось сохранить название. Повторите попытку.' : 'Could not save the title. Try again.') }
    finally { setPending(false) }
  }
  return <div className="workout-title">
    <div className="workout-title-display" hidden={editing}><h1>{title}</h1><button ref={opener} type="button" className="workout-icon-button" aria-label={ru ? 'Изменить название тренировки' : 'Rename workout'} onClick={() => { setDraft(title); setError(null); setFailed(false); setEditing(true) }}><WorkoutIcon name="edit" /></button></div>
    {editing && <form onSubmit={(event) => { event.preventDefault(); void save() }}>
      <label className="workout-field"><span>{ru ? 'Название тренировки' : 'Workout title'}</span><input autoFocus value={draft} disabled={pending} onChange={(event) => { setDraft(event.target.value); setFailed(false) }} /></label>
      {error && <p role="alert" className="workout-error">{error}</p>}
      <div className="workout-actions"><button type="submit" className="workout-button" disabled={pending}>{failed ? (ru ? 'Повторить' : 'Retry') : (ru ? 'Сохранить название' : 'Save title')}</button><button type="button" className="workout-text-button" disabled={pending} onClick={() => { setEditing(false); opener.current?.focus() }}>{ru ? 'Отмена' : 'Cancel'}</button></div>
    </form>}
  </div>
}
