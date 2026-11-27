import { useState } from 'react'
import { Link } from 'react-router'
import { useT } from '../i18n'
import { promptInstall, useInstallMode } from '../lib/install'
import { setSettings, useSettings } from '../lib/settings'
import { Icon } from './Icon'

/** Délai avant de reproposer l'installation après un refus. */
const SNOOZE = 90 * 24 * 3600 * 1000

/**
 * Invitation discrète à installer Mr Chef sur l'écran d'accueil du téléphone :
 * bouton natif sur Android, marche à suivre sur iPhone. Écartée, elle ne revient pas avant 90 jours.
 */
export function InstallPrompt() {
  const t = useT()
  const settings = useSettings()
  const mode = useInstallMode()
  const [now] = useState(() => Date.now())
  if (!settings || !mode) return null
  if (settings.installDismissedAt && now - settings.installDismissedAt < SNOOZE) return null

  const dismiss = () => void setSettings({ installDismissedAt: Date.now() })

  return (
    <aside className="notice info install-prompt" aria-label={t.install.button}>
      <Icon name="download" />
      <div className="grow stack" style={{ gap: 8 }}>
        {mode === 'prompt' ? (
          <span>{t.install.text}</span>
        ) : (
          <span>
            {t.install.iosA}
            <strong className="nowrap">
              <Icon name="share" /> {t.install.iosShare}
            </strong>
            {t.install.iosB}
          </span>
        )}
        <div className="row" style={{ gap: 8 }}>
          {mode === 'prompt' && (
            <button type="button" className="btn primary" onClick={() => void promptInstall()}>
              {t.install.button}
            </button>
          )}
          <Link to="/aide#installer" className="btn ghost">
            {t.install.more}
          </Link>
        </div>
      </div>
      <button type="button" className="icon-btn" aria-label={t.install.dismiss} title={t.install.dismiss} onClick={dismiss}>
        <Icon name="close" />
      </button>
    </aside>
  )
}
