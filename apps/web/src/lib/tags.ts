import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

const MAX_LENGTH = 40

/** Forme de comparaison : minuscules, sans accents. */
export function foldTag(tag: string): string {
  return tag.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Nettoie une liste : espaces superflus retirés, vides et doublons écartés (sans tenir compte de la casse ni des accents). */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH)
    const key = foldTag(tag)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(tag)
  }
  return out
}

/** « soupe, hiver , » → ['soupe', 'hiver'] */
export function parseTags(text: string): string[] {
  return normalizeTags(text.split(','))
}

/** Mot-clé en cours de frappe : ce qui suit la dernière virgule. */
export function currentFragment(text: string): string {
  return text.slice(text.lastIndexOf(',') + 1).trim()
}

/** Remplace le mot-clé en cours de frappe par une suggestion, prêt pour le suivant. */
export function completeTag(text: string, tag: string): string {
  const head = text.slice(0, text.lastIndexOf(',') + 1)
  return `${head}${head ? ' ' : ''}${tag}, `
}

/** Suggestions : mots-clés existants qui contiennent le fragment, hors ceux déjà saisis, les plus utilisés d'abord. */
export function suggestTags(all: string[], text: string, limit = 8): string[] {
  const fragment = foldTag(currentFragment(text))
  const used = new Set(parseTags(text).map(foldTag))
  return all
    .filter((tag) => {
      const key = foldTag(tag)
      if (used.has(key) && key !== fragment) return false
      if (key === fragment) return false
      return !fragment || key.includes(fragment)
    })
    .slice(0, limit)
}

/** Tous les mots-clés déjà utilisés, du plus fréquent au moins fréquent. */
export function useAllTags(): string[] {
  return (
    useLiveQuery(async () => {
      const counts = new Map<string, { tag: string; n: number }>()
      await db.recipes.each((r) => {
        for (const tag of r.tags ?? []) {
          const key = foldTag(tag)
          const e = counts.get(key)
          if (e) e.n++
          else counts.set(key, { tag, n: 1 })
        }
      })
      return [...counts.values()].sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag)).map((e) => e.tag)
    }, []) ?? []
  )
}

/** Enregistre les mots-clés ; ne touche ni le contenu de la recette ni son état de synchronisation. */
export async function setRecipeTags(id: string, tags: string[]): Promise<void> {
  await db.recipes.update(id, { tags: normalizeTags(tags) })
}

/** Une recette correspond si l'un de ses mots-clés contient la recherche. */
export function matchesTag(tags: string[] | undefined, query: string): boolean {
  const q = foldTag(query)
  return !q || (tags ?? []).some((t) => foldTag(t).includes(q))
}
