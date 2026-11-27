/**
 * Référentiels Monsieur Cuisine (locale fr-FR), tels que décrits dans swagger.json
 * et renvoyés par `admin-ajax.php?action=load_recipe_post` dans la capture HAR.
 */

export const COMPLEXITIES = [
  { key: 'facile', id: 108, label: 'Facile' },
  { key: 'moyen', id: 98, label: 'Moyen' },
  { key: 'difficile', id: 103, label: 'Difficile' },
] as const
export type ComplexityKey = (typeof COMPLEXITIES)[number]['key']

export function complexityId(key: ComplexityKey): number {
  return COMPLEXITIES.find((c) => c.key === key)!.id
}
export function complexityFromId(id: number | undefined | null): ComplexityKey {
  return COMPLEXITIES.find((c) => c.id === id)?.key ?? 'facile'
}

export const CATEGORIES = [
  { id: 219, label: 'Sauces et dips' },
  { id: 227, label: 'Soupes & potées' },
  { id: 235, label: 'Salades' },
  { id: 243, label: 'Garnitures' },
  { id: 251, label: 'Snacks' },
  { id: 259, label: 'Plats principaux' },
  { id: 267, label: 'Aliments pour bébé' },
  { id: 275, label: 'Boissons' },
  { id: 283, label: 'One-Pot / All-in-One' },
  { id: 307, label: 'Dessert' },
  { id: 315, label: 'Recettes au four' },
  { id: 323, label: 'Petit-déjeuner' },
  { id: 331, label: 'Dîner' },
  { id: 339, label: 'Entrées' },
  { id: 347, label: 'Confitures & gelées' },
  { id: 555, label: 'Trancheuse-râpe' },
  { id: 574, label: 'Végan' },
  { id: 583, label: 'Végétarien' },
] as const
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

/** Unités d'ingrédients acceptées par l'éditeur officiel. */
export const INGREDIENT_UNITS = ['g', 'ml', 'c.c.', 'c.s.', 'pincée', 'pincées', 'caissette', 'caissettes', 'unité'] as const
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number]

/** Unités de portions renvoyées par `load_recipe_post` (doublons retirés). */
export const SERVING_UNITS = [
  'portion', 'portions', 'part', 'parts', 'verre', 'verres', 'pot', 'pots',
  'bocal', 'bocaux', 'unité', 'unités', 'bouteille', 'bouteilles',
] as const
export type ServingUnit = (typeof SERVING_UNITS)[number]

export const NUTRIENTS = [
  { key: 'calories', unit: 'kCal', label: 'Calories' },
  { key: 'carbohydrate', unit: 'g', label: 'Glucides' },
  { key: 'fat', unit: 'g', label: 'Lipides' },
  { key: 'protein', unit: 'g', label: 'Protéines' },
] as const
export type NutrientKey = (typeof NUTRIENTS)[number]['key']
