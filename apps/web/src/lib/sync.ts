import {
  applyRemoteIds,
  fitRecipeToRobot,
  fromMcRecord,
  getRobot,
  recipeHash,
  robotFromDeviceTypeId,
  toMcPayload,
  type Recipe,
} from '@mr-chef/recipe-schema'
import type { McClient } from '@mr-chef/mc-client'
import { db, emptySync, type RecipeRecord } from '../db/db'
import { errorMessage, withMc } from './mc'
import { newId } from './recipes'
import { getSettings, setSettings } from './settings'

/** Retire les identifiants distants : une republication recréera des éléments neufs. */
function stripRemoteIds(recipe: Recipe): Recipe {
  return {
    ...recipe,
    servings: { amount: recipe.servings.amount, unit: recipe.servings.unit },
    ingredientGroups: recipe.ingredientGroups.map(({ remoteId: _g, ...g }) => ({
      ...g,
      ingredients: g.ingredients.map(({ remoteId: _i, ...i }) => i),
    })),
    steps: recipe.steps.map(({ remoteId: _s, ...s }) => s),
  }
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

async function ensureMedia(client: McClient, rec: RecipeRecord) {
  if (!rec.imageId) return { media: null, ids: { detailsMediaId: null, thumbnailMediaId: null } }
  if (rec.sync.media?.imageId === rec.imageId) {
    return { media: rec.sync.media, ids: { detailsMediaId: rec.sync.media.detailsMediaId, thumbnailMediaId: rec.sync.media.thumbnailMediaId } }
  }
  const stored = await db.media.get(rec.imageId)
  if (!stored) return { media: null, ids: { detailsMediaId: null, thumbnailMediaId: null } }
  const ids = await client.uploadRecipeImages(stored.blob)
  return { media: { imageId: rec.imageId, ...ids }, ids }
}

/**
 * Publie (ou met à jour) une recette sur Monsieur Cuisine.
 * Première publication : création en brouillon puis PUT en private-publish, comme le site officiel.
 */
export async function publishRecipe(id: string): Promise<void> {
  if (isOffline()) {
    await db.recipes.update(id, { pending: 'publish' })
    return
  }
  const rec = await db.recipes.get(id)
  if (!rec) return
  const robot = getRobot(rec.robotId)
  const { recipe: fitted } = fitRecipeToRobot(rec.recipe, robot)
  try {
    await withMc(async (client) => {
      const { media, ids } = await ensureMedia(client, rec)
      let current = fitted
      let remoteId = rec.sync.remoteId
      if (remoteId == null) {
        const created = await client.createRecipe(toMcPayload(current, robot, 'draft', ids))
        remoteId = created.id
        current = applyRemoteIds(current, created)
        // Mémorisé tout de suite : si l'étape suivante échoue, on ne recréera pas de doublon.
        await db.recipes.update(id, { remoteId, sync: { ...rec.sync, remoteId } })
        rec.sync = { ...rec.sync, remoteId }
      }
      const updated = await client.updateRecipe(remoteId, toMcPayload(current, robot, 'private-publish', ids))
      current = applyRemoteIds(current, updated)
      const hash = await recipeHash(current, rec.robotId, rec.imageId)
      await db.recipes.update(id, {
        recipe: current,
        hash,
        remoteId,
        pending: null,
        sync: {
          ...rec.sync,
          remoteId,
          publishedHash: hash,
          remoteStatus: updated.status ?? 'private-publish',
          remoteUpdatedAt: updated.updatedAt ?? null,
          lastSyncedAt: Date.now(),
          media,
          conflict: null,
          error: null,
        },
      })
    })
  } catch (e) {
    await db.recipes.update(id, { pending: null, sync: { ...rec.sync, error: errorMessage(e) } })
    throw e
  }
}

/** Retire la recette du compte Monsieur Cuisine (corbeille) et la garde en local. */
export async function unpublishRecipe(id: string): Promise<void> {
  if (isOffline()) {
    await db.recipes.update(id, { pending: 'unpublish' })
    return
  }
  const rec = await db.recipes.get(id)
  if (!rec || rec.sync.remoteId == null) return
  try {
    await withMc((client) => client.trashRecipe(rec.sync.remoteId!))
    const recipe = stripRemoteIds(rec.recipe)
    await db.recipes.update(id, {
      recipe,
      remoteId: null,
      pending: null,
      sync: { ...emptySync(), lastSyncedAt: Date.now() },
    })
  } catch (e) {
    await db.recipes.update(id, { pending: null, sync: { ...rec.sync, error: errorMessage(e) } })
    throw e
  }
}

/** Rejoue les publications et dépublications demandées hors ligne. */
export async function processPendingQueue(): Promise<void> {
  if (isOffline()) return
  const pending = await db.recipes.where('pending').anyOf(['publish', 'unpublish']).toArray()
  for (const rec of pending) {
    try {
      if (rec.pending === 'publish') await publishRecipe(rec.id)
      else if (rec.pending === 'unpublish') await unpublishRecipe(rec.id)
    } catch {
      // l'erreur est enregistrée sur la recette ; on passe à la suivante
    }
  }
}

export interface RefreshReport {
  imported: number
  updated: number
  conflicts: number
  detached: number
}

/**
 * Récupère les recettes du compte et met à jour la base locale :
 * nouvelles recettes importées, versions distantes plus récentes reprises si la
 * version locale n'a pas bougé, conflit signalé sinon, recettes disparues repassées en locales.
 */
export async function refreshFromRemote(): Promise<RefreshReport> {
  const report: RefreshReport = { imported: 0, updated: 0, conflicts: 0, detached: 0 }
  const settings = await getSettings()
  await withMc(async (client) => {
    const remote = await client.listAllRecipes()
    const remoteIds = new Set(remote.map((r) => r.id))
    const locals = await db.recipes.where('remoteId').above(0).toArray()
    const byRemote = new Map(locals.map((l) => [l.remoteId!, l]))

    for (const summary of remote) {
      const local = byRemote.get(summary.id)
      if (local && local.sync.remoteUpdatedAt === (summary.updatedAt ?? null)) continue
      const record = await client.getRecipe(summary.id)
      const recipe = fromMcRecord(record)
      const robotId = robotFromDeviceTypeId(record.deviceTypes?.[0]?.id)?.id ?? settings.robotId

      if (!local) {
        const imageId = null
        const hash = await recipeHash(recipe, robotId, imageId)
        const now = Date.now()
        await db.recipes.add({
          id: newId(),
          title: recipe.title,
          createdAt: now,
          updatedAt: now,
          robotId,
          recipe,
          imageId,
          hash,
          remoteId: record.id,
          pending: null,
          origin: { provider: 'import', model: null, prompt: null },
          sync: {
            ...emptySync(),
            remoteId: record.id,
            publishedHash: hash,
            remoteStatus: record.status,
            remoteUpdatedAt: record.updatedAt ?? summary.updatedAt ?? null,
            lastSyncedAt: now,
          },
        })
        report.imported++
        continue
      }

      const locallyModified = local.hash !== local.sync.publishedHash
      if (locallyModified) {
        await db.recipes.update(local.id, {
          sync: { ...local.sync, conflict: { recipe, remoteUpdatedAt: record.updatedAt ?? null } },
        })
        report.conflicts++
      } else {
        const hash = await recipeHash(recipe, robotId, local.imageId)
        await db.recipes.update(local.id, {
          recipe,
          title: recipe.title,
          robotId,
          hash,
          updatedAt: Date.now(),
          sync: {
            ...local.sync,
            publishedHash: hash,
            remoteStatus: record.status,
            remoteUpdatedAt: record.updatedAt ?? null,
            lastSyncedAt: Date.now(),
            conflict: null,
            error: null,
          },
        })
        report.updated++
      }
    }

    for (const local of locals) {
      if (!remoteIds.has(local.remoteId!)) {
        await db.recipes.update(local.id, {
          recipe: stripRemoteIds(local.recipe),
          remoteId: null,
          sync: { ...emptySync() },
        })
        report.detached++
      }
    }
  })
  await setSettings({ lastRefreshAt: Date.now() })
  return report
}

/** Résout un conflit : garder la version locale (elle sera republiée) ou prendre celle en ligne. */
export async function resolveConflict(id: string, keep: 'local' | 'remote'): Promise<void> {
  const rec = await db.recipes.get(id)
  if (!rec?.sync.conflict) return
  if (keep === 'remote') {
    const recipe = rec.sync.conflict.recipe
    const hash = await recipeHash(recipe, rec.robotId, rec.imageId)
    await db.recipes.update(id, {
      recipe,
      title: recipe.title,
      hash,
      updatedAt: Date.now(),
      sync: { ...rec.sync, publishedHash: hash, remoteUpdatedAt: rec.sync.conflict.remoteUpdatedAt, conflict: null },
    })
  } else {
    await db.recipes.update(id, { sync: { ...rec.sync, remoteUpdatedAt: rec.sync.conflict.remoteUpdatedAt, conflict: null } })
    await publishRecipe(id)
  }
}
