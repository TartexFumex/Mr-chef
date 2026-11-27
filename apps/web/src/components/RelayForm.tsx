import { useState } from 'react'
import { Link } from 'react-router'
import { McClient } from '@mr-chef/mc-client'
import { errorMessage } from '../lib/mc'
import { generateSecret, normalizeRelayUrl } from '../lib/relay'
import { setSettings } from '../lib/settings'
import { deleteSecret, setSecret } from '../lib/vault'
import { toast } from './toast'
import { useT } from '../i18n'

/** Adresse et secret du relais personnel, avec test de connexion. */
export function RelayForm({
  initialUrl,
  initialSecret,
  onSaved,
  submitLabel,
}: {
  initialUrl: string
  initialSecret: string
  onSaved?: () => void
  submitLabel?: string
}) {
  const t = useT()
  const [url, setUrl] = useState(initialUrl)
  const [secret, setSecretValue] = useState(initialSecret)
  const [status, setStatus] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function test(): Promise<boolean> {
    const relayUrl = normalizeRelayUrl(url)
    if (!relayUrl) {
      setStatus({ kind: 'error', text: t.relay.needUrl })
      return false
    }
    setBusy(true)
    try {
      const h = await new McClient({ url: relayUrl, secret: secret.trim() }, async () => null).health()
      setStatus({ kind: 'info', text: t.relay.reachable(h.version, !!h.public) })
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
    await setSettings({ relayUrl: normalizeRelayUrl(url), relayMode: 'custom' })
    if (secret.trim()) await setSecret('relay:secret', secret.trim())
    else await deleteSecret('relay:secret')
    toast(t.relay.saved)
    onSaved?.()
  }

  return (
    <form className="stack" onSubmit={save}>
      <p className="muted small">
        {t.relay.formIntro} <Link to="/aide#relais">{t.relay.guide}</Link>
      </p>
      <label className="field">
        <span>{t.relay.url}</span>
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder={t.relay.placeholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <label className="field">
        <span>
          {t.relay.secret} <span className="hint">{t.relay.secretHint}</span>
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
              () => toast(t.relay.secretCopied),
              () => toast(t.relay.secretGenerated),
            )
          }}
        >
          {t.relay.generate}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => void test()}>
          {t.relay.test}
        </button>
        <button type="submit" className="btn primary" disabled={busy}>
          {submitLabel ?? t.common.save}
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
