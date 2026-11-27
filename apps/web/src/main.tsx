import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/young-serif/400.css'
import '@fontsource/atkinson-hyperlegible-next/400.css'
import '@fontsource/atkinson-hyperlegible-next/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import './styles/tokens.css'
import './styles/app.css'
import { App } from './App'
import { captureInstallPrompt } from './lib/install'

if (navigator.storage?.persist) void navigator.storage.persist()
captureInstallPrompt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
