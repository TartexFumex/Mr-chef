import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { DEFAULT_ROBOT_ID, type RobotId } from '@mr-chef/recipe-schema'
import { AiKeyEditor } from '../components/AiKeyEditor'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { RelayChooser } from '../components/RelayChooser'
import { RobotPicker } from '../components/RobotPicker'
import { SessionImport } from '../components/SessionImport'
import type { ProviderId } from '../db/db'
import { PROVIDER_ORDER, PROVIDERS } from '../lib/ai'
import { hasRelay } from '../lib/mc'
import { setSettings, useSettings } from '../lib/settings'
import { getSecret, useStoredSecretIds } from '../lib/vault'

const STEPS = ['Relais', 'Monsieur Cuisine', 'Robot', 'Intelligence artificielle'] as const

/** Premier lancement : relais, session Monsieur Cuisine, robot, clé IA. */
export function Onboarding() {
  const settings = useSettings()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [relaySecret, setRelaySecret] = useState<string | null>(null)
  const [robotChoice, setRobot] = useState<RobotId | null>(null)
  const [provider, setProvider] = useState<ProviderId>('mistral')

  useEffect(() => {
    void getSecret('relay:secret').then((s) => setRelaySecret(s ?? ''))
  }, [])
  const stored = useStoredSecretIds()

  if (!settings || relaySecret === null || !stored) return null
  const robot = robotChoice ?? settings.robotId ?? DEFAULT_ROBOT_ID
  const hasKey = PROVIDER_ORDER.some((p) => stored.has(`ai:${p}`))
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))

  async function finish() {
    await setSettings({ onboardingDone: true, robotId: robot })
    navigate('/', { replace: true })
  }

  return (
    <main className="main">
      <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
        <Logo size={48} />
        <h1 style={{ margin: 0, fontSize: '1.5rem' }} className="grow">
          Bienvenue dans Mr Chef
        </h1>
        <Link to="/aide" className="icon-btn" aria-label="Aide">
          <Icon name="help" />
        </Link>
      </div>
      <div className="steps-nav" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <p className="muted small">
        Étape {step + 1} sur {STEPS.length} : {STEPS[step]}
      </p>

      {step === 0 && (
        <div className="notice info row" style={{ marginBottom: 12 }}>
          <span className="grow">Mr Chef est déjà configuré sur un autre appareil ?</span>
          <Link to="/importer" className="btn">
            Importer une configuration
          </Link>
        </div>
      )}

      {step === 0 && (
        <section className="card stack">
          <h2>Relais vers Monsieur Cuisine</h2>
          <p className="muted small">
            Le site Monsieur Cuisine n’accepte pas les appels d’autres applications : Mr Chef passe par un relais pour publier
            vos recettes.
          </p>
          <RelayChooser relaySecret={relaySecret} onDone={next} />
          <button type="button" className="btn ghost" onClick={next}>
            Passer : je publierai plus tard
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="card stack">
          <h2>Connecter Monsieur Cuisine</h2>
          {hasRelay(settings) ? (
            <SessionImport onConnected={next} />
          ) : (
            <p className="notice warn">Configurez d’abord le relais pour connecter votre compte.</p>
          )}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setStep(0)}>
              Retour
            </button>
            <button type="button" className="btn ghost" onClick={next}>
              Passer : recettes en local seulement
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card stack">
          <h2>Quel robot avez-vous ?</h2>
          <p className="muted small">Les recettes générées n’utiliseront que les programmes de ce modèle. Modifiable ensuite dans les Paramètres.</p>
          <RobotPicker value={robot} onChange={setRobot} />
          <div className="row end">
            <button type="button" className="btn ghost" onClick={() => setStep(1)}>
              Retour
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                void setSettings({ robotId: robot })
                next()
              }}
            >
              Continuer
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card stack">
          <h2>Clé d’intelligence artificielle</h2>
          <p className="muted small">
            Ajoutez au moins une clé. Elle reste chiffrée sur cet appareil et n’est envoyée qu’au fournisseur choisi.
          </p>
          <div className="chips" role="group" aria-label="Fournisseur">
            {PROVIDER_ORDER.map((p) => (
              <button key={p} type="button" className="chip" aria-pressed={provider === p} onClick={() => setProvider(p)}>
                {PROVIDERS[p].label}
              </button>
            ))}
          </div>
          <AiKeyEditor key={provider} provider={provider} />
          <div className="row end">
            <button type="button" className="btn ghost" onClick={() => setStep(2)}>
              Retour
            </button>
            <button type="button" className="btn primary" disabled={!hasKey} onClick={() => void finish()}>
              Commencer à cuisiner
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
