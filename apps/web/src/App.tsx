import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Banners } from './components/Banners'
import { Toasts } from './components/toast'
import { useSettings } from './lib/settings'
import { processPendingQueue } from './lib/sync'
import { Editor } from './pages/Editor'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { Onboarding } from './pages/Onboarding'
import { Settings } from './pages/Settings'

/** Redirige vers l'accueil de configuration tant que l'onboarding n'est pas terminé. */
function Guard({ children }: { children: ReactNode }) {
  const settings = useSettings()
  if (!settings) return null
  if (!settings.onboardingDone) return <Navigate to="/onboarding" replace />
  return children
}

/** Rejoue les publications et retraits mis en attente hors ligne. */
function usePendingQueue() {
  useEffect(() => {
    const run = () => void processPendingQueue().catch(() => undefined)
    if (navigator.onLine) run()
    window.addEventListener('online', run)
    return () => window.removeEventListener('online', run)
  }, [])
}

export function App() {
  usePendingQueue()
  return (
    <HashRouter>
      <div className="app">
        <Banners />
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Guard><Home /></Guard>} />
          <Route path="/recettes" element={<Guard><Library /></Guard>} />
          <Route path="/recette/:id" element={<Guard><Editor /></Guard>} />
          <Route path="/parametres" element={<Guard><Settings /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toasts />
      </div>
    </HashRouter>
  )
}
