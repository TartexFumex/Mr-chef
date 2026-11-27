/** Secret partagé aléatoire (32 octets, base64url) pour le relais. */
export function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function normalizeRelayUrl(input: string): string {
  const t = input.trim().replace(/\/+$/, '')
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

/** Relais public proposé par l'administrateur du site (vide si aucun). */
export const PUBLIC_RELAY_URL = normalizeRelayUrl(import.meta.env.VITE_PUBLIC_RELAY_URL ?? '')

export type RelayMode = 'public' | 'custom'

/** Adresse du relais réellement utilisé selon le mode choisi. */
export function activeRelayUrl(s: { relayMode: RelayMode; relayUrl: string }): string {
  return s.relayMode === 'public' && PUBLIC_RELAY_URL ? PUBLIC_RELAY_URL : s.relayUrl
}
