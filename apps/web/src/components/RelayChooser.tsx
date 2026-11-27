import { Link } from 'react-router'
import { PUBLIC_RELAY_URL, type RelayMode } from '../lib/relay'
import { setSettings, useSettings } from '../lib/settings'
import { RelayForm } from './RelayForm'
import { useT } from '../i18n'

/** Avertissement affiché partout où l'on choisit le relais public. */
export function PublicRelayNotice() {
  const t = useT()
  return (
    <p className="notice info small">
      {t.relay.notice} <Link to="/aide#relais">{t.relay.noticeLink}</Link>
      {t.relay.noticeEnd}
    </p>
  )
}

/** Choix entre le relais public du site et un relais personnel. */
export function RelayChooser({ relaySecret, onDone }: { relaySecret: string; onDone?: () => void }) {
  const settings = useSettings()
  const t = useT()
  if (!settings) return null
  const mode: RelayMode = PUBLIC_RELAY_URL ? settings.relayMode : 'custom'
  const choose = (relayMode: RelayMode) => void setSettings({ relayMode })

  return (
    <div className="stack">
      {PUBLIC_RELAY_URL && (
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">{t.relay.legend}</legend>
          <label className="choice">
            <input type="radio" name="relay-mode" checked={mode === 'public'} onChange={() => choose('public')} />
            <span>
              <strong>{t.relay.publicTitle}</strong> {t.relay.recommended}
              <br />
              <span className="muted small">{t.relay.publicHint}</span>
            </span>
          </label>
          <label className="choice">
            <input type="radio" name="relay-mode" checked={mode === 'custom'} onChange={() => choose('custom')} />
            <span>
              <strong>{t.relay.customTitle}</strong>
              <br />
              <span className="muted small">{t.relay.customHint}</span>
            </span>
          </label>
        </fieldset>
      )}
      {mode === 'public' ? (
        <>
          <PublicRelayNotice />
          {onDone && (
            <button type="button" className="btn primary" onClick={onDone}>
              {t.relay.continuePublic}
            </button>
          )}
        </>
      ) : (
        <RelayForm
          initialUrl={settings.relayUrl}
          initialSecret={relaySecret}
          submitLabel={onDone ? t.relay.saveContinue : t.common.save}
          onSaved={onDone}
        />
      )}
    </div>
  )
}
