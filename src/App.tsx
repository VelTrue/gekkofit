import { lazy, Suspense, useState } from 'react'
import { NavBar, type ScreenName } from './components/NavBar'
import { LangProvider, useLang } from './i18n/LangContext'
import { InstallPromptProvider } from './pwa/InstallPromptContext'
import { useRegisterSW } from 'virtual:pwa-register/react'

const HomeScreen = lazy(() => import('./screens/HomeScreen').then((module) => ({ default: module.HomeScreen })))
const ProgressScreen = lazy(() => import('./screens/ProgressScreen').then((module) => ({ default: module.ProgressScreen })))
const HistoryScreen = lazy(() => import('./screens/HistoryScreen').then((module) => ({ default: module.HistoryScreen })))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then((module) => ({ default: module.SettingsScreen })))

function Screen({ name }: { name: ScreenName }) {
  switch (name) {
    case 'workout': return <HomeScreen />
    case 'progress': return <ProgressScreen />
    case 'history': return <HistoryScreen />
    case 'settings': return <SettingsScreen />
  }
}

function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const { lang } = useLang()
  if (!needRefresh) return null
  return <button type="button" onClick={() => updateServiceWorker(true)} className="fixed inset-x-3 top-3 z-50 mx-auto min-h-12 max-w-md rounded-2xl bg-[var(--color-accent)] px-4 font-bold text-[#071006] shadow-xl">{lang === 'ru' ? 'Доступно обновление - применить' : 'Update available - apply'}</button>
}

export default function App() {
  const [active, setActive] = useState<ScreenName>('workout')
  return (
    <LangProvider>
      <InstallPromptProvider><div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] md:flex">
        <UpdateBanner />
        <NavBar active={active} onChange={setActive} />
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 sm:p-6 sm:pb-24 md:p-8">
          <Suspense fallback={<div className="h-1 w-24 animate-pulse rounded-full bg-[var(--color-accent)]" />}>
            <Screen name={active} />
          </Suspense>
        </main>
      </div></InstallPromptProvider>
    </LangProvider>
  )
}
