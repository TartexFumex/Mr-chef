import Dexie, { type EntityTable } from 'dexie'
import type { Recipe, RobotId } from '@mr-chef/recipe-schema'

export type PendingOp = 'publish' | 'unpublish' | null
export type ProviderId = 'anthropic' | 'openai' | 'mistral'

export interface SyncMeta {
  remoteId: number | null
  /** Empreinte du contenu au moment de la dernière publication réussie. */
  publishedHash: string | null
  remoteStatus: string | null
  remoteUpdatedAt: string | null
  lastSyncedAt: number | null
  /** Médias Monsieur Cuisine déjà envoyés pour l'image locale `imageId`. */
  media: { imageId: string; detailsMediaId: number; thumbnailMediaId: number } | null
  /** Version distante divergente, en attente d'un choix de l'utilisateur. */
  conflict: { recipe: Recipe; remoteUpdatedAt: string | null } | null
  /** Dernière erreur de synchronisation, affichée dans l'éditeur. */
  error: string | null
}

export interface RecipeRecord {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  robotId: RobotId
  recipe: Recipe
  imageId: string | null
  /** Empreinte du contenu actuel (recipeHash), recalculée à chaque enregistrement. */
  hash: string
  /** Copie de sync.remoteId pour l'index. */
  remoteId: number | null
  sync: SyncMeta
  pending: PendingOp
  origin: { provider: ProviderId | 'import' | 'manual'; model: string | null; prompt: string | null }
}

export interface MediaRecord {
  id: string
  blob: Blob
  createdAt: number
}

export interface KvRecord {
  key: string
  value: unknown
}

export interface SecretRecord {
  id: string
  iv: Uint8Array
  data: ArrayBuffer
}

export interface KeyRecord {
  id: string
  key: CryptoKey
}

export class MrChefDb extends Dexie {
  recipes!: EntityTable<RecipeRecord, 'id'>
  media!: EntityTable<MediaRecord, 'id'>
  kv!: EntityTable<KvRecord, 'key'>
  secrets!: EntityTable<SecretRecord, 'id'>
  keys!: EntityTable<KeyRecord, 'id'>

  constructor(name = 'mr-chef') {
    super(name)
    this.version(1).stores({
      recipes: 'id, updatedAt, remoteId, pending, title',
      media: 'id',
      kv: 'key',
      secrets: 'id',
      keys: 'id',
    })
  }
}

export const db = new MrChefDb()

export function emptySync(): SyncMeta {
  return { remoteId: null, publishedHash: null, remoteStatus: null, remoteUpdatedAt: null, lastSyncedAt: null, media: null, conflict: null, error: null }
}
