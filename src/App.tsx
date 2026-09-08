import { lazy, Suspense, useState } from 'react'
import { NavBar, type ScreenName } from './components/NavBar'
import { LangProvider } from './i18n/LangContext'

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

export default function App() {
  const [active, setActive] = useState<ScreenName>('workout')
  return (
    <LangProvider>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] md:flex">
        <NavBar active={active} onChange={setActive} />
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 sm:p-6 sm:pb-24 md:p-8">
          <Suspense fallback={<div className="h-1 w-24 animate-pulse rounded-full bg-[var(--color-accent)]" />}>
            <Screen name={active} />
          </Suspense>
        </main>
      </div>
    </LangProvider>
  )
}
