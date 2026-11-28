import { modeText, ROBOTS, type RobotId } from '@mr-chef/recipe-schema'
import { useLang, useT } from '../i18n'

export function RobotPicker({ value, onChange }: { value: RobotId; onChange: (id: RobotId) => void }) {
  const t = useT()
  const lang = useLang()
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="sr-only">{t.robot.legend}</legend>
      {ROBOTS.map((r) => (
        <label key={r.id} className="choice">
          <input type="radio" name="robot" value={r.id} checked={value === r.id} onChange={() => onChange(r.id)} />
          <span>
            <strong>{r.name}</strong>
            <br />
            <span className="muted small">
              {t.robot.programs(r.modes.slice(0, 4).map((m) => modeText(m.type, lang).label).join(', '))}
              {r.modes.length > 4 && t.robot.more(r.modes.length - 4)}
              {!r.verified && t.robot.unverified}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
