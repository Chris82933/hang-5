import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import './App.css'
import './lib/pwaInstall' // capture the install prompt as early as possible
import App from './App.tsx'

// HashRouter keeps client-side routing working on any static host (incl. GitHub
// Pages project sites) with no server rewrites or 404 fallback needed.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
