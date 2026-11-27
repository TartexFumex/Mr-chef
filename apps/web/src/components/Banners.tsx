import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useSettings } from '../lib/settings'
import { Icon } from './Icon'

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** Bandeaux globaux : hors ligne, session Monsieur Cuisine expirée, mise à jour disponible. */
export function Banners() {
  const online = useOnline()
  const settings = useSettings()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <>
      {!online && (
        <div className="banner warn" role="status">
          <Icon name="cloudOff" />
          <span>Hors ligne. Vos recettes restent modifiables ; les envois partiront au retour du réseau.</span>
        </div>
      )}
      {settings?.onboardingDone && settings.sessionExpired && (
        <div className="banner error" role="alert">
          <span className="grow">Session Monsieur Cuisine expirée.</span>
          <Link to="/parametres#session">Reconnecter</Link>
        </div>
      )}
      {needRefresh && (
        <div className="banner info" role="status">
          <span className="grow">Une nouvelle version de Mr Chef est prête.</span>
          <button type="button" className="btn ghost" onClick={() => void updateServiceWorker(true)}>
            Mettre à jour
          </button>
          <button type="button" className="icon-btn" aria-label="Plus tard" onClick={() => setNeedRefresh(false)}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </>
  )
}
