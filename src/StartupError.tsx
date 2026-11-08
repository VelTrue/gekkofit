import { t, type Lang } from './i18n/translations'

/** Shown instead of the app when the local database cannot be prepared on launch. */
export function StartupError({ onRetry }: { onRetry: () => void }) {
  let lang: Lang = 'ru'
  try { if (localStorage.getItem('lang') === 'en') lang = 'en' } catch { /* storage may be blocked */ }
  return (
    <main role="alert" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 bg-[var(--color-bg)] p-6 text-[var(--color-text)]">
      <h1 className="text-2xl font-black">{t(lang, 'startupErrorTitle')}</h1>
      <p className="text-[var(--color-text-muted)]">{t(lang, 'startupErrorText')}</p>
      <button type="button" onClick={onRetry} className="min-h-12 rounded-2xl bg-[var(--color-accent-fill)] px-4 font-bold text-[var(--color-accent-text)]">{t(lang, 'retry')}</button>
    </main>
  )
}
