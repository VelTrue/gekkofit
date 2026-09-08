import { useState } from 'react'
import { NavBar, type ScreenName } from './components/NavBar'
import { LangProvider } from './i18n/LangContext'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SettingsScreen } from './screens/SettingsScreen'

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
          <Screen name={active} />
        </main>
      </div>
    </LangProvider>
  )
}
