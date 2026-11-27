import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { DEFAULT_ROBOT_ID, type RobotId } from '@mr-chef/recipe-schema'
import { AiKeyEditor } from '../components/AiKeyEditor'
import { Icon } from '../components/Icon'
import { LanguagePicker } from '../components/LanguagePicker'
import { Logo } from '../components/Logo'
import { RelayChooser } from '../components/RelayChooser'
import { RobotPicker } from '../components/RobotPicker'
import { SessionImport } from '../components/SessionImport'
import type { ProviderId } from '../db/db'
import { PROVIDER_ORDER, PROVIDERS } from '../lib/ai'
import { hasRelay } from '../lib/mc'
import { setSettings, useSettings } from '../lib/settings'
import { getSecret, useStoredSecretIds } from '../lib/vault'
import { useT } from '../i18n'

const STEP_COUNT = 4

/** Premier lancement : relais, session Monsieur Cuisine, robot, clé IA. */
export function Onboarding() {
  const settings = useSettings()
  const t = useT()
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
  const next = () => setStep((s) => Math.min(STEP_COUNT - 1, s + 1))

  async function finish() {
    await setSettings({ onboardingDone: true, robotId: robot })
    navigate('/', { replace: true })
  }

  return (
    <main className="main">
      <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
        <Logo size={48} />
        <h1 style={{ margin: 0, fontSize: '1.5rem' }} className="grow">
          {t.onboarding.welcome}
        </h1>
        <LanguagePicker compact />
        <Link to="/aide" className="icon-btn" aria-label={t.common.help}>
          <Icon name="help" />
        </Link>
      </div>
      <div className="steps-nav" aria-hidden>
        {t.onboarding.steps.map((s, i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <p className="muted small">
        {t.onboarding.stepOf(step + 1, STEP_COUNT, t.onboarding.steps[step] ?? '')}
      </p>

      {step === 0 && (
        <div className="notice info row" style={{ marginBottom: 12 }}>
          <span className="grow">{t.onboarding.already}</span>
          <Link to="/importer" className="btn">
            {t.onboarding.importConfig}
          </Link>
        </div>
      )}

      {step === 0 && (
        <section className="card stack">
          <h2>{t.onboarding.relayTitle}</h2>
          <p className="muted small">
            {t.onboarding.relayIntro}
          </p>
          <RelayChooser relaySecret={relaySecret} onDone={next} />
          <button type="button" className="btn ghost" onClick={next}>
            {t.onboarding.skipRelay}
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="card stack">
          <h2>{t.onboarding.mcTitle}</h2>
          {hasRelay(settings) ? (
            <SessionImport onConnected={next} />
          ) : (
            <p className="notice warn">{t.onboarding.relayFirst}</p>
          )}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setStep(0)}>
              {t.common.back}
            </button>
            <button type="button" className="btn ghost" onClick={next}>
              {t.onboarding.skipMc}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card stack">
          <h2>{t.onboarding.robotTitle}</h2>
          <p className="muted small">{t.onboarding.robotIntro}</p>
          <RobotPicker value={robot} onChange={setRobot} />
          <div className="row end">
            <button type="button" className="btn ghost" onClick={() => setStep(1)}>
              {t.common.back}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                void setSettings({ robotId: robot })
                next()
              }}
            >
              {t.common.continue}
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card stack">
          <h2>{t.onboarding.aiTitle}</h2>
          <p className="muted small">
            {t.onboarding.aiIntro}
          </p>
          <div className="chips" role="group" aria-label={t.onboarding.provider}>
            {PROVIDER_ORDER.map((p) => (
              <button key={p} type="button" className="chip" aria-pressed={provider === p} onClick={() => setProvider(p)}>
                {PROVIDERS[p].label}
              </button>
            ))}
          </div>
          <AiKeyEditor key={provider} provider={provider} />
          <div className="row end">
            <button type="button" className="btn ghost" onClick={() => setStep(2)}>
              {t.common.back}
            </button>
            <button type="button" className="btn primary" disabled={!hasKey} onClick={() => void finish()}>
              {t.onboarding.start}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
