import { db } from '../db/db'

/**
 * Coffre local : chiffre les secrets (clés IA, session Monsieur Cuisine, secret du relais)
 * en AES-GCM avec une clé WebCrypto générée sur l'appareil, non extractible,
 * conservée dans IndexedDB. Rien n'est écrit en clair ni dans localStorage.
 */

export type SecretId = 'ai:anthropic' | 'ai:openai' | 'ai:mistral' | 'mc:session' | 'relay:secret'

let keyPromise: Promise<CryptoKey> | null = null

async function vaultKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const existing = await db.keys.get('vault')
      if (existing) return existing.key
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
      await db.keys.put({ id: 'vault', key })
      return key
    })()
    keyPromise.catch(() => {
      keyPromise = null
    })
  }
  return keyPromise
}

export async function setSecret(id: SecretId, value: string): Promise<void> {
  const key = await vaultKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value))
  await db.secrets.put({ id, iv, data })
}

export async function getSecret(id: SecretId): Promise<string | null> {
  const rec = await db.secrets.get(id)
  if (!rec) return null
  try {
    const key = await vaultKey()
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv as Uint8Array<ArrayBuffer> }, key, rec.data)
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

export async function deleteSecret(id: SecretId): Promise<void> {
  await db.secrets.delete(id)
}

export async function hasSecret(id: SecretId): Promise<boolean> {
  return (await db.secrets.get(id)) !== undefined
}

/** Affichage masqué d'une clé : ••••7Hq */
export function maskSecret(value: string | null): string {
  if (!value) return ''
  return `••••${value.slice(-4)}`
}

export function resetVaultCache(): void {
  keyPromise = null
}
