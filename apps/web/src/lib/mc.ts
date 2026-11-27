import { McClient, McError } from '@mr-chef/mc-client'
import { getSettings, setSettings } from './settings'
import { getSecret } from './vault'

/** Client Monsieur Cuisine construit à partir des réglages et du coffre. */
export async function getMcClient(): Promise<McClient> {
  const settings = await getSettings()
  const secret = await getSecret('relay:secret')
  if (!settings.relayUrl || !secret) {
    throw new McError('relay_unreachable', 'relais non configuré')
  }
  return new McClient({ url: settings.relayUrl, secret }, () => getSecret('mc:session'))
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
