import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '../i18n'
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
  const t = useT()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <>
      {!online && (
        <div className="banner warn" role="status">
          <Icon name="cloudOff" />
          <span>{t.banners.offline}</span>
        </div>
      )}
      {settings?.onboardingDone && settings.sessionExpired && (
        <div className="banner error" role="alert">
          <span className="grow">{t.banners.sessionExpired}</span>
          <Link to="/parametres#session">{t.banners.reconnect}</Link>
        </div>
      )}
      {needRefresh && (
        <div className="banner info" role="status">
          <span className="grow">{t.banners.update}</span>
          <button type="button" className="btn ghost" onClick={() => void updateServiceWorker(true)}>
            {t.banners.updateNow}
          </button>
          <button type="button" className="icon-btn" aria-label={t.banners.later} onClick={() => setNeedRefresh(false)}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </>
  )
}
