import { LANGS, useLang, useT, type Lang } from '../i18n'
import { setSettings } from '../lib/settings'

/** Choix de la langue de l'interface, enregistré sur cet appareil. */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const t = useT()
  const lang = useLang()
  const select = (
    <select
      value={lang}
      aria-label={compact ? t.lang.label : undefined}
      onChange={(e) => void setSettings({ lang: e.target.value as Lang })}
      style={compact ? { width: 'auto', minHeight: 36, padding: '4px 8px' } : undefined}
    >
      {LANGS.map((l) => (
        <option key={l} value={l} lang={l} label={compact ? l.toUpperCase() : undefined}>
          {t.lang[l]}
        </option>
      ))}
    </select>
  )
  if (compact) return select
  return (
    <label className="field">
      <span>{t.lang.label}</span>
      {select}
    </label>
  )
}
