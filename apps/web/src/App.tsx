import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Banners } from './components/Banners'
import { Toasts } from './components/toast'
import { setCurrentLang, useLang } from './i18n'
import { useSettings } from './lib/settings'
import { processPendingQueue } from './lib/sync'
import { Editor } from './pages/Editor'
import { Help } from './pages/Help'
import { Home } from './pages/Home'
import { Import } from './pages/Import'
import { Library } from './pages/Library'
import { Onboarding } from './pages/Onboarding'
import { RecipeView } from './pages/RecipeView'
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

/** Applique la langue choisie (ou celle du navigateur) à tout le document. */
function useDocumentLang() {
  const lang = useLang()
  // Avant le rendu des enfants : les formats hors React (durées, erreurs) lisent la langue active.
  setCurrentLang(lang)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
}

export function App() {
  usePendingQueue()
  useDocumentLang()
  return (
    <HashRouter>
      <div className="app">
        <Banners />
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/importer" element={<Import />} />
          <Route path="/aide" element={<Help />} />
          <Route path="/" element={<Guard><Home /></Guard>} />
          <Route path="/recettes" element={<Guard><Library /></Guard>} />
          <Route path="/recette/:id" element={<Guard><RecipeView /></Guard>} />
          <Route path="/recette/:id/modifier" element={<Guard><Editor /></Guard>} />
          <Route path="/parametres" element={<Guard><Settings /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toasts />
      </div>
    </HashRouter>
  )
}
