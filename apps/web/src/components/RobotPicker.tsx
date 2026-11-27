import { ROBOTS, type RobotId } from '@mr-chef/recipe-schema'

export function RobotPicker({ value, onChange }: { value: RobotId; onChange: (id: RobotId) => void }) {
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="sr-only">Modèle de robot</legend>
      {ROBOTS.map((r) => (
        <label key={r.id} className="choice">
          <input type="radio" name="robot" value={r.id} checked={value === r.id} onChange={() => onChange(r.id)} />
          <span>
            <strong>{r.name}</strong>
            <br />
            <span className="muted small">
              Programmes : {r.modes.map((m) => m.label).join(', ')}
              {!r.verified && ' · plages reprises du Connect, à confirmer'}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
