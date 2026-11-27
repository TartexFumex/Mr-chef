import { useCallback, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { canScanQr, QrScanner } from '../components/QrScanner'
import { TopBar } from '../components/TopBar'
import { applyBundle, decryptBundle, describeBundle, extractCode, TransferError, type TransferBundle } from '../lib/transfer'

/** Import d'une configuration depuis un QR code ou un lien chiffré. */
export function Import() {
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
      setError(err instanceof TransferError ? err.message : 'Code de configuration illisible.')
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
      <TopBar title="Importer une configuration" back="/onboarding" />
      <main className="main stack">
        {bundle ? (
          <div className="card stack">
            <h2>Configuration déchiffrée</h2>
            <p>Elle contient :</p>
            <ul>
              {describeBundle(bundle).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="muted small">Les éléments présents remplacent ceux de cet appareil. Vos recettes ne sont pas touchées.</p>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={() => setBundle(null)}>
                Annuler
              </button>
              <button type="button" className="btn primary" onClick={() => void confirm()}>
                Importer
              </button>
            </div>
          </div>
        ) : (
          <form className="card stack" onSubmit={unlock}>
            <p className="muted small">
              Sur l’appareil déjà configuré : Paramètres › Transférer vers un autre appareil › Générer le QR code.{' '}
              <Link to="/aide#transfert">En savoir plus</Link>
            </p>
            {scanning ? (
              <QrScanner onResult={onScan} onCancel={() => setScanning(false)} />
            ) : (
              <>
                {canScanQr() && (
                  <button type="button" className="btn" onClick={() => setScanning(true)}>
                    Scanner le QR code
                  </button>
                )}
                <label className="field">
                  <span>{canScanQr() ? 'ou collez le lien' : 'Lien de configuration'}</span>
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
              <span>Phrase secrète</span>
              <input
                type="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="mono"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
            </label>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn primary" disabled={busy || !code.trim() || !passphrase.trim()}>
              {busy ? 'Déchiffrement…' : 'Déchiffrer'}
            </button>
          </form>
        )}
      </main>
    </>
  )
}
