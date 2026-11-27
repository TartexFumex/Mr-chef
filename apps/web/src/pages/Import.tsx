import { useCallback, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { canScanQr, QrScanner } from '../components/QrScanner'
import { TopBar } from '../components/TopBar'
import { describeError, useT } from '../i18n'
import { applyBundle, decryptBundle, describeBundle, extractCode, formatPassphraseInput, type TransferBundle } from '../lib/transfer'

/** Import d'une configuration depuis un QR code ou un lien chiffré. */
export function Import() {
  const t = useT()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [code, setCode] = useState(params.get('c') ?? '')
  const [scanning, setScanning] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [bundle, setBundle] = useState<TransferBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const onScan = useCallback((text: string) => {
    setCode(extractCode(text))
    setScanning(false)
  }, [])

  async function unlock(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setBundle(await decryptBundle(extractCode(code), passphrase))
    } catch (err) {
      setError(err instanceof Error ? describeError(err, t) : t.errors.transfer.unreadable!)
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!bundle) return
    const ready = await applyBundle(bundle)
    navigate(ready ? '/' : '/onboarding', { replace: true })
  }

  return (
    <>
      <TopBar title={t.importPage.title} back="/onboarding" />
      <main className="main stack">
        {bundle ? (
          <div className="card stack">
            <h2>{t.importPage.decrypted}</h2>
            <p>{t.importPage.contains}</p>
            <ul>
              {describeBundle(bundle).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="muted small">{t.importPage.replaces}</p>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={() => setBundle(null)}>
                {t.common.cancel}
              </button>
              <button type="button" className="btn primary" onClick={() => void confirm()}>
                {t.importPage.import}
              </button>
            </div>
          </div>
        ) : (
          <form className="card stack" onSubmit={unlock}>
            <p className="muted small">
              {t.importPage.where} <Link to="/aide#transfert">{t.importPage.more}</Link>
            </p>
            {scanning ? (
              <QrScanner onResult={onScan} onCancel={() => setScanning(false)} />
            ) : (
              <>
                {canScanQr() && (
                  <button type="button" className="btn" onClick={() => setScanning(true)}>
                    {t.importPage.scan}
                  </button>
                )}
                <label className="field">
                  <span>{canScanQr() ? t.importPage.orPaste : t.importPage.link}</span>
                  <textarea
                    rows={3}
                    spellCheck={false}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="https://…/#/importer?c=…"
                  />
                </label>
              </>
            )}
            <label className="field">
              <span>{t.importPage.passphrase}</span>
              <input
                type="text"
                autoCapitalize="characters"
                autoCorrect="off"
                maxLength={19}
                autoComplete="off"
                spellCheck={false}
                className="mono"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={passphrase}
                onChange={(e) => setPassphrase(formatPassphraseInput(e.target.value))}
              />
            </label>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn primary" disabled={busy || !code.trim() || !passphrase.trim()}>
              {busy ? t.importPage.decrypting : t.importPage.decrypt}
            </button>
          </form>
        )}
      </main>
    </>
  )
}
