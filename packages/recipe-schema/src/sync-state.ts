export type SyncState = 'local' | 'published' | 'desynced'

export interface SyncInfo {
  remoteId: number | null
  publishedHash: string | null
}

/**
 * L'état n'est jamais stocké : il est dérivé de l'identifiant distant et de
 * l'empreinte publiée. Annuler une modification ramène donc à « Publiée ».
 */
export function deriveSyncState(sync: SyncInfo, currentHash: string): SyncState {
  if (sync.remoteId == null) return 'local'
  return sync.publishedHash === currentHash ? 'published' : 'desynced'
}

export const SYNC_LABELS: Record<SyncState, string> = {
  local: 'Locale',
  published: 'Publiée',
  desynced: 'Désynchronisée',
}
