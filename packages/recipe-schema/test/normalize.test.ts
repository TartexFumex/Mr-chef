import { describe, expect, it } from 'vitest'
import {
  AiRecipeSchema,
  aiToRecipe,
  buildAiJsonSchema,
  buildRevisionPrompt,
  carryRemoteIds,
  defaultSystemPrompt,
  emptyRecipe,
  fitRecipeToRobot,
  getRobot,
  modeHint,
  modeSpec,
  recipeToAi,
  renderSystemPrompt,
  ROBOTS,
} from '../src'

const robot = getRobot('connect')

const aiSample = {
  title: 'Velouté de potimarron',
  description: 'Doux et onctueux.',
  hintsAndTips: '',
  complexity: 'facile',
  categories: ['Soupes & potées', 'Végétarien', 'Inconnue'],
  servings: { amount: 4, unit: 'portions' },
  preparationMinutes: 10,
  totalMinutes: 35,
  nutritionPerServing: { calories: 210.4, carbohydrate: 18, fat: 13, protein: 4 },
  ingredientGroups: [
    {
      name: 'Velouté',
      ingredients: [
        { name: 'Potimarron', amount: '0,6', unit: 'kg' },
        { name: 'Lait de coco', amount: '40', unit: 'cl' },
        { name: 'Sel', amount: '1', unit: 'pincée' },
      ],
    },
  ],
  steps: [
    { title: 'Mixer', description: 'Ajoutez le potimarron.', program: { type: 'customized', timeSeconds: 10, temperature: null, speed: 8, reverse: false, weightGrams: null } },
    { title: 'Cuire', description: '', program: { type: 'customized', timeSeconds: 1200, temperature: 102, speed: 5, reverse: true, weightGrams: null } },
    { title: 'Turbo', description: '', program: { type: 'turbo', timeSeconds: 60, temperature: null, speed: null, reverse: null, weightGrams: null } },
    { title: 'Servir', description: 'Dans des bols chauds.', program: null },
  ],
}

describe('aiToRecipe', () => {
  it('convertit et ajuste aux plages du robot', () => {
    const ai = AiRecipeSchema.parse(aiSample)
    const { recipe, fixes } = aiToRecipe(ai, robot)
    expect(recipe.categoryIds).toEqual([227, 583])
    expect(recipe.ingredientGroups[0]!.ingredients[0]).toMatchObject({ amount: '600', unit: 'g' })
    expect(recipe.ingredientGroups[0]!.ingredients[1]).toMatchObject({ amount: '400', unit: 'ml' })
    expect(recipe.nutrients.calories).toBe(210)
    expect(recipe.steps[0]!.mode).toEqual({ type: 'customized', settings: { time: 10, temperature: 0, speed: 8, clockwise: false } })
    // 102 °C arrondi au pas de 5, vitesse bridée à 3 en chauffe
    expect(recipe.steps[1]!.mode!.settings).toEqual({ time: 1200, temperature: 100, speed: 3, clockwise: true })
    // turbo limité à 20 s et description requise
    expect(recipe.steps[2]!.mode!.settings).toEqual({ time: 20 })
    expect(recipe.steps[2]!.description).toBe('Turbo')
    expect(recipe.steps[3]!.mode).toBeNull()
    expect(fixes.length).toBeGreaterThanOrEqual(3)
  })

  it('retire un programme sans équivalent sur le robot choisi', () => {
    const r = emptyRecipe()
    r.steps.push({ key: 's1', title: 'Œufs', description: '', mode: { type: 'cookingEggs', settings: {} } })
    const { recipe, fixes } = fitRecipeToRobot(r, getRobot('compact'))
    expect(recipe.steps[0]!.mode).toBeNull()
    expect(fixes[0]!.kind).toBe('unavailable')
  })

  it('remplace un programme par son équivalent en changeant de robot', () => {
    const r = emptyRecipe()
    r.steps.push(
      { key: 's1', title: 'Pétrir', description: '', mode: { type: 'kneading', settings: { time: 120 } } },
      { key: 's2', title: 'Sous vide', description: '', mode: { type: 'sousVide', settings: { time: 7200, temperature: 62 } } },
    )
    const smart = fitRecipeToRobot(r, getRobot('smart'))
    expect(smart.recipe.steps[0]!.mode).toEqual({ type: 'kneadingSolidDough', settings: { time: 120 } })
    expect(smart.recipe.steps[1]!.mode).toEqual({ type: 'sousVide', settings: { time: 7200, temperature: 62 } })
    const back = fitRecipeToRobot(smart.recipe, getRobot('connect'))
    expect(back.recipe.steps[0]!.mode).toEqual({ type: 'kneading', settings: { time: 120 } })
    // Sous vide → cuisson personnalisée, 62 °C arrondi au palier de 5, sens inverse, vitesse 1.
    expect(back.recipe.steps[1]!.mode).toEqual({ type: 'customized', settings: { time: 5940, temperature: 60, clockwise: true, speed: 1 } })
    expect(back.fixes.filter((f) => f.kind === 'replaced')).toHaveLength(2)
  })

  it('applique les bridages de vitesse propres à chaque robot', () => {
    const r = emptyRecipe()
    r.steps.push({ key: 's1', title: 'Mixer', description: '', mode: { type: 'customized', settings: { time: 900, temperature: 0, speed: 10, clockwise: false } } })
    // Compact : 6 maximum au-delà de 10 min.
    expect(fitRecipeToRobot(r, getRobot('compact')).recipe.steps[0]!.mode!.settings.speed).toBe(6)
    // Connect : pas de bridage sans chauffe.
    expect(fitRecipeToRobot(r, getRobot('connect')).recipe.steps[0]!.mode!.settings.speed).toBe(10)
    // MC4 : 10 min maximum à partir de la vitesse 6.
    expect(fitRecipeToRobot(r, getRobot('mc4')).recipe.steps[0]!.mode!.settings).toMatchObject({ speed: 10, time: 600 })
    // MC4 : demi-vitesses, 4 maximum en chauffe.
    r.steps[0]!.mode!.settings = { time: 60, temperature: 90, speed: 2.4, clockwise: true }
    expect(fitRecipeToRobot(r, getRobot('mc4')).recipe.steps[0]!.mode!.settings.speed).toBe(2.5)
    // Compact : turbo sans durée.
    r.steps[0]!.mode = { type: 'turbo', settings: { time: 5 } }
    expect(fitRecipeToRobot(r, getRobot('compact')).recipe.steps[0]!.mode!.settings).toEqual({})
  })
})

