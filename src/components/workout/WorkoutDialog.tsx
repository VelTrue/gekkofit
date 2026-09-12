import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useLang } from '../../i18n/LangContext'
import { WorkoutIcon } from './WorkoutIcon'

export function WorkoutDialog({ title, backLabel, focusSetId, onClose, children }: {
  title: string; backLabel?: string; focusSetId?: string; onClose: () => void; children: ReactNode
}) {
  const { lang } = useLang()
  const dialog = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  const initialSetId = useRef(focusSetId)
  const titleId = useId()
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const element = dialog.current!
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const marker = crypto.randomUUID()
    const originalState: unknown = history.state
    const bodyOverflow = document.body.style.overflow
    history.pushState({ workoutDialog: marker }, '')
    document.body.style.overflow = 'hidden'
    element.showModal()
    const selectedRow = Array.from(element.querySelectorAll<HTMLElement>('[data-set-id]')).find((row) => row.dataset.setId === initialSetId.current)
    ;(selectedRow?.querySelector<HTMLInputElement>('input') ?? element.querySelector<HTMLButtonElement>('button'))?.focus()
    const pop = () => { if (history.state?.workoutDialog !== marker) onCloseRef.current() }
    window.addEventListener('popstate', pop)
    return () => {
      window.removeEventListener('popstate', pop)
      if (history.state?.workoutDialog === marker) history.replaceState(originalState, '')
      element.close()
      document.body.style.overflow = bodyOverflow
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const close = () => history.back()
  return <dialog ref={dialog} aria-labelledby={titleId} className="workout-dialog" onCancel={(event) => { event.preventDefault(); close() }}>
    <div className="workout-dialog-header">
      <button type="button" className="workout-button" onClick={close}><WorkoutIcon name="back" />{backLabel ?? (lang === 'ru' ? 'Назад' : 'Back')}</button>
      <h2 id={titleId}>{title}</h2>
    </div>
    {children}
  </dialog>
}

export function ConfirmAction({ title, description, confirmLabel, onConfirm, onClose }: {
  title: string; description: string; confirmLabel: string; onConfirm: () => Promise<void>; onClose: () => void
}) {
  const { lang } = useLang()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const lock = useRef(false)
  async function confirm() {
    if (lock.current) return
    lock.current = true
    setPending(true)
    setFailed(false)
    try { await onConfirm(); history.back() }
    catch { setFailed(true) }
    finally { lock.current = false; setPending(false) }
  }
  return <WorkoutDialog title={title} onClose={onClose}>
    <div className="workout-confirm">
      <p>{description}</p>
      {failed && <p role="alert" className="workout-error">{lang === 'ru' ? 'Не удалось сохранить. Повторите попытку.' : 'Could not save. Try again.'}</p>}
      <button type="button" className="workout-button workout-button-danger" disabled={pending} onClick={() => void confirm()}>{pending ? (lang === 'ru' ? 'Сохранение…' : 'Saving…') : failed ? (lang === 'ru' ? 'Повторить' : 'Retry') : confirmLabel}</button>
    </div>
  </WorkoutDialog>
}
