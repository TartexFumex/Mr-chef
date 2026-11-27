import { Link } from 'react-router'
import { PUBLIC_RELAY_URL, type RelayMode } from '../lib/relay'
import { setSettings, useSettings } from '../lib/settings'
import { RelayForm } from './RelayForm'

/** Avertissement affiché partout où l'on choisit le relais public. */
export function PublicRelayNotice() {
  return (
    <p className="notice info small">
      Le relais public est hébergé par l’administrateur de ce site, chez Cloudflare. À chaque envoi, votre session Monsieur
      Cuisine y transite en HTTPS pour être transmise à monsieur-cuisine.com. Elle n’y est ni enregistrée ni journalisée,
      mais vous faites confiance à cet administrateur.{' '}
      <Link to="/aide#relais">Utiliser votre propre relais</Link> évite cet intermédiaire.
    </p>
  )
}

/** Choix entre le relais public du site et un relais personnel. */
export function RelayChooser({ relaySecret, onDone }: { relaySecret: string; onDone?: () => void }) {
  const settings = useSettings()
  if (!settings) return null
  const mode: RelayMode = PUBLIC_RELAY_URL ? settings.relayMode : 'custom'
  const choose = (relayMode: RelayMode) => void setSettings({ relayMode })

  return (
    <div className="stack">
      {PUBLIC_RELAY_URL && (
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">Relais</legend>
          <label className="choice">
            <input type="radio" name="relay-mode" checked={mode === 'public'} onChange={() => choose('public')} />
            <span>
              <strong>Relais public de Mr Chef</strong> (recommandé)
              <br />
              <span className="muted small">Rien à installer. Limité à 120 requêtes par minute et par connexion.</span>
            </span>
          </label>
          <label className="choice">
            <input type="radio" name="relay-mode" checked={mode === 'custom'} onChange={() => choose('custom')} />
            <span>
              <strong>Mon propre relais</strong>
              <br />
              <span className="muted small">Votre Worker Cloudflare : vos données ne passent que par votre compte.</span>
            </span>
          </label>
        </fieldset>
      )}
      {mode === 'public' ? (
        <>
          <PublicRelayNotice />
          {onDone && (
            <button type="button" className="btn primary" onClick={onDone}>
              Continuer avec le relais public
            </button>
          )}
        </>
      ) : (
        <RelayForm
          initialUrl={settings.relayUrl}
          initialSecret={relaySecret}
          submitLabel={onDone ? 'Enregistrer et continuer' : 'Enregistrer'}
          onSaved={onDone}
        />
      )}
    </div>
  )
}