describe('prompt et explications', () => {
  it('ne liste que les programmes du robot, avec ses plages', () => {
    const compact = renderSystemPrompt(defaultSystemPrompt('fr'), getRobot('compact'), 'fr')
    expect(compact).toContain('- kneading (Pétrir) : Pétrissage de pâte. Durée 45 s à 1 min 30 s.')
    expect(compact).not.toContain('sousVide')
    const smart = renderSystemPrompt(defaultSystemPrompt('en'), getRobot('smart'), 'en')
    expect(smart).toContain('sousVide')
    expect(smart).not.toContain('- kneading ')
    expect(modeHint(modeSpec(getRobot('compact'), 'customized')!, 'fr')).toContain(
      'température 0 (sans chauffe) ou 37 à 130 °C par pas de 5, vitesse 1 à 10 (3 maximum dès qu’on chauffe, 3 maximum en sens inverse, 6 maximum au-delà de 10 min)',
    )
  })

  it('a un libellé pour chaque programme de chaque robot', () => {
    for (const r of ROBOTS) for (const m of r.modes) expect(modeHint(m, 'en')).not.toMatch(/^ /)
  })
})

describe('buildAiJsonSchema', () => {
  it('limite les programmes à ceux du robot et reste strict', () => {
    type Node = { [k: string]: Node } & { enum?: string[]; anyOf?: Node[]; required?: string[]; additionalProperties?: boolean }
    const schema = buildAiJsonSchema(getRobot('compact')) as unknown as Node
    const program = schema.properties!.steps!.items!.properties!.program!.anyOf![1]!
    expect(program.properties!.type!.enum).toEqual(['customized', 'kneading', 'steaming', 'roasting', 'scale', 'turbo'])
    expect(schema.additionalProperties).toBe(false)
    expect(schema.required).toContain('steps')
  })
})

describe('révision par IA', () => {
  it('recipeToAi renvoie une forme que aiToRecipe relit à l’identique', () => {
    const { recipe } = aiToRecipe(AiRecipeSchema.parse(aiSample), robot)
    const ai = recipeToAi(recipe)
    expect(AiRecipeSchema.safeParse(ai).success).toBe(true)
    const back = aiToRecipe(AiRecipeSchema.parse(ai), robot).recipe
    const strip = (r: typeof recipe) => JSON.parse(JSON.stringify(r, (k, v) => (k === 'key' ? undefined : v)))
    expect(strip(back)).toEqual(strip(recipe))
  })

  it('carryRemoteIds reporte les identifiants distants par position', () => {
    const prev = emptyRecipe()
    prev.servings.remoteId = 7
    prev.ingredientGroups[0]!.remoteId = 11
    prev.ingredientGroups[0]!.ingredients = [{ key: 'a', remoteId: 21, name: 'x', amount: '1', unit: 'g' }]
    prev.steps = [{ key: 's', remoteId: 31, title: 't', description: '', mode: null }]
    const next = aiToRecipe(AiRecipeSchema.parse(aiSample), robot).recipe
    const out = carryRemoteIds(next, prev)
    expect(out.servings.remoteId).toBe(7)
    expect(out.ingredientGroups[0]!.remoteId).toBe(11)
    expect(out.ingredientGroups[0]!.ingredients.map((i) => i.remoteId)).toEqual([21, undefined, undefined])
    expect(out.steps.map((s) => s.remoteId)).toEqual([31, undefined, undefined, undefined])
  })

  it('le prompt de révision contient la recette et la demande', () => {
    const p = buildRevisionPrompt({ title: 'Soupe' }, ' sans gluten ', 'fr')
    expect(p).toContain('"title": "Soupe"')
    expect(p).toContain('sans gluten')
    expect(buildRevisionPrompt({}, 'vegan', 'en')).toContain('Change requested by the user: vegan')
  })
})
