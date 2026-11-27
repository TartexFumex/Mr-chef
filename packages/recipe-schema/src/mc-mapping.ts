import { complexityFromId, complexityId, INGREDIENT_UNITS, NUTRIENTS, SERVING_UNITS, type IngredientUnit, type ServingUnit } from './reference'
import { newKey, type DeviceSettings, type Recipe } from './recipe'
import type { RobotProfile } from './robots'
import type { McDeviceSetting, McRecipeRecord, McRecipeStatus, McRecipeWritePayload, McStep } from './mc-types'

export interface MediaIds {
  landscapeMediaId: number | null
}

function mediaRef(id: number | null) {
  return { portraitMediaId: null, landscapeMediaId: id, portraitIsAiGenerated: false, landscapeIsAiGenerated: false }
}

function toDeviceSetting(s: DeviceSettings): McDeviceSetting {
  const out: McDeviceSetting = { order: 0 }
  if (s.time !== undefined) out.time = s.time
  if (s.temperature !== undefined) out.temperature = s.temperature
  if (s.speed !== undefined) out.speed = s.speed
  if (s.clockwise !== undefined) out.clockwise = s.clockwise
  if (s.weight !== undefined) out.weight = s.weight
  return out
}

/**
 * Construit le corps envoyé à POST/PUT api/v3/auth/user/recipes, au format exact
 * observé dans la capture HAR (création en `draft`, publication en `private-publish`).
 */
export function toMcPayload(
  recipe: Recipe,
  robot: RobotProfile,
  status: McRecipeStatus,
  media: MediaIds = { landscapeMediaId: null },
): McRecipeWritePayload {
  return {
    status,
    source: 'member',
    languageLocale: 'fr-FR',
    deviceTypeIds: [robot.deviceTypeId],
    title: recipe.title,
    description: recipe.description,
    hintsAndTips: recipe.hintsAndTips,
    thumbnail: mediaRef(media.landscapeMediaId),
    detailsImage: mediaRef(media.landscapeMediaId),
    complexityId: complexityId(recipe.complexity),
    allowSocialSharing: false,
    categoryIds: recipe.categoryIds,
    nutrients: NUTRIENTS.map((n) => ({ name: n.key, unit: n.unit, amount: recipe.nutrients[n.key] })),
    servingSizes: [
      {
        id: recipe.servings.remoteId ?? null,
        isDefault: true,
        amount: recipe.servings.amount,
        unit: recipe.servings.unit,
        instruction: '',
        preparationTime: recipe.preparationTime,
        readyInTime: recipe.readyInTime,
        ingredientGroups: recipe.ingredientGroups.map((g, gi) => ({
          id: g.remoteId ?? null,
          name: g.name,
          isDefault: gi === 0,
          ingredients: g.ingredients.map((i, ii) => ({
            id: i.remoteId ?? null,
            name: i.name,
            amount: i.amount,
            unit: i.unit,
            systemIngredientId: null,
            order: ii + 1,
          })),
        })),
        steps: recipe.steps.map((s): McStep => {
          const step: McStep = { id: s.remoteId ?? null, title: s.title, description: s.description, ingredients: [] }
          if (s.mode) {
            step.mode = { type: s.mode.type, modules: null, modeSetting: null, deviceSettings: [toDeviceSetting(s.mode.settings)] }
          }
          return step
        }),
      },
    ],
  }
}

function asUnit(u: string | undefined): IngredientUnit {
  return (INGREDIENT_UNITS as readonly string[]).includes(u ?? '') ? (u as IngredientUnit) : 'unité'
}
function asServing(u: string | undefined): ServingUnit {
  return (SERVING_UNITS as readonly string[]).includes(u ?? '') ? (u as ServingUnit) : 'portions'
}

/** Convertit une recette distante en recette locale (import lors d'une synchronisation). */
export function fromMcRecord(record: McRecipeRecord): Recipe {
  const serving = record.servingSizes?.find((s) => s.isDefault) ?? record.servingSizes?.[0]
  const nutrient = (key: string) => record.nutrients?.find((n) => n.name === key)?.amount ?? 0
  const groups = [...(serving?.ingredientGroups ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const steps = [...(serving?.steps ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return {
    title: record.title ?? 'Sans titre',
    description: record.description ?? '',
    hintsAndTips: record.hintsAndTips ?? '',
    complexity: complexityFromId(record.complexity?.id),
    categoryIds: (record.categories ?? []).map((c) => c.id),
    servings: {
      ...(serving?.id != null ? { remoteId: serving.id } : {}),
      amount: Math.max(1, serving?.amount ?? 1),
      unit: asServing(serving?.unit),
    },
    preparationTime: serving?.preparationTime ?? record.preparationTime ?? 0,
    readyInTime: serving?.readyInTime ?? record.readyInTime ?? 0,
    nutrients: {
      calories: nutrient('calories'),
      carbohydrate: nutrient('carbohydrate'),
      fat: nutrient('fat'),
      protein: nutrient('protein'),
    },
    ingredientGroups: groups.map((g) => ({
      key: newKey('g'),
      ...(g.id != null ? { remoteId: g.id } : {}),
      name: g.name,
      ingredients: [...g.ingredients]
        .sort((a, b) => a.order - b.order)
        .map((i) => ({
          key: newKey('i'),
          ...(i.id != null ? { remoteId: i.id } : {}),
          name: i.name,
          amount: String(i.amount ?? ''),
          unit: asUnit(i.unit),
        })),
    })),
    steps: steps.map((s) => {
      const ds = s.mode?.deviceSettings?.[0]
      const settings: DeviceSettings = {}
      if (ds?.time !== undefined) settings.time = ds.time
      if (ds?.temperature !== undefined) settings.temperature = ds.temperature
      if (ds?.speed !== undefined) settings.speed = ds.speed
      if (ds?.clockwise !== undefined) settings.clockwise = ds.clockwise
      if (ds?.weight !== undefined) settings.weight = ds.weight
      return {
        key: newKey('s'),
        ...(s.id != null ? { remoteId: s.id } : {}),
        title: s.title,
        description: s.description ?? '',
        mode: s.mode ? { type: s.mode.type, settings } : null,
      }
    }),
  }
}

/**
 * Recopie les identifiants distants (portion, groupes, ingrédients, étapes) renvoyés
 * après une création ou une mise à jour, pour que le PUT suivant modifie les mêmes
 * éléments au lieu d'en créer de nouveaux. Le rapprochement se fait par position.
 */
export function applyRemoteIds(recipe: Recipe, record: McRecipeRecord): Recipe {
  const serving = record.servingSizes?.find((s) => s.isDefault) ?? record.servingSizes?.[0]
  if (!serving) return recipe
  const groups = [...serving.ingredientGroups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const steps = [...serving.steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return {
    ...recipe,
    servings: { ...recipe.servings, ...(serving.id != null ? { remoteId: serving.id } : {}) },
    ingredientGroups: recipe.ingredientGroups.map((g, gi) => {
      const rg = groups[gi]
      const ring = rg ? [...rg.ingredients].sort((a, b) => a.order - b.order) : []
      return {
        ...g,
        ...(rg?.id != null ? { remoteId: rg.id } : {}),
        ingredients: g.ingredients.map((i, ii) => ({ ...i, ...(ring[ii]?.id != null ? { remoteId: ring[ii]!.id! } : {}) })),
      }
    }),
    steps: recipe.steps.map((s, si) => ({ ...s, ...(steps[si]?.id != null ? { remoteId: steps[si]!.id! } : {}) })),
  }
}
