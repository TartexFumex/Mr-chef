import { describe, expect, it } from 'vitest'
import { AiRecipeSchema, aiToRecipe, buildAiJsonSchema, emptyRecipe, getRobot, guessIcon, iconOf, recipeHash, recipeToAi, RECIPE_ICONS } from '../src'

const ai = (icon: unknown, title = 'Velouté de potimarron') =>
  AiRecipeSchema.parse({
    title,
    icon,
    servings: { amount: 4, unit: 'portions' },
    ingredientGroups: [],
    steps: [],
  })

describe('icônes de recette', () => {
  it('ont des identifiants uniques et des titres FR/EN', () => {
    expect(new Set(RECIPE_ICONS.map((i) => i.id)).size).toBe(RECIPE_ICONS.length)
    for (const i of RECIPE_ICONS) expect(i.fr && i.en).toBeTruthy()
  })

  it("sont imposées à l'IA par le schéma JSON", () => {
    const schema = buildAiJsonSchema(getRobot('connect')) as { required: string[]; properties: { icon: { enum: string[] } } }
    expect(schema.required).toContain('icon')
    expect(schema.properties.icon.enum).toEqual(RECIPE_ICONS.map((i) => i.id))
  })

  it("gardent le choix de l'IA, ou devinent d'après le titre si le choix est invalide", () => {
    expect(aiToRecipe(ai('pasta'), getRobot('connect')).recipe.icon).toBe('pasta')
    expect(aiToRecipe(ai('licorne'), getRobot('connect')).recipe.icon).toBe('soup')
    expect(aiToRecipe(ai(undefined, 'Tarte aux pommes'), getRobot('connect')).recipe.icon).toBe('tart')
  })

  it("sont renvoyées à l'IA lors d'une retouche", () => {
    expect(recipeToAi({ ...emptyRecipe(), icon: 'cake' }).icon).toBe('cake')
  })

  it('devinent le premier mot reconnu du titre', () => {
    expect(guessIcon({ title: 'Gâteau au chocolat' })).toBe('cake')
    expect(guessIcon({ title: 'Œufs brouillés' })).toBe('egg')
    expect(guessIcon({ title: 'Truc mystère' })).toBe('plate')
    expect(iconOf({ title: 'Soupe', icon: 'pizza' }).id).toBe('pizza')
  })

  it("ne changent pas l'empreinte de publication", async () => {
    const r = emptyRecipe()
    expect(await recipeHash({ ...r, icon: 'cake' }, 'connect', null)).toBe(await recipeHash(r, 'connect', null))
  })
})
