import { useState } from 'react'
import { renderSVG } from 'uqr'
import { buildBundle, describeBundle, encryptBundle, generatePassphrase, transferLink, type TransferChoice } from '../lib/transfer'
import { Icon } from './Icon'
import { toast } from './toast'

const OPTIONS: { id: keyof TransferChoice; label: string }[] = [
  { id: 'ai', label: 'Clés IA' },
  { id: 'relay', label: 'Relais (adresse et secret)' },
  { id: 'mc', label: 'Session Monsieur Cuisine' },
  { id: 'prefs', label: 'Réglages (robot, modèles, prompt, portions)' },
]

/** Facilitateur de configuration : QR code chiffré à scanner depuis un autre appareil. */
export function TransferPanel() {
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
          Ce QR code donne accès à vos clés et à votre compte. Ne le partagez pas et ne le photographiez pas : scannez-le
          directement depuis l’autre appareil, puis fermez cette fenêtre.
        </p>
        <div className="qr" role="img" aria-label="QR code de configuration" dangerouslySetInnerHTML={{ __html: result.svg }} />
        <p style={{ textAlign: 'center' }}>
          Phrase secrète à saisir sur l’autre appareil :<br />
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
            onClick={() => void navigator.clipboard?.writeText(result.link).then(() => toast('Lien copié (sans la phrase secrète).'))}
          >
            <Icon name="copy" /> Copier le lien
          </button>
          <button type="button" className="btn primary" onClick={() => setResult(null)}>
            Terminé
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <p className="muted small">
        Configurez votre téléphone en un scan : Mr Chef crée un QR code chiffré et une phrase secrète affichée à part. Sur le
        téléphone, ouvrez Mr Chef › <strong>Importer une configuration</strong>, scannez, puis tapez la phrase.
      </p>
      {OPTIONS.map((o) => (
        <label key={o.id} className="check">
          <input type="checkbox" checked={choice[o.id]} onChange={(e) => setChoice({ ...choice, [o.id]: e.target.checked })} />
          <span>{o.label}</span>
        </label>
      ))}
      <button
        type="button"
        className="btn primary"
        disabled={busy || !Object.values(choice).some(Boolean)}
        onClick={() => void generate()}
      >
        {busy ? 'Chiffrement…' : 'Générer le QR code'}
      </button>
    </div>
  )
}
