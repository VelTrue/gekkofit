import { useLang } from '../i18n/LangContext'

export type ScreenName = 'workout' | 'progress' | 'history' | 'settings'

const tabs: Array<{ id: ScreenName; labelKey: 'tabWorkout' | 'tabMastery' | 'tabHistory' | 'tabSettings'; iconName: string; icon: string }> = [
  { id: 'workout', labelKey: 'tabWorkout', iconName: 'dumbbell', icon: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12' },
  { id: 'progress', labelKey: 'tabMastery', iconName: 'mastery', icon: 'M12 3l2.5 5.1 5.6.8-4 3.9.9 5.5-5-2.6-5 2.6.9-5.5-4-3.9 5.6-.8L12 3z' },
  { id: 'history', labelKey: 'tabHistory', iconName: 'calendar', icon: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13H4V6a1 1 0 011-1z' },
  { id: 'settings', labelKey: 'tabSettings', iconName: 'controls', icon: 'M4 7h5m6 0h5M4 17h2m6 0h8M12 4a3 3 0 1 1 0 6a3 3 0 1 1 0-6M9 14a3 3 0 1 1 0 6a3 3 0 1 1 0-6' },
]

export function NavBar({ active, onChange }: { active: ScreenName; onChange: (screen: ScreenName) => void }) {
  const { t } = useLang()
  return (
    <nav aria-label={t('primaryNavigation')} className="app-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[var(--color-border)] bg-[var(--color-nav)] px-2 pb-[max(8px,var(--safe-area-bottom))] pt-2 backdrop-blur-xl md:static md:h-screen md:w-56 md:grid-cols-1 md:grid-rows-[repeat(4,64px)_1fr] md:border-r md:border-t-0 md:px-3 md:pt-6">
      {tabs.map((tab) => {
        const selected = active === tab.id
        return (
          <button key={tab.id} type="button" onClick={() => onChange(tab.id)} aria-current={selected ? 'page' : undefined} className={`flex min-h-12 w-14 items-center justify-center justify-self-center gap-2 rounded-xl px-2 text-[11px] font-semibold transition-colors duration-200 md:w-full md:justify-self-stretch md:justify-start md:px-4 md:text-sm ${selected ? 'bg-[var(--color-accent-fill)] text-[var(--color-accent-text)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-state-hover)] hover:text-[var(--color-text)] active:bg-[var(--color-state-pressed)]'}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" data-icon={tab.iconName} className="h-5 w-5 fill-none stroke-current stroke-2"><path d={tab.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="hidden md:inline">{t(tab.labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
