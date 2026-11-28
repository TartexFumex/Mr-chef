import { useLiveQuery } from 'dexie-react-hooks'
import { db, type FolderRecord } from '../db/db'
import { newId } from './recipes'
import { getSettings, setSettings } from './settings'

/** Valeur de filtre « recettes sans dossier ». */
export const NO_FOLDER = '__none__'

export function useFolders(): FolderRecord[] | undefined {
  return useLiveQuery(async () => {
    const list = await db.folders.toArray()
    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [])
}

export async function createFolder(name: string): Promise<string | null> {
  const clean = name.trim()
  if (!clean) return null
  const id = newId()
  await db.folders.add({ id, name: clean, createdAt: Date.now() })
  return id
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const clean = name.trim()
  if (clean) await db.folders.update(id, { name: clean })
}

/** Supprime le dossier ; ses recettes restent, sans dossier. */
export async function deleteFolder(id: string): Promise<void> {
  await db.transaction('rw', db.folders, db.recipes, async () => {
    await db.recipes.filter((r) => r.folderId === id).modify({ folderId: null })
    await db.folders.delete(id)
  })
  if ((await getSettings()).libraryFolder === id) await setSettings({ libraryFolder: null })
}

/** Range une recette ; ne touche ni son contenu ni son état de synchronisation. */
export async function moveRecipe(recipeId: string, folderId: string | null): Promise<void> {
  await db.recipes.update(recipeId, { folderId })
}
