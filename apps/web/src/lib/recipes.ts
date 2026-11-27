import { useLiveQuery } from 'dexie-react-hooks'
import { deriveSyncState, recipeHash, type Recipe, type RobotId, type SyncState } from '@mr-chef/recipe-schema'
import { db, emptySync, type RecipeRecord } from '../db/db'

export function newId(): string {
  return crypto.randomUUID()
}

export async function createRecipeRecord(input: {
  recipe: Recipe
  robotId: RobotId
  origin: RecipeRecord['origin']
  imageId?: string | null
}): Promise<string> {
  const id = newId()
  const now = Date.now()
  const imageId = input.imageId ?? null
  await db.recipes.add({
    id,
    title: input.recipe.title,
    createdAt: now,
    updatedAt: now,
    robotId: input.robotId,
    recipe: input.recipe,
    imageId,
    hash: await recipeHash(input.recipe, input.robotId, imageId),
    remoteId: null,
    sync: emptySync(),
    pending: null,
    origin: input.origin,
  })
  return id
}

/** Enregistre une modification locale et recalcule l'empreinte. */
export async function saveRecipe(id: string, patch: Partial<Pick<RecipeRecord, 'recipe' | 'robotId' | 'imageId'>>): Promise<void> {
  const current = await db.recipes.get(id)
  if (!current) return
  const next = { ...current, ...patch }
  const hash = await recipeHash(next.recipe, next.robotId, next.imageId)
  await db.recipes.update(id, { ...patch, title: next.recipe.title, hash, updatedAt: Date.now() })
}

export async function deleteRecipeLocal(id: string): Promise<void> {
  const rec = await db.recipes.get(id)
  await db.transaction('rw', db.recipes, db.media, async () => {
    await db.recipes.delete(id)
    if (rec?.imageId) await db.media.delete(rec.imageId)
  })
  releaseImageUrl(rec?.imageId)
}

export function syncStateOf(rec: Pick<RecipeRecord, 'sync' | 'hash'>): SyncState {
  return deriveSyncState({ remoteId: rec.sync.remoteId, publishedHash: rec.sync.publishedHash }, rec.hash)
}

export function useRecipe(id: string | undefined): RecipeRecord | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.recipes.get(id)) ?? null) : null), [id])
}

export function useRecipes(): RecipeRecord[] | undefined {
  return useLiveQuery(() => db.recipes.orderBy('updatedAt').reverse().toArray(), [])
}

export async function storeImage(blob: Blob): Promise<string> {
  const id = newId()
  await db.media.add({ id, blob, createdAt: Date.now() })
  return id
}

// Une URL objet par photo, partagée entre écrans et libérée quand la photo est supprimée.
const objectUrls = new Map<string, string>()

/** Libère l'URL objet d'une photo supprimée ou remplacée. */
export function releaseImageUrl(imageId: string | null | undefined): void {
  if (!imageId) return
  const u = objectUrls.get(imageId)
  if (u) URL.revokeObjectURL(u)
  objectUrls.delete(imageId)
}

/** URL objet d'une image locale. */
export function useImageUrl(imageId: string | null | undefined): string | null {
  const media = useLiveQuery(async () => (imageId ? ((await db.media.get(imageId)) ?? null) : null), [imageId])
  if (!media) return null
  let u = objectUrls.get(media.id)
  if (!u) {
    u = URL.createObjectURL(media.blob)
    objectUrls.set(media.id, u)
  }
  return u
}

/** Réduit une photo avant stockage (max 1600 px, JPEG), pour un envoi rapide. */
export async function prepareImage(file: Blob, maxSize = 1600): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.86))
    return blob ?? file
  } catch {
    return file
  }
}
