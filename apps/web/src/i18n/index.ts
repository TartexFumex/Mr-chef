import { McError } from '@mr-chef/mc-client'
import { SessionParseError } from '@mr-chef/mc-client'
import type { Fix } from '@mr-chef/recipe-schema'
import { modeText } from '@mr-chef/recipe-schema'
import { AiError } from '../lib/ai/types'
import { useSettings } from '../lib/settings'
import { en } from './en'
import { fr, type Dict } from './fr'

export type Lang = 'fr' | 'en'
export type { Dict }

export const DICTS: Record<Lang, Dict> = { fr, en }
export const LANGS: Lang[] = ['fr', 'en']

/** Langue du navigateur : français si elle commence par « fr », anglais sinon. */
export function detectLang(): Lang {
  const langs = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])
  for (const l of langs) {
    const code = l?.toLowerCase().slice(0, 2)
    if (code === 'fr') return 'fr'
    if (code === 'en') return 'en'
  }
  return 'en'
}

let current: Lang = detectLang()

/** Langue active pour le code hors React (messages d'erreur, toasts). */
export function getLang(): Lang {
  return current
}
export function setCurrentLang(lang: Lang): void {
  current = lang
}
export function tr(): Dict {
  return DICTS[current]
}

export function useLang(): Lang {
  const settings = useSettings()
  return settings?.lang ?? current
}

export function useT(): Dict {
  return DICTS[useLang()]
}

/** Message d'erreur dans la langue active. */
export function describeError(e: unknown, t: Dict = tr()): string {
  const withDetail = (msg: string | undefined, detail?: string) =>
    msg ? (detail ? `${msg} (${detail})` : msg) : undefined
  if (e instanceof McError) return withDetail(t.errors.mc[e.kind], e.detail) ?? e.message
  if (e instanceof AiError) return withDetail(t.errors.ai[e.kind], e.detail) ?? e.message
  if (e instanceof SessionParseError) return t.errors.session[e.code] ?? e.message
  if (e instanceof Error && 'code' in e && e.name === 'TransferError')
    return t.errors.transfer[(e as Error & { code: string }).code] ?? e.message
  if (e instanceof Error) return e.message
  return t.common.unexpected
}

/** Ajustement appliqué à un programme, dans la langue active. */
export function describeFix(f: Fix, t: Dict, robotName: string, lang: Lang): string {
  const mode = modeText(f.mode, lang).label
  const prefix = f.stepIndex !== undefined ? t.fix.step(f.stepIndex + 1) : ''
  const v = f.value ?? 0
  switch (f.kind) {
    case 'time':
      return prefix + t.fix.time(v, mode)
    case 'temperature':
      return prefix + t.fix.temperature(v, mode)
    case 'speed':
      return prefix + t.fix.speed(v, mode)
    case 'weight':
      return prefix + t.fix.weight(v, mode)
    case 'unavailable':
      return prefix + t.fix.unavailable(mode, robotName)
    default:
      return f.message
  }
}

/** Libellés de référentiels Monsieur Cuisine (le français est la langue d'origine). */
export function unitLabel(unit: string, t: Dict): string {
  return t.units[unit] ?? unit
}
export function categoryLabel(id: number, fallback: string, t: Dict): string {
  return t.categories[id] ?? fallback
}
