import type { Recipe } from './recipe'

/** JSON canonique : clés triées, sans les identifiants locaux et distants. */
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => v !== undefined && k !== 'key' && k !== 'remoteId')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * Empreinte SHA-256 du contenu publiable d'une recette (contenu, robot et image).
 * Sert à dériver l'état Publiée / Désynchronisée.
 */
export async function recipeHash(recipe: Recipe, robotId: string, imageId: string | null): Promise<string> {
  const text = canonicalize({ recipe, robotId, imageId })
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
