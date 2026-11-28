import { useState } from 'react'
import { fitSettings, maxSpeedFor, maxTimeFor, modeHint, modeText, type DeviceSettings, type ModeSpec, type RobotProfile, type StepMode } from '@mr-chef/recipe-schema'
import { Dialog } from './Dialog'
import { useLang, useT } from '../i18n'
import { NumberInput } from './NumberInput'

function temperatureOptions(spec: ModeSpec): number[] {
  const r = spec.temperature!
  if (r.values?.length) return r.values
  const out: number[] = []
  const step = r.step ?? 5
  out.push(r.min)
  for (let t = Math.ceil((r.min + 1) / step) * step; t <= r.max; t += step) out.push(t)
  if (out[out.length - 1] !== r.max) out.push(r.max)
  return out
}

/** Feuille de réglage du programme d'une étape, limitée aux programmes et plages du robot. */
export function ModeEditor({
  open,
  robot,
  mode,
  onClose,
  onSave,
}: {
  open: boolean
  robot: RobotProfile
  mode: StepMode | null
  onClose: () => void
  onSave: (mode: StepMode | null) => void
}) {
  const t = useT()
  const lang = useLang()
  const [type, setType] = useState<string>(mode?.type ?? '')
  const [settings, setSettingsState] = useState<DeviceSettings>(mode?.settings ?? {})
  const spec = robot.modes.find((m) => m.type === type)
  const fitted = spec ? fitSettings(spec, settings, []) : {}
  const set = (patch: DeviceSettings) => setSettingsState((s) => ({ ...s, ...patch }))
  const time = fitted.time ?? 0
  const maxSpeed = spec ? maxSpeedFor(spec, fitted) : undefined
  const maxTime = spec ? (maxTimeFor(spec, fitted) ?? 0) : 0
  const minutesOnly = spec?.timeUnit === 'minutes'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.modeEditor.title}
      actions={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => onSave(spec ? { type: spec.type, settings: fitted } : null)}
          >
            {t.modeEditor.confirm}
          </button>
        </>
      }
    >
      <div className="stack">
        <label className="field">
          <span>{t.modeEditor.program(robot.name)}</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t.modeEditor.none}</option>
            {robot.modes.map((m) => (
              <option key={m.type} value={m.type}>
                {modeText(m.type, lang).label}
              </option>
            ))}
          </select>
        </label>
        {spec && <p className="muted small">{modeHint(spec, lang)}</p>}
        {spec?.time && (
          <div className="grid2">
            <label className="field">
              <span>{t.modeEditor.minutes}</span>
              <NumberInput
                min={0}
                max={Math.floor(maxTime / 60)}
                value={Math.floor(time / 60)}
                onChange={(m) => set({ time: m * 60 + (minutesOnly ? 0 : time % 60) })}
              />
            </label>
            {!minutesOnly && (
            <label className="field">
              <span>{t.modeEditor.seconds}</span>
              <NumberInput
                min={0}
                max={59}
                value={time % 60}
                onChange={(s) => set({ time: Math.floor(time / 60) * 60 + s })}
              />
            </label>
            )}
          </div>
        )}
        {spec?.temperature && (
          <label className="field">
            <span>{t.modeEditor.temperature}</span>
            <select value={fitted.temperature ?? 0} onChange={(e) => set({ temperature: Number(e.target.value) })}>
              {temperatureOptions(spec).map((deg) => (
                <option key={deg} value={deg}>
                  {deg === 0 ? t.modeEditor.noHeat : `${deg} °C`}
                </option>
              ))}
            </select>
          </label>
        )}
        {spec?.speed && (
          <label className="field">
            <span>
              {t.modeEditor.speed} <span className="mono">{fitted.speed}</span>
              {maxSpeed !== undefined && maxSpeed !== spec.speed.max && <span className="hint">{t.modeEditor.maxSpeed(maxSpeed)}</span>}
            </span>
            <input
              type="range"
              min={spec.speed.min}
              max={maxSpeed}
              step={spec.speed.step ?? 1}
              value={fitted.speed ?? spec.speed.min}
              onChange={(e) => set({ speed: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--sapin-2)' }}
            />
          </label>
        )}
        {spec?.clockwise && (
          <label className="check">
            <input type="checkbox" checked={!!fitted.clockwise} onChange={(e) => set({ clockwise: e.target.checked })} />
            <span>{t.modeEditor.reverse}</span>
          </label>
        )}
        {spec?.weight && (
          <label className="field">
            <span>{t.modeEditor.weight}</span>
            <NumberInput
              min={spec.weight.min}
              max={spec.weight.max}
              value={fitted.weight ?? spec.weight.min}
              onChange={(weight) => set({ weight })}
            />
          </label>
        )}
      </div>
    </Dialog>
  )
}
