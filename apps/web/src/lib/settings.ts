import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_ROBOT_ID, type RobotId } from '@mr-chef/recipe-schema'
import { db, type ProviderId } from '../db/db'
import { PUBLIC_RELAY_URL, type RelayMode } from './relay'

export interface Settings {
  onboardingDone: boolean
  robotId: RobotId
  activeProvider: ProviderId | null
  models: Partial<Record<ProviderId, string>>
  /** null = prompt par défaut */
  systemPrompt: string | null
  /** public : relais de l'administrateur du site ; custom : relais personnel. */
  relayMode: RelayMode
  relayUrl: string
  mcUser: string | null
  mcExpiresAt: number | null
  sessionExpired: boolean
  defaultServings: number
  lastRefreshAt: number | null
  /** null = langue du navigateur */
  lang: 'fr' | 'en' | null
  /** Date à laquelle l'invitation à installer l'application a été écartée. */
  installDismissedAt: number | null
  /** Dossier affiché dans « Mes recettes » : null = tous, NO_FOLDER = sans dossier. */
  libraryFolder: string | null
}

export const DEFAULT_SETTINGS: Settings = {
  onboardingDone: false,
  robotId: DEFAULT_ROBOT_ID,
  activeProvider: null,
  models: {},
  systemPrompt: null,
  relayMode: PUBLIC_RELAY_URL ? 'public' : 'custom',
  relayUrl: '',
  mcUser: null,
  mcExpiresAt: null,
  sessionExpired: false,
  defaultServings: 4,
  lastRefreshAt: null,
  lang: null,
  installDismissedAt: null,
  libraryFolder: null,
}

export async function getSettings(): Promise<Settings> {
  const rows = await db.kv.toArray()
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const r of rows) out[r.key] = r.value
  return out as unknown as Settings
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await db.kv.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })))
}

/** Réglages en direct ; `undefined` pendant le premier chargement. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(getSettings, [])
}
