import { useState } from 'react'
import { parseSessionInput, SessionParseError } from '@mr-chef/mc-client'
import { errorMessage, getMcClient } from '../lib/mc'
import { setSettings } from '../lib/settings'
import { deleteSecret, setSecret } from '../lib/vault'
import { useT } from '../i18n'

/**
 * Import assisté de la session Monsieur Cuisine : l'utilisateur colle une commande
 * « Copier en tant que cURL » ou l'en-tête cookie ; seuls les cookies WordPress sont gardés.
 */
export function SessionImport({ onConnected }: { onConnected?: (user: string | null) => void }) {
  const t = useT()
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
      setStatus({ kind: 'info', text: t.session.connected(name ?? null) })
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
          {t.session.step1a}
          <a href="https://www.monsieur-cuisine.com/fr/" target="_blank" rel="noreferrer">
            monsieur-cuisine.com
          </a>
          {t.session.step1b}
        </li>
        <li>{t.session.step2}</li>
        <li>
          {t.session.step3a}
          <strong>{t.session.step3b}</strong>
          {t.session.step3c}
          <span className="mono">cookie</span>
          {t.session.step3d}
        </li>
        <li>{t.session.step4}</li>
      </ol>
      <label className="field">
        <span className="sr-only">{t.session.label}</span>
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
          {busy ? t.session.checking : t.session.verify}
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
