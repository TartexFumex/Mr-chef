import type { AiRecipe } from './ai-schema'
import { CATEGORIES, INGREDIENT_UNITS, SERVING_UNITS, type IngredientUnit, type ServingUnit } from './reference'
import { newKey, type DeviceSettings, type Recipe, type Step } from './recipe'
import { modeSpec, type ModeSpec, type Range, type RobotProfile } from './robots'

export type FixKind = 'time' | 'temperature' | 'speed' | 'weight' | 'unavailable'

/** Correction appliquée à une étape ; `message` est en français, l'interface traduit à partir des champs. */
export interface Fix {
  stepIndex?: number
  kind: FixKind
  /** Programme concerné (type). */
  mode: string
  /** Nouvelle valeur après correction (absente pour « unavailable »). */
  value?: number
  message: string
}

function clampRange(value: number, range: Range): number {
  if (range.also?.includes(value)) return value
  let v = Math.round(value)
  if (range.step) v = Math.round(v / range.step) * range.step
  return Math.min(range.max, Math.max(range.min, v))
}

/** Ajuste les réglages d'une étape aux plages du programme, en listant les corrections faites. */
export function fitSettings(spec: ModeSpec, input: DeviceSettings, fixes: Fix[], stepIndex?: number): DeviceSettings {
  const out: DeviceSettings = {}
  const note = (kind: FixKind, value: number, message: string) => fixes.push({ stepIndex, kind, mode: spec.type, value, message })

  if (spec.time) {
    const raw = input.time ?? spec.time.min
    const v = clampRange(raw, spec.time)
    if (input.time !== undefined && v !== input.time) note('time', v, `Durée ramenée à ${v} s (${spec.label})`)
    out.time = v
  }
  if (spec.temperature) {
    const raw = input.temperature ?? 0
    let v: number
    if (raw <= 0) v = 0
    else if (raw < spec.temperature.min) v = spec.temperature.min
    else v = clampRange(raw, spec.temperature)
    if (input.temperature !== undefined && v !== input.temperature) note('temperature', v, `Température ramenée à ${v} °C (${spec.label})`)
    out.temperature = v
  }
  if (spec.speed) {
    const raw = input.speed ?? spec.speed.min
    let v = clampRange(raw, spec.speed)
    if (spec.maxSpeedWhenHeating && (out.temperature ?? 0) > 0 && v > spec.maxSpeedWhenHeating) {
      v = spec.maxSpeedWhenHeating
    }
    if (input.speed !== undefined && v !== input.speed) note('speed', v, `Vitesse ramenée à ${v} (${spec.label})`)
    out.speed = v
  }
  if (spec.clockwise) out.clockwise = input.clockwise ?? false
  if (spec.weight) {
    const raw = input.weight ?? spec.weight.min
    const v = clampRange(raw, spec.weight)
    if (input.weight !== undefined && v !== input.weight) note('weight', v, `Poids ramené à ${v} g (${spec.label})`)
    out.weight = v
  }
  return out
}

/** Vérifie une recette pour un robot donné et renvoie la version conforme et les corrections. */
export function fitRecipeToRobot(recipe: Recipe, robot: RobotProfile): { recipe: Recipe; fixes: Fix[] } {
  const fixes: Fix[] = []
  const steps: Step[] = recipe.steps.map((step, i) => {
    if (!step.mode) return step
    const spec = modeSpec(robot, step.mode.type)
    if (!spec) {
      fixes.push({ stepIndex: i, kind: 'unavailable', mode: step.mode.type, message: `Programme « ${step.mode.type} » indisponible sur ${robot.name}, étape gardée sans programme` })
      return { ...step, mode: null }
    }
    const settings = fitSettings(spec, step.mode.settings, fixes, i)
    const description = spec.requiresDescription && !step.description.trim() ? step.title : step.description
    return { ...step, description, mode: { type: spec.type, settings } }
  })
  return { recipe: { ...recipe, steps }, fixes }
}

