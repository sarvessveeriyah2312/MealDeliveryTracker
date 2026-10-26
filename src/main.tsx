import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { applyTheme } from './lib/theme'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/figtree'
import './index.css'

applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
