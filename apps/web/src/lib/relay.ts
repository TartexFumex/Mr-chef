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

/**
 * Lien qui préremplit le relais sur un autre appareil. Le secret est placé dans le
 * fragment (#), qui n'est jamais envoyé au serveur GitHub Pages.
 */
export function configLink(relayUrl: string, secret: string): string {
  const base = `${location.origin}${location.pathname}`
  const q = new URLSearchParams({ relay: relayUrl, secret })
  return `${base}#/onboarding?${q.toString()}`
}