function asUnit(u: string): IngredientUnit {
  const v = u.trim().toLowerCase()
  if ((INGREDIENT_UNITS as readonly string[]).includes(v)) return v as IngredientUnit
  if (['cl', 'l', 'litre', 'litres'].includes(v)) return 'ml'
  if (['kg', 'gramme', 'grammes'].includes(v)) return 'g'
  if (['cuillère à café', 'cac', 'c. à c.'].includes(v)) return 'c.c.'
  if (['cuillère à soupe', 'cas', 'c. à s.'].includes(v)) return 'c.s.'
  return 'unité'
}

function asServingUnit(u: string): ServingUnit {
  const v = u.trim().toLowerCase()
  return (SERVING_UNITS as readonly string[]).includes(v) ? (v as ServingUnit) : 'portions'
}

function convertAmount(amount: string | number, rawUnit: string): string {
  const unit = rawUnit.trim().toLowerCase()
  const n = typeof amount === 'number' ? amount : Number(String(amount).replace(',', '.'))
  if (Number.isFinite(n)) {
    if (unit === 'kg') return String(Math.round(n * 1000))
    if (unit === 'l' || unit === 'litre' || unit === 'litres') return String(Math.round(n * 1000))
    if (unit === 'cl') return String(Math.round(n * 10))
  }
  return String(amount).trim()
}

/** Convertit la réponse IA en recette locale conforme au robot. */
export function aiToRecipe(ai: AiRecipe, robot: RobotProfile): { recipe: Recipe; fixes: Fix[] } {
  const categoryIds = ai.categories
    .map((label) => CATEGORIES.find((c) => c.label.toLowerCase() === label.toLowerCase())?.id)
    .filter((id): id is (typeof CATEGORIES)[number]['id'] => id !== undefined)

  const draft: Recipe = {
    title: ai.title.trim(),
    description: ai.description.trim(),
    hintsAndTips: ai.hintsAndTips.trim(),
    complexity: ai.complexity,
    categoryIds: categoryIds.length ? [...new Set(categoryIds)] : [259],
    servings: { amount: Math.max(1, Math.round(ai.servings.amount || 1)), unit: asServingUnit(ai.servings.unit) },
    preparationTime: Math.max(0, Math.round(ai.preparationMinutes)),
    readyInTime: Math.max(Math.round(ai.preparationMinutes), Math.round(ai.totalMinutes)),
    nutrients: {
      calories: Math.max(0, Math.round(ai.nutritionPerServing.calories)),
      carbohydrate: Math.max(0, Math.round(ai.nutritionPerServing.carbohydrate)),
      fat: Math.max(0, Math.round(ai.nutritionPerServing.fat)),
      protein: Math.max(0, Math.round(ai.nutritionPerServing.protein)),
    },
    ingredientGroups: ai.ingredientGroups.map((g) => ({
      key: newKey('g'),
      name: g.name.trim() || 'Ingrédients',
      ingredients: g.ingredients.map((i) => ({
        key: newKey('i'),
        name: i.name.trim(),
        amount: convertAmount(i.amount, i.unit),
        unit: asUnit(i.unit),
      })),
    })),
    steps: ai.steps.map((s) => {
      const p = s.program
      const settings: DeviceSettings = {}
      if (p) {
        if (p.timeSeconds != null) settings.time = p.timeSeconds
        if (p.temperature != null) settings.temperature = p.temperature
        if (p.speed != null) settings.speed = p.speed
        if (p.reverse != null) settings.clockwise = p.reverse
        if (p.weightGrams != null) settings.weight = p.weightGrams
      }
      return {
        key: newKey('s'),
        title: s.title.trim(),
        description: s.description.trim(),
        mode: p ? { type: p.type, settings } : null,
      }
    }),
  }
  if (draft.ingredientGroups.length === 0) draft.ingredientGroups.push({ key: newKey('g'), name: 'Ingrédients', ingredients: [] })
  return fitRecipeToRobot(draft, robot)
}
