import { useState } from 'react'
import { Link } from 'react-router'
import { McClient } from '@mr-chef/mc-client'
import { errorMessage } from '../lib/mc'
import { generateSecret, normalizeRelayUrl } from '../lib/relay'
import { setSettings } from '../lib/settings'
import { setSecret } from '../lib/vault'
import { toast } from './toast'

/** Adresse et secret du relais personnel, avec test de connexion. */
export function RelayForm({
  initialUrl,
  initialSecret,
  onSaved,
  submitLabel = 'Enregistrer',
}: {
  initialUrl: string
  initialSecret: string
  onSaved?: () => void
  submitLabel?: string
}) {
  const [url, setUrl] = useState(initialUrl)
  const [secret, setSecretValue] = useState(initialSecret)
  const [status, setStatus] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function test(): Promise<boolean> {
    const relayUrl = normalizeRelayUrl(url)
    if (!relayUrl || !secret.trim()) {
      setStatus({ kind: 'error', text: 'Renseignez l’adresse et le secret du relais.' })
      return false
    }
    setBusy(true)
    try {
      const h = await new McClient({ url: relayUrl, secret: secret.trim() }, async () => null).health()
      setStatus({ kind: 'info', text: `Relais joignable (version ${h.version}).` })
      return true
    } catch (e) {
      setStatus({ kind: 'error', text: errorMessage(e) })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!(await test())) return
    await setSettings({ relayUrl: normalizeRelayUrl(url) })
    await setSecret('relay:secret', secret.trim())
    toast('Relais enregistré.')
    onSaved?.()
  }

  return (
    <form className="stack" onSubmit={save}>
      <p className="muted small">
        Le relais est votre petit serveur Cloudflare qui transmet les demandes à Monsieur Cuisine.{' '}
        <Link to="/aide#relais">Guide de mise en place</Link>
      </p>
      <label className="field">
        <span>Adresse du relais</span>
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://mr-chef-relay.votre-compte.workers.dev"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <label className="field">
        <span>
          Secret du relais <span className="hint">(identique à RELAY_SHARED_SECRET)</span>
        </span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={secret}
          onChange={(e) => setSecretValue(e.target.value)}
        />
      </label>
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            const s = generateSecret()
            setSecretValue(s)
            void navigator.clipboard?.writeText(s).then(
              () => toast('Secret généré et copié. Collez-le dans RELAY_SHARED_SECRET.'),
              () => toast('Secret généré.'),
            )
          }}
        >
          Générer un secret
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => void test()}>
          Tester le relais
        </button>
        <button type="submit" className="btn primary" disabled={busy}>
          {submitLabel}
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
