import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App.tsx'
import { initExerciseCatalog } from './db/seedExercises.ts'
import { ThemeProvider } from './theme/ThemeContext.tsx'

await initExerciseCatalog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
