import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { DEFAULT_SYSTEM_PROMPT, getRobot } from '@mr-chef/recipe-schema'
import { AiKeyEditor } from '../components/AiKeyEditor'
import { Dialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { RelayForm } from '../components/RelayForm'
import { RobotPicker } from '../components/RobotPicker'
import { SessionImport } from '../components/SessionImport'
import { toast } from '../components/toast'
import { TopBar } from '../components/TopBar'
import type { ProviderId } from '../db/db'
import { PROVIDER_ORDER, PROVIDERS } from '../lib/ai'
import { configLink } from '../lib/relay'
import { countUnpublished, logoutAndWipe } from '../lib/reset'
import { setSettings, useSettings } from '../lib/settings'
import { getSecret, hasSecret } from '../lib/vault'

export function Settings() {
  const settings = useSettings()
  const location = useLocation()
  const [relaySecret, setRelaySecret] = useState<string | null>(null)
  const [keys, setKeys] = useState<Record<ProviderId, boolean>>({ mistral: false, openai: false, anthropic: false })
  const [prompt, setPrompt] = useState<string | null>(null)
  const [logout, setLogout] = useState<null | { count: number; titles: string[] }>(null)
  const [wiping, setWiping] = useState(false)

  async function refreshKeys() {
    const out = { ...keys }
    for (const p of PROVIDER_ORDER) out[p] = await hasSecret(`ai:${p}`)
    setKeys(out)
  }
  useEffect(() => {
    void getSecret('relay:secret').then((s) => setRelaySecret(s ?? ''))
    void refreshKeys()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings && prompt === null) setPrompt(settings.systemPrompt ?? DEFAULT_SYSTEM_PROMPT)
  }, [settings, prompt])

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [location.hash, settings])

  if (!settings || relaySecret === null || prompt === null) return null
  const robot = getRobot(settings.robotId)
  const promptChanged = prompt !== (settings.systemPrompt ?? DEFAULT_SYSTEM_PROMPT)

  async function doLogout() {
    setWiping(true)
    await logoutAndWipe()
    // Rechargement complet : base, coffre et service worker repartent de zéro.
    window.location.replace(`${window.location.pathname}#/onboarding`)
    window.location.reload()
  }

  return (
    <>
      <TopBar title="Paramètres" />
      <main className="main">
        <section className="section" id="ia">
          <h2>
            <Icon name="key" /> Intelligence artificielle
          </h2>
          <div className="card stack">
            <label className="field">
              <span>Fournisseur actif</span>
              <select
                value={settings.activeProvider ?? ''}
                onChange={(e) => void setSettings({ activeProvider: (e.target.value || null) as ProviderId | null })}
              >
                {!settings.activeProvider && <option value="">Aucun</option>}
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
                {PROVIDERS[p].label} {keys[p] ? <span className="badge published">Clé enregistrée</span> : <span className="muted small">(aucune clé)</span>}
              </summary>
              <div style={{ marginTop: 12 }}>
                <AiKeyEditor provider={p} onChange={() => void refreshKeys()} />
              </div>
            </details>
          ))}
        </section>

        <section className="section" id="robot">
          <h2>Robot</h2>
          <div className="card stack">
            <RobotPicker value={settings.robotId} onChange={(robotId) => void setSettings({ robotId })} />
            <label className="row">
              <span className="grow">Portions par défaut</span>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.defaultServings}
                onChange={(e) => void setSettings({ defaultServings: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                style={{ width: 90 }}
              />
            </label>
          </div>
        </section>

        <section className="section" id="prompt">
          <h2>Prompt système</h2>
          <div className="card stack">
            <p className="muted small">
              Consignes données à l’IA avant votre demande. <span className="mono">{'{{robot}}'}</span> devient « {robot.name} » et{' '}
              <span className="mono">{'{{programs}}'}</span> la liste de ses programmes.
            </p>
            <textarea rows={14} className="mono" aria-label="Prompt système" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <div className="row end">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setPrompt(DEFAULT_SYSTEM_PROMPT)
                  void setSettings({ systemPrompt: null })
                  toast('Prompt par défaut restauré.')
                }}
              >
                Restaurer le prompt par défaut
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!promptChanged}
                onClick={() => {
                  void setSettings({ systemPrompt: prompt === DEFAULT_SYSTEM_PROMPT ? null : prompt })
                  toast('Prompt enregistré.')
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </section>

        <section className="section" id="relais">
          <h2>Relais</h2>
          <div className="card stack">
            <RelayForm initialUrl={settings.relayUrl} initialSecret={relaySecret} onSaved={() => void getSecret('relay:secret').then((s) => setRelaySecret(s ?? ''))} />
            {settings.relayUrl && relaySecret && (
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  void navigator.clipboard
                    ?.writeText(configLink(settings.relayUrl, relaySecret))
                    .then(() => toast('Lien copié. Ouvrez-le sur votre téléphone pour préremplir le relais.'))
                }
              >
                <Icon name="copy" /> Copier le lien de configuration
              </button>
            )}
          </div>
        </section>

        <section className="section" id="session">
          <h2>Compte Monsieur Cuisine</h2>
          <div className="card stack">
            {settings.mcUser && !settings.sessionExpired ? (
              <p className="notice info">
                Connecté en tant que <strong>{settings.mcUser}</strong>
                {settings.mcExpiresAt && ` jusqu’au ${new Date(settings.mcExpiresAt).toLocaleDateString('fr-FR')}`}.
              </p>
            ) : settings.sessionExpired ? (
              <p className="notice error">Session expirée : recollez une nouvelle session ci-dessous.</p>
            ) : (
              <p className="notice warn">Aucun compte connecté.</p>
            )}
            {settings.relayUrl ? <SessionImport /> : <p className="muted">Configurez d’abord le relais.</p>}
          </div>
        </section>

        <section className="section" id="deconnexion">
          <h2>Déconnexion</h2>
          <div className="card stack">
            <p className="muted small">Efface la session, les clés, toutes les recettes de cet appareil et le cache de l’application.</p>
            <button type="button" className="btn danger" onClick={() => void countUnpublished().then(setLogout)}>
              <Icon name="logout" /> Se déconnecter
            </button>
          </div>
        </section>
      </main>

      <Dialog
        open={!!logout}
        onClose={() => !wiping && setLogout(null)}
        title="Se déconnecter et tout effacer ?"
        actions={
          <>
            <button type="button" className="btn ghost" disabled={wiping} onClick={() => setLogout(null)}>
              Annuler
            </button>
            <button type="button" className="btn danger" disabled={wiping} onClick={() => void doLogout()}>
              {wiping ? 'Effacement…' : 'Tout effacer'}
            </button>
          </>
        }
      >
        {logout && logout.count > 0 ? (
          <>
            <p className="notice error">
              <strong>
                {logout.count} recette{logout.count > 1 ? 's' : ''} non publiée{logout.count > 1 ? 's' : ''} (ou modifiée
                {logout.count > 1 ? 's' : ''} depuis la publication) sera{logout.count > 1 ? 'ont' : ''} définitivement perdue
                {logout.count > 1 ? 's' : ''} :
              </strong>
            </p>
            <ul>
              {logout.titles.slice(0, 8).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
              {logout.titles.length > 8 && <li>… et {logout.titles.length - 8} autre(s)</li>}
            </ul>
          </>
        ) : (
          <p>Toutes vos recettes sont publiées. Elles pourront être réimportées depuis Monsieur Cuisine.</p>
        )}
        <p className="muted small">Vos clés IA et la configuration du relais seront aussi effacées.</p>
      </Dialog>
    </>
  )
}
