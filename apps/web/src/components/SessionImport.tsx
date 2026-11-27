import { useState } from 'react'
import { parseSessionInput, SessionParseError } from '@mr-chef/mc-client'
import { errorMessage, getMcClient } from '../lib/mc'
import { setSettings } from '../lib/settings'
import { deleteSecret, setSecret } from '../lib/vault'

/**
 * Import assisté de la session Monsieur Cuisine : l'utilisateur colle une commande
 * « Copier en tant que cURL » ou l'en-tête cookie ; seuls les cookies WordPress sont gardés.
 */
export function SessionImport({ onConnected }: { onConnected?: (user: string | null) => void }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function connect(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      const parsed = parseSessionInput(text)
      await setSecret('mc:session', parsed.cookie)
      const client = await getMcClient()
      const me = await client.getUser()
      const name = (typeof me?.name === 'string' && me.name) || parsed.user
      await setSettings({
        mcUser: name ?? null,
        mcExpiresAt: parsed.expiresAt?.getTime() ?? null,
        sessionExpired: false,
      })
      setText('')
      setStatus({ kind: 'info', text: `Connecté${name ? ` en tant que ${name}` : ''}.` })
      onConnected?.(name ?? null)
    } catch (err) {
      if (!(err instanceof SessionParseError)) await deleteSecret('mc:session')
      setStatus({ kind: 'error', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack" onSubmit={connect}>
      <ol className="howto small">
        <li>
          Ouvrez{' '}
          <a href="https://www.monsieur-cuisine.com/fr/" target="_blank" rel="noreferrer">
            monsieur-cuisine.com
          </a>{' '}
          sur un ordinateur et connectez-vous avec votre compte Lidl.
        </li>
        <li>Ouvrez les outils de développement (F12), onglet Réseau, puis rechargez la page.</li>
        <li>
          Clic droit sur la première requête « monsieur-cuisine.com » › Copier › <strong>Copier en tant que cURL</strong>{' '}
          (ou copiez la valeur de l’en-tête <span className="mono">cookie</span>).
        </li>
        <li>Collez le tout ci-dessous. Seuls les cookies de session WordPress sont conservés, chiffrés sur cet appareil.</li>
      </ol>
      <label className="field">
        <span className="sr-only">Session copiée</span>
        <textarea
          rows={4}
          spellCheck={false}
          autoComplete="off"
          placeholder="curl 'https://www.monsieur-cuisine.com/fr/' -H 'cookie: wordpress_logged_in_…'"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div className="row">
        <button type="submit" className="btn primary" disabled={busy || !text.trim()}>
          {busy ? 'Vérification…' : 'Vérifier et enregistrer'}
        </button>
      </div>
      {status && (
        <p className={`notice ${status.kind}`} role="status">
          {status.text}
        </p>
      )}
    </form>
  )
}
