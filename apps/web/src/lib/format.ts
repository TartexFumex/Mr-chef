import { modeText, type StepMode } from '@mr-chef/recipe-schema'
import { getLang, tr } from '../i18n'

export function formatSeconds(total: number): string {
  const t = tr().time
  const m = Math.floor(total / 60)
  const s = total % 60
  if (!m) return t.seconds(s)
  return s ? t.minSec(m, s) : t.minutes(m)
}

export function formatMinutes(total: number): string {
  const t = tr().time
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return t.minutes(m)
  return m ? t.hoursMin(h, m) : t.hours(h)
}

/** Résumé d'un programme robot, ex. « Cuisson personnalisée · 5 min · 100 °C · vit. 1 · sens inverse ». */
export function modeSummary(mode: StepMode): string {
  const t = tr().mode
  const s = mode.settings
  const parts = [modeText(mode.type, getLang()).label]
  if (s.time !== undefined) parts.push(formatSeconds(s.time))
  if (s.temperature !== undefined) parts.push(s.temperature ? `${s.temperature} °C` : t.noHeat)
  if (s.speed !== undefined) parts.push(t.speed(s.speed))
  if (s.clockwise) parts.push(t.reverse)
  if (s.weight !== undefined) parts.push(`${s.weight} g`)
  return parts.join(' · ')
}

export function relativeTime(ts: number | null): string {
  const t = tr()
  if (!ts) return t.time.never
  const d = Math.round((Date.now() - ts) / 60000)
  if (d < 1) return t.time.justNow
  if (d < 60) return t.time.minutesAgo(d)
  const h = Math.round(d / 60)
  if (h < 24) return t.time.hoursAgo(h)
  return new Date(ts).toLocaleDateString(t.locale, { day: 'numeric', month: 'long' })
}
