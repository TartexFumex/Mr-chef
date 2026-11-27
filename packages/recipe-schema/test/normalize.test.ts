import { describe, expect, it } from 'vitest'
import { AiRecipeSchema, aiToRecipe, buildAiJsonSchema, fitRecipeToRobot, getRobot, emptyRecipe } from '../src'

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

  it('retire un programme absent du robot choisi', () => {
    const r = emptyRecipe()
    r.steps.push({ key: 's1', title: 'Pétrir', description: '', mode: { type: 'kneading', settings: { time: 60 } } })
    const { recipe, fixes } = fitRecipeToRobot(r, getRobot('compact'))
    expect(recipe.steps[0]!.mode).toBeNull()
    expect(fixes[0]!.message).toContain('indisponible')
  })
})

describe('buildAiJsonSchema', () => {
  it('limite les programmes à ceux du robot et reste strict', () => {
    type Node = { [k: string]: Node } & { enum?: string[]; anyOf?: Node[]; required?: string[]; additionalProperties?: boolean }
    const schema = buildAiJsonSchema(getRobot('compact')) as unknown as Node
    const program = schema.properties!.steps!.items!.properties!.program!.anyOf![1]!
    expect(program.properties!.type!.enum).toEqual(['customized', 'turbo', 'scale'])
    expect(schema.additionalProperties).toBe(false)
    expect(schema.required).toContain('steps')
  })
})
