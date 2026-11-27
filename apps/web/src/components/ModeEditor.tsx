import { useState } from 'react'
import { fitSettings, modeText, type DeviceSettings, type ModeSpec, type RobotProfile, type StepMode } from '@mr-chef/recipe-schema'
import { Dialog } from './Dialog'
import { useLang, useT } from '../i18n'

function temperatureOptions(spec: ModeSpec): number[] {
  const r = spec.temperature!
  const out = [...(r.also ?? [])]
  out.push(r.min)
  const step = r.step ?? 1
  for (let t = Math.ceil((r.min + 1) / step) * step; t <= r.max; t += step) out.push(t)
  return [...new Set(out)]
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
  const maxSpeed =
    spec?.speed && spec.maxSpeedWhenHeating && (fitted.temperature ?? 0) > 0 ? spec.maxSpeedWhenHeating : spec?.speed?.max

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
        {spec && <p className="muted small">{modeText(spec.type, lang).hint}</p>}
        {spec?.time && (
          <div className="grid2">
            <label className="field">
              <span>{t.modeEditor.minutes}</span>
              <input
                type="number"
                min={0}
                max={Math.floor(spec.time.max / 60)}
                value={Math.floor(time / 60)}
                onChange={(e) => set({ time: (Number(e.target.value) || 0) * 60 + (time % 60) })}
              />
            </label>
            <label className="field">
              <span>{t.modeEditor.seconds}</span>
              <input
                type="number"
                min={0}
                max={59}
                value={time % 60}
                onChange={(e) => set({ time: Math.floor(time / 60) * 60 + Math.min(59, Number(e.target.value) || 0) })}
              />
            </label>
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
              {maxSpeed !== spec.speed.max && <span className="hint">{t.modeEditor.maxHeating}</span>}
            </span>
            <input
              type="range"
              min={spec.speed.min}
              max={maxSpeed}
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
            <input
              type="number"
              min={spec.weight.min}
              max={spec.weight.max}
              value={fitted.weight ?? spec.weight.min}
              onChange={(e) => set({ weight: Number(e.target.value) || spec.weight!.min })}
            />
          </label>
        )}
      </div>
    </Dialog>
  )
}
