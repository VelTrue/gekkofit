import { useLang } from '../i18n/LangContext'

export type ScreenName = 'workout' | 'progress' | 'history' | 'settings'

const tabs: Array<{ id: ScreenName; labelKey: 'tabWorkout' | 'tabProgress' | 'tabHistory' | 'tabSettings'; icon: string }> = [
  { id: 'workout', labelKey: 'tabWorkout', icon: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12' },
  { id: 'progress', labelKey: 'tabProgress', icon: 'M4 18l5-6 4 3 7-9M17 6h3v3' },
  { id: 'history', labelKey: 'tabHistory', icon: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13H4V6a1 1 0 011-1z' },
  { id: 'settings', labelKey: 'tabSettings', icon: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41' },
]

export function NavBar({ active, onChange }: { active: ScreenName; onChange: (screen: ScreenName) => void }) {
  const { t } = useLang()
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[var(--color-border)] bg-[#111116]/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:static md:h-screen md:w-56 md:grid-cols-1 md:grid-rows-[repeat(4,64px)_1fr] md:border-r md:border-t-0 md:px-3 md:pt-6">
      {tabs.map((tab) => {
        const selected = active === tab.id
        return (
          <button key={tab.id} type="button" onClick={() => onChange(tab.id)} aria-current={selected ? 'page' : undefined} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-[11px] font-semibold transition-colors md:justify-start md:px-4 md:text-sm ${selected ? 'bg-[var(--color-accent)] text-[#071006]' : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white'}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2"><path d={tab.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="hidden sm:inline">{t(tab.labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
