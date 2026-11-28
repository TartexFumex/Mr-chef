import { beforeEach, describe, expect, it } from 'vitest'
import { emptyRecipe } from '@mr-chef/recipe-schema'
import { db } from '../src/db/db'
import { createFolder, deleteFolder, moveRecipe, renameFolder } from '../src/lib/folders'
import { createRecipeRecord } from '../src/lib/recipes'
import { getSettings, setSettings } from '../src/lib/settings'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('dossiers', () => {
  it('range une recette sans toucher à son contenu ni à son état de synchro', async () => {
    const id = await createRecipeRecord({ recipe: emptyRecipe(), robotId: 'connect', origin: { provider: 'manual', model: null, prompt: null } })
    const before = (await db.recipes.get(id))!
    const folder = (await createFolder('  Desserts  '))!
    expect((await db.folders.get(folder))?.name).toBe('Desserts')
    await moveRecipe(id, folder)
    const after = (await db.recipes.get(id))!
    expect(after.folderId).toBe(folder)
    expect(after.hash).toBe(before.hash)
    expect(after.updatedAt).toBe(before.updatedAt)
  })

  it('refuse un nom vide, renomme, et libère les recettes à la suppression', async () => {
    expect(await createFolder('   ')).toBeNull()
    const id = await createRecipeRecord({ recipe: emptyRecipe(), robotId: 'connect', origin: { provider: 'manual', model: null, prompt: null } })
    const folder = (await createFolder('Soupes'))!
    await renameFolder(folder, 'Soupes d’hiver')
    expect((await db.folders.get(folder))?.name).toBe('Soupes d’hiver')
    await moveRecipe(id, folder)
    await setSettings({ libraryFolder: folder })
    await deleteFolder(folder)
    expect(await db.folders.count()).toBe(0)
    expect((await db.recipes.get(id))?.folderId).toBeNull()
    expect((await getSettings()).libraryFolder).toBeNull()
  })
})
