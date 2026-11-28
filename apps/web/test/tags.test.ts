import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyRecipe } from '@mr-chef/recipe-schema'
import { db, MrChefDb } from '../src/db/db'
import { createRecipeRecord } from '../src/lib/recipes'
import { completeTag, currentFragment, matchesTag, normalizeTags, parseTags, setRecipeTags, suggestTags } from '../src/lib/tags'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('mots-clés', () => {
  it('découpe, nettoie et dédoublonne sans tenir compte de la casse ni des accents', () => {
    expect(parseTags(' soupe,  Hiver , ,soupe, été')).toEqual(['soupe', 'Hiver', 'été'])
    expect(normalizeTags(['Végétarien', 'vegetarien', '  plat   du jour '])).toEqual(['Végétarien', 'plat du jour'])
  })

  it('complète le mot-clé en cours de frappe', () => {
    expect(currentFragment('soupe, hiv')).toBe('hiv')
    expect(completeTag('soupe, hiv', 'hiver')).toBe('soupe, hiver, ')
    expect(completeTag('so', 'soupe')).toBe('soupe, ')
    const all = ['soupe', 'hiver', 'rapide', 'Été']
    expect(suggestTags(all, 'soupe, ')).toEqual(['hiver', 'rapide', 'Été'])
    expect(suggestTags(all, 'soupe, e')).toEqual(['hiver', 'rapide', 'Été'])
    expect(suggestTags(all, 'ete')).toEqual([])
    expect(suggestTags(all, 'ra')).toEqual(['rapide'])
  })

  it('cherche par mot-clé et n’altère pas l’état de synchronisation', async () => {
    const id = await createRecipeRecord({ recipe: emptyRecipe(), robotId: 'connect', origin: { provider: 'manual', model: null, prompt: null } })
    const before = (await db.recipes.get(id))!
    await setRecipeTags(id, ['Soupe', 'soupe', 'hiver'])
    const after = (await db.recipes.get(id))!
    expect(after.tags).toEqual(['Soupe', 'hiver'])
    expect(after.hash).toBe(before.hash)
    expect(after.updatedAt).toBe(before.updatedAt)
    expect(matchesTag(after.tags, 'SOU')).toBe(true)
    expect(matchesTag(after.tags, 'été')).toBe(false)
    expect(matchesTag(after.tags, '')).toBe(true)
  })

  it('transforme les anciens dossiers en mots-clés', async () => {
    const name = 'mr-chef-migration-test'
    const old = new Dexie(name)
    old.version(2).stores({ recipes: 'id, updatedAt, remoteId, pending, title', media: 'id', kv: 'key', secrets: 'id', keys: 'id', folders: 'id, name' })
    await old.table('folders').add({ id: 'f1', name: 'Soupes', createdAt: 1 })
    await old.table('recipes').bulkAdd([
      { id: 'a', title: 'A', updatedAt: 1, folderId: 'f1', tags: ['soupes'] },
      { id: 'b', title: 'B', updatedAt: 2, folderId: 'f1' },
      { id: 'c', title: 'C', updatedAt: 3, folderId: null },
    ])
    old.close()
    const upgraded = new MrChefDb(name)
    await upgraded.open()
    const rows = await upgraded.recipes.toArray()
    expect(rows.find((r) => r.id === 'a')?.tags).toEqual(['soupes'])
    expect(rows.find((r) => r.id === 'b')?.tags).toEqual(['Soupes'])
    expect(rows.find((r) => r.id === 'c')?.tags).toBeUndefined()
    expect(rows.every((r) => !('folderId' in r))).toBe(true)
    expect(upgraded.tables.map((t) => t.name)).not.toContain('folders')
    await upgraded.delete()
  })
})
