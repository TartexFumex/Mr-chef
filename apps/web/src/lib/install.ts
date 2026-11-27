import { useSyncExternalStore } from 'react'

/** Événement `beforeinstallprompt` (Chrome, Edge, Samsung Internet), absent des types DOM standard. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** À appeler au démarrage : l'événement peut arriver avant le rendu de la page d'accueil. */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    notify()
  })
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isMobile(): boolean {
  return isIos() || /Android/i.test(navigator.userAgent) || !!window.matchMedia?.('(pointer: coarse)').matches
}

export type InstallMode = 'prompt' | 'ios' | null

function snapshot(): InstallMode {
  if (installed || isStandalone() || !isMobile()) return null
  if (deferred) return 'prompt'
  return isIos() ? 'ios' : null
}

/** Comment proposer l'installation sur cet appareil, ou null si ce n'est pas possible ou déjà fait. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    snapshot,
    () => null,
  )
}

/** Affiche la boîte d'installation du navigateur ; renvoie true si l'utilisateur accepte. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  deferred = null
  await e.prompt()
  const { outcome } = await e.userChoice
  notify()
  return outcome === 'accepted'
}
