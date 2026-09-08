import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { exportData, importData, parseBackup, serializeBackup } from '../data-layer/backup'
import { shouldShowBackupReminder } from '../data-layer/backupReminder'
import { getWorkoutHistory } from '../data-layer/workouts'
import { db } from '../db/schema'
import { useLang } from '../i18n/LangContext'
import { useInstallPrompt } from '../pwa/InstallPromptContext'

export function SettingsScreen() {
  const { lang, setLang, t } = useLang()
  const { canInstall, promptInstall } = useInstallPrompt()
  const fileInput = useRef<HTMLInputElement>(null)
  const [showReminder, setShowReminder] = useState(false)
  useEffect(() => { void getWorkoutHistory(db).then((history) => setShowReminder(shouldShowBackupReminder(localStorage.getItem('lastExportAt'), history.length))) }, [])

  async function handleExport() {
    const json = serializeBackup(await exportData(db))
    const filename = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`
    const file = new File([json], filename, { type: 'application/json' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] })
    else { const url = URL.createObjectURL(file); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url) }
    localStorage.setItem('lastExportAt', new Date().toISOString())
    setShowReminder(false)
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !window.confirm(t('importConfirm'))) return
    try { await importData(db, parseBackup(await file.text())); window.location.reload() }
    catch { window.alert(lang === 'ru' ? 'Файл резервной копии повреждён или несовместим.' : 'The backup file is corrupt or incompatible.') }
  }

  const actionClass = 'flex min-h-16 w-full items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-left font-bold hover:border-white/20'
  return <section className="mx-auto max-w-2xl">
    <header className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">System</p><h1 className="mt-1 text-4xl font-black">{t('tabSettings')}</h1></header>
    {canInstall && <button type="button" onClick={promptInstall} className="mb-5 min-h-14 w-full rounded-2xl bg-[var(--color-accent)] px-5 font-black text-[#071006]">{lang === 'ru' ? 'Установить приложение' : 'Install app'}</button>}
    {showReminder && <div className="mb-5 rounded-[var(--radius-card)] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4 text-sm"><strong className="block text-[var(--color-accent)]">{lang === 'ru' ? 'Не потеряйте прогресс' : 'Keep your progress safe'}</strong>{lang === 'ru' ? 'Сохраните свежую резервную копию.' : 'Save a fresh backup copy.'}</div>}
    <div className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{t('settingsLanguage')}</p><div className="grid grid-cols-2 rounded-2xl bg-[var(--color-surface)] p-1"><button type="button" onClick={() => setLang('ru')} className={`min-h-12 rounded-xl font-bold ${lang === 'ru' ? 'bg-[var(--color-accent)] text-[#071006]' : 'text-[var(--color-text-muted)]'}`}>Русский</button><button type="button" onClick={() => setLang('en')} className={`min-h-12 rounded-xl font-bold ${lang === 'en' ? 'bg-[var(--color-accent)] text-[#071006]' : 'text-[var(--color-text-muted)]'}`}>English</button></div></div>
    <div className="space-y-3"><button type="button" onClick={handleExport} className={actionClass}><span>{t('settingsExport')}</span><span className="text-[var(--color-accent)]">↓</span></button><button type="button" onClick={() => fileInput.current?.click()} className={actionClass}><span>{t('settingsImport')}</span><span className="text-[var(--color-accent)]">↑</span></button><input ref={fileInput} type="file" accept="application/json" onChange={handleFile} className="hidden" /></div>
    <p className="mt-8 text-xs leading-5 text-[var(--color-text-muted)]">{lang === 'ru' ? 'Все данные хранятся только на этом устройстве. Аккаунт и облако не используются.' : 'All data stays on this device. No account or cloud is used.'}</p>
  </section>
}
