/**
 * Import assisté de la session Monsieur Cuisine.
 *
 * L'utilisateur colle au choix : une commande « Copier en tant que cURL » (bash ou cmd),
 * une commande « Copier en tant que PowerShell », l'en-tête `cookie: …` ou une simple
 * liste `nom=valeur; …`. On n'en garde que les cookies WordPress.
 */

export interface ParsedSession {
  /** Valeur prête pour l'en-tête Cookie. */
  cookie: string
  names: string[]
  /** Identifiant WordPress lu dans le cookie `wordpress_logged_in_*`. */
  user: string | null
  /** Expiration lue dans le cookie `wordpress_logged_in_*`. */
  expiresAt: Date | null
}

export type SessionParseCode = 'no_cookie' | 'no_login'

export class SessionParseError extends Error {
  constructor(
    public readonly code: SessionParseCode,
    message: string,
  ) {
    super(message)
    this.name = 'SessionParseError'
  }
}

const KEEP = /^(wordpress|wp)[-_]|^PHPSESSID$/i

function cookiePairsFrom(text: string): [string, string][] {
  const pairs: [string, string][] = []

  // PowerShell : New-Object System.Net.Cookie("nom", "valeur", …)
  for (const m of text.matchAll(/System\.Net\.Cookie\(\s*"([^"]+)"\s*,\s*"([^"]*)"/g)) {
    pairs.push([m[1]!, m[2]!])
  }
  if (pairs.length) return pairs

  // Retire les échappements de « Copier en tant que cURL (cmd) » : ^" et ^%
  const t = text.replace(/\^(["%&|<>^])/g, '$1')

  const candidates: string[] = []
  for (const m of t.matchAll(/(?:-b|--cookie)\s+(?:'([^']*)'|"([^"]*)")/g)) candidates.push(m[1] ?? m[2] ?? '')
  for (const m of t.matchAll(/-H\s+(?:'cookie:\s*([^']*)'|"cookie:\s*([^"]*)")/gi)) candidates.push(m[1] ?? m[2] ?? '')
  if (!candidates.length) {
    const header = t.match(/^\s*cookie:\s*(.+)$/im)
    candidates.push(header ? header[1]! : t)
  }

  for (const c of candidates) {
    for (const part of c.split(/;\s*/)) {
      const eq = part.indexOf('=')
      if (eq <= 0) continue
      const name = part.slice(0, eq).trim()
      const value = part.slice(eq + 1).trim()
      if (/^[A-Za-z0-9_\-.%]+$/.test(name)) pairs.push([name, value])
    }
  }
  return pairs
}

export function parseSessionInput(text: string): ParsedSession {
  const all = cookiePairsFrom(text)
  const kept = new Map<string, string>()
  for (const [name, value] of all) {
    if (KEEP.test(name) && /^[^\r\n;]*$/.test(value)) kept.set(name, value)
  }
  if (!kept.size) {
    throw new SessionParseError(
      'no_cookie',
      'Aucun cookie WordPress trouvé. Copiez une requête « proxy-api » faite sur monsieur-cuisine.com après vous être connecté.',
    )
  }
  const loggedIn = [...kept.entries()].find(([n]) => /^wordpress_logged_in/i.test(n))
  if (!loggedIn) {
    throw new SessionParseError(
      'no_login',
      'Le cookie de connexion WordPress (wordpress_logged_in…) est absent. Vérifiez que vous êtes bien connecté sur monsieur-cuisine.com.',
    )
  }
  let user: string | null = null
  let expiresAt: Date | null = null
  try {
    const parts = decodeURIComponent(loggedIn[1]).split('|')
    if (parts.length >= 2) {
      user = parts[0] || null
      const ts = Number(parts[1])
      if (Number.isFinite(ts) && ts > 0) expiresAt = new Date(ts * 1000)
    }
  } catch {
    /* valeur non décodable : on garde la session sans date */
  }
  return {
    cookie: [...kept.entries()].map(([n, v]) => `${n}=${v}`).join('; '),
    names: [...kept.keys()],
    user,
    expiresAt,
  }
}
