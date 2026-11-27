import { describe, expect, it } from 'vitest'
import { applyRemoteIds, fromMcRecord, getRobot, recipeHash, toMcPayload, deriveSyncState, type McRecipeRecord, type Recipe } from '../src'

const recipe: Recipe = {
  title: 'Test',
  description: 'Test description',
  hintsAndTips: '',
  complexity: 'facile',
  categoryIds: [259],
  servings: { amount: 1, unit: 'portion' },
  preparationTime: 240,
  readyInTime: 300,
  nutrients: { calories: 2, carbohydrate: 2, fat: 2, protein: 2 },
  ingredientGroups: [{ key: 'g1', name: 'Ingrédients courants', ingredients: [{ key: 'i1', name: 'Ananas', amount: '200', unit: 'g' }] }],
  steps: [
    { key: 's1', title: 'Simple instruction sans programme du robot', description: 'Simple instruction sans programme du robot', mode: null },
    { key: 's2', title: 'Cuisson personnalisée', description: '', mode: { type: 'customized', settings: { temperature: 60, speed: 1, time: 120, clockwise: true } } },
  ],
}

describe('toMcPayload', () => {
  it('reproduit le corps de création observé dans le HAR', () => {
    const p = toMcPayload(recipe, getRobot('connect'), 'draft', { landscapeMediaId: 10708093 })
    expect(p).toMatchObject({
      status: 'draft',
      source: 'member',
      languageLocale: 'fr-FR',
      deviceTypeIds: [12],
      complexityId: 108,
      categoryIds: [259],
      allowSocialSharing: false,
      thumbnail: { portraitMediaId: null, landscapeMediaId: 10708093, portraitIsAiGenerated: false, landscapeIsAiGenerated: false },
    })
    expect(p.nutrients).toEqual([
      { name: 'calories', unit: 'kCal', amount: 2 },
      { name: 'carbohydrate', unit: 'g', amount: 2 },
      { name: 'fat', unit: 'g', amount: 2 },
      { name: 'protein', unit: 'g', amount: 2 },
    ])
    const s = p.servingSizes[0]!
    expect(s.ingredientGroups[0]!.ingredients[0]).toEqual({ id: null, name: 'Ananas', amount: '200', unit: 'g', systemIngredientId: null, order: 1 })
    expect(s.steps[0]).toEqual({ id: null, title: recipe.steps[0]!.title, description: recipe.steps[0]!.description, ingredients: [] })
    expect(s.steps[1]!.mode).toEqual({ type: 'customized', modules: null, modeSetting: null, deviceSettings: [{ order: 0, time: 120, temperature: 60, speed: 1, clockwise: true }] })
  })
})

const record: McRecipeRecord = {
  id: 10458034,
  status: 'private-publish',
  title: 'Test',
  description: 'Test description',
  hintsAndTips: null,
  complexity: { id: 98 },
  deviceTypes: [{ id: 13 }],
  categories: [{ id: 259 }],
  nutrients: [{ name: 'calories', amount: 2 }],
  servingSizes: [
    {
      id: 875534, isDefault: true, amount: 1, unit: 'portion', instruction: '', preparationTime: 240, readyInTime: 300,
      ingredientGroups: [{ id: 1012573, name: 'Ingrédients courants', isDefault: true, order: 0, ingredients: [{ id: 8755507, name: 'Ananas', amount: '200', unit: 'g', systemIngredientId: null, order: 1 }] }],
      steps: [
        { id: 24525620, title: 'Malaxage', description: '', ingredients: [], order: 1, mode: { type: 'kneading', modeSetting: null, deviceSettings: [{ time: 120, order: 0 }] } },
        { id: 24525619, title: 'Intro', description: 'x', ingredients: [], order: 0, mode: null },
      ],
    },
  ],
}

describe('fromMcRecord / applyRemoteIds', () => {
  it('importe une recette distante en conservant les identifiants', () => {
    const r = fromMcRecord(record)
    expect(r.complexity).toBe('moyen')
    expect(r.servings.remoteId).toBe(875534)
    expect(r.steps.map((s) => s.remoteId)).toEqual([24525619, 24525620])
    expect(r.steps[1]!.mode).toEqual({ type: 'kneading', settings: { time: 120 } })
  })

  it('recopie les identifiants après création', () => {
    const withIds = applyRemoteIds(recipe, record)
    expect(withIds.ingredientGroups[0]!.remoteId).toBe(1012573)
    expect(withIds.ingredientGroups[0]!.ingredients[0]!.remoteId).toBe(8755507)
    expect(withIds.steps[0]!.remoteId).toBe(24525619)
  })
})

describe('empreinte et état de synchro', () => {
  it('ignore les identifiants et détecte les modifications', async () => {
    const h1 = await recipeHash(recipe, 'connect', null)
    const h2 = await recipeHash(applyRemoteIds(recipe, record), 'connect', null)
    expect(h1).toBe(h2)
    const h3 = await recipeHash({ ...recipe, title: 'Autre' }, 'connect', null)
    expect(h3).not.toBe(h1)
    expect(deriveSyncState({ remoteId: null, publishedHash: null }, h1)).toBe('local')
    expect(deriveSyncState({ remoteId: 1, publishedHash: h1 }, h1)).toBe('published')
    expect(deriveSyncState({ remoteId: 1, publishedHash: h1 }, h3)).toBe('desynced')
  })
})
