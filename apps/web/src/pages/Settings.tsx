import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { defaultSystemPrompt, getRobot } from '@mr-chef/recipe-schema'
import { AiKeyEditor } from '../components/AiKeyEditor'
import { Dialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { LanguagePicker } from '../components/LanguagePicker'
import { RelayChooser } from '../components/RelayChooser'
import { RobotPicker } from '../components/RobotPicker'
import { SessionImport } from '../components/SessionImport'
import { toast } from '../components/toast'
import { TransferPanel } from '../components/TransferPanel'
import { TopBar } from '../components/TopBar'
import type { ProviderId } from '../db/db'
import { PROVIDER_ORDER, PROVIDERS } from '../lib/ai'
import { hasRelay } from '../lib/mc'
import { countUnpublished, logoutAndWipe } from '../lib/reset'
import { setSettings, useSettings } from '../lib/settings'
import { getSecret, useStoredSecretIds } from '../lib/vault'
import { useLang, useT } from '../i18n'
import { NumberInput } from '../components/NumberInput'

export function Settings() {
  const settings = useSettings()
  const t = useT()
  const lang = useLang()
  const location = useLocation()
  const [relaySecret, setRelaySecret] = useState<string | null>(null)
  const stored = useStoredSecretIds()
  const [promptEdit, setPrompt] = useState<string | null>(null)
  const [logout, setLogout] = useState<null | { count: number; titles: string[] }>(null)
  const [wiping, setWiping] = useState(false)

  useEffect(() => {
    void getSecret('relay:secret').then((s) => setRelaySecret(s ?? ''))
  }, [])

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [location.hash, settings])

  if (!settings || relaySecret === null || !stored) return null
  const keys = Object.fromEntries(PROVIDER_ORDER.map((p) => [p, stored.has(`ai:${p}`)])) as Record<ProviderId, boolean>
  const defaultPrompt = defaultSystemPrompt(lang)
  const prompt = promptEdit ?? settings.systemPrompt ?? defaultPrompt
  const robot = getRobot(settings.robotId)
  const promptChanged = prompt !== (settings.systemPrompt ?? defaultPrompt)

  async function doLogout() {
    setWiping(true)
    await logoutAndWipe()
    // Rechargement complet : base, coffre et service worker repartent de zéro.
    window.location.replace(`${window.location.pathname}#/onboarding`)
    window.location.reload()
  }

  return (
    <>
      <TopBar title={t.settings.title}>
        <Link to="/aide" className="icon-btn" aria-label={t.common.help}>
          <Icon name="help" />
        </Link>
      </TopBar>
      <main className="main">
        <section className="section" id="langue">
          <h2>{t.lang.label}</h2>
          <div className="card stack">
            <LanguagePicker />
          </div>
        </section>

        <section className="section" id="ia">
          <h2>
            <Icon name="key" /> {t.settings.ai}
          </h2>
          <div className="card stack">
            <label className="field">
              <span>{t.settings.activeProvider}</span>
              <select
                value={settings.activeProvider ?? ''}
                onChange={(e) => void setSettings({ activeProvider: (e.target.value || null) as ProviderId | null })}
              >
                {!settings.activeProvider && <option value="">{t.settings.none}</option>}
                {PROVIDER_ORDER.filter((p) => keys[p]).map((p) => (
                  <option key={p} value={p}>
                    {PROVIDERS[p].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {PROVIDER_ORDER.map((p) => (
            <details key={p} className="card" open={keys[p] || undefined}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 32 }}>
                {PROVIDERS[p].label} {keys[p] ? <span className="badge published">{t.settings.keySaved}</span> : <span className="muted small">{t.settings.noKey}</span>}
              </summary>
              <div style={{ marginTop: 12 }}>
                <AiKeyEditor provider={p} />
              </div>
            </details>
          ))}
        </section>

        <section className="section" id="robot">
          <h2>{t.settings.robot}</h2>
          <div className="card stack">
            <RobotPicker value={settings.robotId} onChange={(robotId) => void setSettings({ robotId })} />
            <label className="row">
              <span className="grow">{t.settings.defaultServings}</span>
              <NumberInput
                min={1}
                max={20}
                value={settings.defaultServings}
                onChange={(defaultServings) => void setSettings({ defaultServings })}
                style={{ width: 90 }}
              />
            </label>
          </div>
        </section>

        <section className="section" id="prompt">
          <h2>{t.settings.prompt}</h2>
          <div className="card stack">
            <p className="muted small">
              {t.settings.promptIntro(robot.name)}
            </p>
            <textarea rows={14} className="mono" aria-label={t.settings.prompt} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <div className="row end">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setPrompt(null)
                  void setSettings({ systemPrompt: null })
                  toast(t.settings.promptRestored)
                }}
              >
                {t.settings.promptRestore}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!promptChanged}
                onClick={() => {
                  void setSettings({ systemPrompt: prompt === defaultPrompt ? null : prompt })
                  toast(t.settings.promptSaved)
                }}
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </section>

        <section className="section" id="relais">
          <h2>{t.settings.relay}</h2>
          <div className="card stack">
            <RelayChooser relaySecret={relaySecret} />
          </div>
        </section>

        <section className="section" id="transfert">
          <h2>{t.settings.transfer}</h2>
          <div className="card">
            <TransferPanel />
          </div>
        </section>

        <section className="section" id="session">
          <h2>{t.settings.account}</h2>
          <div className="card stack">
            {settings.mcUser && !settings.sessionExpired ? (
              <p className="notice info">
                {t.settings.connectedAs}
                <strong>{settings.mcUser}</strong>
                {settings.mcExpiresAt && t.settings.until(new Date(settings.mcExpiresAt).toLocaleDateString(t.locale))}.
              </p>
            ) : settings.sessionExpired ? (
              <p className="notice error">{t.settings.expired}</p>
            ) : (
              <p className="notice warn">{t.settings.noAccount}</p>
            )}
            {hasRelay(settings) ? <SessionImport /> : <p className="muted">{t.settings.relayFirst}</p>}
          </div>
        </section>

        <section className="section" id="deconnexion">
          <h2>{t.settings.logout}</h2>
          <div className="card stack">
            <p className="muted small">{t.settings.logoutIntro}</p>
            <button type="button" className="btn danger" onClick={() => void countUnpublished().then(setLogout)}>
              <Icon name="logout" /> {t.settings.logoutButton}
            </button>
          </div>
        </section>
      </main>

      <Dialog
        open={!!logout}
        onClose={() => !wiping && setLogout(null)}
        title={t.settings.logoutTitle}
        actions={
          <>
            <button type="button" className="btn ghost" disabled={wiping} onClick={() => setLogout(null)}>
              {t.common.cancel}
            </button>
            <button type="button" className="btn danger" disabled={wiping} onClick={() => void doLogout()}>
              {wiping ? t.settings.wiping : t.settings.wipe}
            </button>
          </>
        }
      >
        {logout && logout.count > 0 ? (
          <>
            <p className="notice error">
              <strong>{t.settings.lost(logout.count)}</strong>
            </p>
            <ul>
              {logout.titles.slice(0, 8).map((title, i) => (
                <li key={i}>{title}</li>
              ))}
              {logout.titles.length > 8 && <li>{t.settings.others(logout.titles.length - 8)}</li>}
            </ul>
          </>
        ) : (
          <p>{t.settings.allPublished}</p>
        )}
        <p className="muted small">{t.settings.alsoWiped}</p>
      </Dialog>
    </>
  )
}
