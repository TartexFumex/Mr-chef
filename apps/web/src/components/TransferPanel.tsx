import { useState } from 'react'
import { renderSVG } from 'uqr'
import { buildBundle, describeBundle, encryptBundle, generatePassphrase, transferLink, type TransferChoice } from '../lib/transfer'
import { Icon } from './Icon'
import { toast } from './toast'
import { useT } from '../i18n'

const OPTIONS: (keyof TransferChoice)[] = ['ai', 'relay', 'mc', 'prefs']

/** Facilitateur de configuration : QR code chiffré à scanner depuis un autre appareil. */
export function TransferPanel() {
  const t = useT()
  const [choice, setChoice] = useState<TransferChoice>({ ai: true, relay: true, mc: true, prefs: true })
  const [result, setResult] = useState<null | { link: string; svg: string; passphrase: string; contents: string[] }>(null)
  const [busy, setBusy] = useState(false)

  async function generate() {
    setBusy(true)
    try {
      const bundle = await buildBundle(choice)
      const passphrase = generatePassphrase()
      const link = transferLink(await encryptBundle(bundle, passphrase))
      const svg = renderSVG(link, { ecc: 'L', border: 2, pixelSize: 6, blackColor: '#16261E', whiteColor: '#FFFFFF' })
      setResult({ link, svg, passphrase, contents: describeBundle(bundle) })
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="stack">
        <p className="notice warn small">
          {t.transfer.warning}
        </p>
        <div className="qr" role="img" aria-label={t.transfer.qrLabel} dangerouslySetInnerHTML={{ __html: result.svg }} />
        <p style={{ textAlign: 'center' }}>
          {t.transfer.passphraseIs}
          <br />
          <strong className="mono passphrase">{result.passphrase}</strong>
        </p>
        <ul className="small muted">
          {result.contents.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() => void navigator.clipboard?.writeText(result.link).then(() => toast(t.transfer.linkCopied))}
          >
            <Icon name="copy" /> {t.transfer.copyLink}
          </button>
          <button type="button" className="btn primary" onClick={() => setResult(null)}>
            {t.transfer.done}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <p className="muted small">
        {t.transfer.intro1}
        <strong>{t.importPage.title}</strong>
        {t.transfer.intro2}
      </p>
      {OPTIONS.map((id) => (
        <label key={id} className="check">
          <input type="checkbox" checked={choice[id]} onChange={(e) => setChoice({ ...choice, [id]: e.target.checked })} />
          <span>{t.transfer.options[id]}</span>
        </label>
      ))}
      <button
        type="button"
        className="btn primary"
        disabled={busy || !Object.values(choice).some(Boolean)}
        onClick={() => void generate()}
      >
        {busy ? t.transfer.encrypting : t.transfer.generate}
      </button>
    </div>
  )
}
