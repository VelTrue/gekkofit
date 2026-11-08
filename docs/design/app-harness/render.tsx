import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/theme.css'
import App from '../src/App.tsx'
import { ThemeProvider } from '../src/theme/ThemeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
