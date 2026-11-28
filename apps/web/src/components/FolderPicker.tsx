import { useState } from 'react'
import { useT } from '../i18n'
import { createFolder, moveRecipe, useFolders } from '../lib/folders'
import { Dialog } from './Dialog'
import { toast } from './toast'

const NEW = '__new__'

/** Choix du dossier d'une recette, avec création d'un dossier à la volée. */
export function FolderPicker({ recipeId, folderId }: { recipeId: string; folderId: string | null }) {
  const t = useT()
  const folders = useFolders()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  if (!folders) return null
  const current = folders.some((f) => f.id === folderId) ? folderId : null

  async function move(id: string | null) {
    await moveRecipe(recipeId, id)
    const folder = folders!.find((f) => f.id === id)
    toast(folder ? t.folders.moved(folder.name) : t.folders.removed)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const id = await createFolder(name)
    if (!id) return
    await moveRecipe(recipeId, id)
    toast(t.folders.moved(name.trim()))
    setName('')
    setCreating(false)
  }

  return (
    <>
      <label className="field">
        <span>{t.view.folder}</span>
        <select
          value={current ?? ''}
          onChange={(e) => {
            if (e.target.value === NEW) setCreating(true)
            else void move(e.target.value || null)
          }}
        >
          <option value="">{t.folders.none}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
          <option value={NEW}>{t.folders.newFolder}</option>
        </select>
      </label>
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={t.folders.newFolder.replace('…', '')}
        actions={
          <>
            <button type="button" className="btn ghost" onClick={() => setCreating(false)}>
              {t.common.cancel}
            </button>
            <button type="submit" form="new-folder" className="btn primary" disabled={!name.trim()}>
              {t.folders.create}
            </button>
          </>
        }
      >
        <form id="new-folder" onSubmit={create}>
          <label className="field">
            <span>{t.folders.name}</span>
            <input type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </label>
        </form>
      </Dialog>
    </>
  )
}
