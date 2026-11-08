import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App.tsx'
import { initExerciseCatalog } from './db/seedExercises.ts'
import { StartupError } from './StartupError.tsx'
import { ThemeProvider } from './theme/ThemeContext.tsx'

const root = createRoot(document.getElementById('root')!)

async function start() {
  try {
    await initExerciseCatalog()
  } catch (error) {
    console.error('Exercise catalog initialization failed', error)
    root.render(<StartupError onRetry={() => window.location.reload()} />)
    return
  }
  root.render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
}

void start()
