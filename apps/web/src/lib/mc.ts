import { McClient, McError } from '@mr-chef/mc-client'
import type { RelayConfig } from '@mr-chef/mc-client'
import { activeRelayUrl } from './relay'
import { getSettings, setSettings, type Settings } from './settings'
import { getSecret } from './vault'

/** Relais à utiliser : public (sans secret) ou personnel (secret facultatif). */
export async function relayConfig(settings?: Settings): Promise<RelayConfig | null> {
  const s = settings ?? (await getSettings())
  const url = activeRelayUrl(s)
  if (!url) return null
  const secret = s.relayMode === 'public' && url !== s.relayUrl ? '' : ((await getSecret('relay:secret')) ?? '')
  return { url, secret }
}

export function hasRelay(s: Settings | undefined): boolean {
  return !!s && !!activeRelayUrl(s)
}

/** Client Monsieur Cuisine construit à partir des réglages et du coffre. */
export async function getMcClient(): Promise<McClient> {
  const relay = await relayConfig()
  if (!relay) throw new McError('relay_unreachable', 'relais non configuré')
  return new McClient(relay, () => getSecret('mc:session'))
}

/** Exécute une opération Monsieur Cuisine et signale une session expirée à l'interface. */
export async function withMc<T>(fn: (c: McClient) => Promise<T>): Promise<T> {
  const client = await getMcClient()
  try {
    const out = await fn(client)
    const s = await getSettings()
    if (s.sessionExpired) await setSettings({ sessionExpired: false })
    return out
  } catch (e) {
    if (e instanceof McError && (e.kind === 'session_expired' || e.kind === 'session_missing')) {
      await setSettings({ sessionExpired: true })
    }
    throw e
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return 'Erreur inattendue.'
}
