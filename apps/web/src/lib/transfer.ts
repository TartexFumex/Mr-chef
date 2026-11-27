import type { RobotId } from '@mr-chef/recipe-schema'
import type { ProviderId } from '../db/db'
import { getSettings, setSettings, type Settings } from './settings'
import { getSecret, setSecret, type SecretId } from './vault'

/**
 * Transfert de configuration entre appareils (QR code ou lien).
 *
 * Le contenu est compressé puis chiffré en AES-GCM avec une clé dérivée d'une phrase
 * secrète (PBKDF2-SHA-256, 600 000 itérations). La phrase n'est jamais dans le QR code :
 * elle s'affiche à côté, et l'utilisateur la tape sur le nouvel appareil.
 */

export interface TransferBundle {
  v: 1
  createdAt: number
  prefs?: Pick<Settings, 'robotId' | 'activeProvider' | 'models' | 'systemPrompt' | 'defaultServings'> & { relayMode?: Settings['relayMode'] }
  relay?: { url: string; secret: string }
  ai?: Partial<Record<ProviderId, string>>
  mc?: { session: string; user: string | null; expiresAt: number | null }
}

export interface TransferChoice {
  prefs: boolean
  relay: boolean
  ai: boolean
  mc: boolean
}

export class TransferError extends Error {}

const PROVIDERS: ProviderId[] = ['mistral', 'openai', 'anthropic']
const ITERATIONS = 600_000
const FORMAT = 1
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Phrase secrète lisible : 4 groupes de 4 caractères sans ambiguïté (≈ 80 bits). */
export function generatePassphrase(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length])
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-')
}

function normalizePassphrase(p: string): string {
  return p.trim().toUpperCase().replace(/\s+/g, '')
}

export async function buildBundle(choice: TransferChoice): Promise<TransferBundle> {
  const s = await getSettings()
  const bundle: TransferBundle = { v: 1, createdAt: Date.now() }
  if (choice.prefs) {
    bundle.prefs = {
      robotId: s.robotId,
      activeProvider: s.activeProvider,
      models: s.models,
      systemPrompt: s.systemPrompt,
      defaultServings: s.defaultServings,
      relayMode: s.relayMode,
    }
  }
  if (choice.relay) {
    if (s.relayUrl) bundle.relay = { url: s.relayUrl, secret: (await getSecret('relay:secret')) ?? '' }
  }
  if (choice.ai) {
    const ai: TransferBundle['ai'] = {}
    for (const p of PROVIDERS) {
      const k = await getSecret(`ai:${p}`)
      if (k) ai[p] = k
    }
    if (Object.keys(ai).length) bundle.ai = ai
  }
  if (choice.mc) {
    const session = await getSecret('mc:session')
    if (session) bundle.mc = { session, user: s.mcUser, expiresAt: s.mcExpiresAt }
  }
  return bundle
}

function toB64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(data)
      c.close()
    },
  })
  const out = source.pipeThrough(stream as unknown as ReadableWritablePair<Uint8Array, Uint8Array>)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalizePassphrase(passphrase)), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Code compact : [format][compressé][sel 16][iv 12][données chiffrées], en base64url. */
export async function encryptBundle(bundle: TransferBundle, passphrase: string): Promise<string> {
  let plain: Uint8Array = new TextEncoder().encode(JSON.stringify(bundle))
  const compressed = canCompress()
  if (compressed) plain = await pipe(plain, new CompressionStream('deflate-raw'))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain as BufferSource))
  const out = new Uint8Array(2 + salt.length + iv.length + ct.length)
  out.set([FORMAT, compressed ? 1 : 0], 0)
  out.set(salt, 2)
  out.set(iv, 18)
  out.set(ct, 30)
  return toB64Url(out)
}

export async function decryptBundle(code: string, passphrase: string): Promise<TransferBundle> {
  let bytes: Uint8Array
  try {
    bytes = fromB64Url(code.trim())
  } catch {
    throw new TransferError('Code de configuration illisible.')
  }
  if (bytes.length < 31 || bytes[0] !== FORMAT) throw new TransferError('Code de configuration illisible ou d’une autre version de Mr Chef.')
  const key = await deriveKey(passphrase, bytes.slice(2, 18))
  let plain: Uint8Array
  try {
    plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(18, 30) }, key, bytes.slice(30)))
  } catch {
    throw new TransferError('Phrase secrète incorrecte.')
  }
  if (bytes[1] === 1) {
    if (!canCompress()) throw new TransferError('Ce navigateur est trop ancien pour lire ce code.')
    plain = await pipe(plain, new DecompressionStream('deflate-raw'))
  }
  const bundle = JSON.parse(new TextDecoder().decode(plain)) as TransferBundle
  if (bundle?.v !== 1) throw new TransferError('Code de configuration d’une autre version de Mr Chef.')
  return bundle
}

/** Lien qui ouvre l'import sur l'appareil cible ; le code est dans le fragment (#), jamais envoyé au serveur. */
export function transferLink(code: string): string {
  return `${location.origin}${location.pathname}#/importer?c=${code}`
}

/** Accepte un lien complet ou le code seul. */
export function extractCode(text: string): string {
  const t = text.trim()
  const m = t.match(/[?&]c=([A-Za-z0-9_-]+)/)
  return m ? m[1]! : t
}

export function describeBundle(b: TransferBundle): string[] {
  const out: string[] = []
  if (b.relay) out.push(`Relais : ${b.relay.url}`)
  if (b.ai) out.push(`Clés IA : ${Object.keys(b.ai).join(', ')}`)
  if (b.mc) out.push(`Session Monsieur Cuisine${b.mc.user ? ` (${b.mc.user})` : ''}`)
  if (b.prefs) out.push(`Réglages : robot, modèles, prompt, portions`)
  return out
}

/** Enregistre la configuration importée ; renvoie true si l'app est prête à l'emploi. */
export async function applyBundle(b: TransferBundle): Promise<boolean> {
  const patch: Partial<Settings> = {}
  if (b.prefs) {
    Object.assign(patch, b.prefs)
    patch.robotId = b.prefs.robotId as RobotId
  }
  if (b.relay) {
    patch.relayUrl = b.relay.url
    if (b.relay.secret) await setSecret('relay:secret', b.relay.secret)
  }
  const ai = Object.entries(b.ai ?? {}) as [ProviderId, string][]
  for (const [p, key] of ai) await setSecret(`ai:${p}` as SecretId, key)
  if (b.mc) {
    await setSecret('mc:session', b.mc.session)
    patch.mcUser = b.mc.user
    patch.mcExpiresAt = b.mc.expiresAt
    patch.sessionExpired = false
  }
  const current = await getSettings()
  const hasKey = ai.length > 0 || (await Promise.all(PROVIDERS.map((p) => getSecret(`ai:${p}`)))).some(Boolean)
  const active = patch.activeProvider ?? current.activeProvider
  if (!active || !(await getSecret(`ai:${active}`))) patch.activeProvider = ai[0]?.[0] ?? null
  if (hasKey) patch.onboardingDone = true
  await setSettings(patch)
  return hasKey
}
