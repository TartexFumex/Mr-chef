import { MODE_SPECS, type ModeType, type StepMode } from '@mr-chef/recipe-schema'

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  if (!m) return `${s} s`
  return s ? `${m} min ${s} s` : `${m} min`
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m}` : `${h} h`
}

/** Résumé d'un programme robot, ex. « Cuisson personnalisée · 5 min · 100 °C · vit. 1 · inverse ». */
export function modeSummary(mode: StepMode): string {
  const spec = MODE_SPECS[mode.type as ModeType]
  const s = mode.settings
  const parts = [spec?.label ?? mode.type]
  if (s.time !== undefined) parts.push(formatSeconds(s.time))
  if (s.temperature !== undefined) parts.push(s.temperature ? `${s.temperature} °C` : 'sans chauffe')
  if (s.speed !== undefined) parts.push(`vit. ${s.speed}`)
  if (s.clockwise) parts.push('sens inverse')
  if (s.weight !== undefined) parts.push(`${s.weight} g`)
  return parts.join(' · ')
}

export function relativeTime(ts: number | null): string {
  if (!ts) return 'jamais'
  const d = Math.round((Date.now() - ts) / 60000)
  if (d < 1) return 'à l’instant'
  if (d < 60) return `il y a ${d} min`
  const h = Math.round(d / 60)
  if (h < 24) return `il y a ${h} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}
