import { z } from 'zod'
import { INGREDIENT_UNITS, SERVING_UNITS } from './reference'

/** Réglages d'un programme robot pour une étape. Champs absents = non applicables. */
export const DeviceSettingsSchema = z.object({
  time: z.number().int().nonnegative().optional(),
  temperature: z.number().int().nonnegative().optional(),
  /** Demi-vitesses possibles sur le MC4 (0,5 à 10). */
  speed: z.number().positive().optional(),
  clockwise: z.boolean().optional(),
  weight: z.number().int().positive().optional(),
})
export type DeviceSettings = z.infer<typeof DeviceSettingsSchema>

export const StepModeSchema = z.object({
  type: z.string(),
  settings: DeviceSettingsSchema,
})
export type StepMode = z.infer<typeof StepModeSchema>

export const IngredientSchema = z.object({
  key: z.string(),
  remoteId: z.number().int().optional(),
  name: z.string(),
  amount: z.string(),
  unit: z.enum(INGREDIENT_UNITS),
})
export type Ingredient = z.infer<typeof IngredientSchema>

export const IngredientGroupSchema = z.object({
  key: z.string(),
  remoteId: z.number().int().optional(),
  name: z.string(),
  ingredients: z.array(IngredientSchema),
})
export type IngredientGroup = z.infer<typeof IngredientGroupSchema>

export const StepSchema = z.object({
  key: z.string(),
  remoteId: z.number().int().optional(),
  title: z.string(),
  description: z.string(),
  mode: StepModeSchema.nullable(),
})
export type Step = z.infer<typeof StepSchema>

export const RecipeSchema = z.object({
  title: z.string(),
  /** Icône de la liste RECIPE_ICONS, montrée quand la recette n'a pas de photo (jamais envoyée à Monsieur Cuisine). */
  icon: z.string().optional(),
  description: z.string(),
  hintsAndTips: z.string(),
  complexity: z.enum(['facile', 'moyen', 'difficile']),
  categoryIds: z.array(z.number().int()),
  servings: z.object({
    remoteId: z.number().int().optional(),
    amount: z.number().int().positive(),
    unit: z.enum(SERVING_UNITS),
  }),
  /** En minutes, comme le site Monsieur Cuisine. */
  preparationTime: z.number().int().nonnegative(),
  /** En minutes : temps total jusqu'au service. */
  readyInTime: z.number().int().nonnegative(),
  nutrients: z.object({
    calories: z.number().nonnegative(),
    carbohydrate: z.number().nonnegative(),
    fat: z.number().nonnegative(),
    protein: z.number().nonnegative(),
  }),
  ingredientGroups: z.array(IngredientGroupSchema),
  steps: z.array(StepSchema),
})
export type Recipe = z.infer<typeof RecipeSchema>

let counter = 0
/** Identifiant local stable pour les listes (glisser-déposer, rapprochement distant). */
export function newKey(prefix = 'k'): string {
  counter = (counter + 1) % 1_000_000
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`
}

export function emptyRecipe(texts: { title: string; group: string } = { title: 'Nouvelle recette', group: 'Ingrédients' }): Recipe {
  return {
    title: texts.title,
    description: '',
    hintsAndTips: '',
    complexity: 'facile',
    categoryIds: [259],
    servings: { amount: 4, unit: 'portions' },
    preparationTime: 15,
    readyInTime: 30,
    nutrients: { calories: 0, carbohydrate: 0, fat: 0, protein: 0 },
    ingredientGroups: [{ key: newKey('g'), name: texts.group, ingredients: [] }],
    steps: [],
  }
}
