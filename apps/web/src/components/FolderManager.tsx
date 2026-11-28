import { useState } from 'react'
import type { FolderRecord } from '../db/db'
import { useT } from '../i18n'
import { createFolder, deleteFolder, renameFolder } from '../lib/folders'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { toast } from './toast'

/** Création, renommage et suppression des dossiers. */
export function FolderManager({
  open,
  onClose,
  folders,
  counts,
}: {
  open: boolean
  onClose: () => void
  folders: FolderRecord[]
  counts: Map<string, number>
}) {
  const t = useT()
  const [name, setName] = useState('')
  const [removing, setRemoving] = useState<FolderRecord | null>(null)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!(await createFolder(clean))) return
    toast(t.folders.created(clean))
    setName('')
  }

  return (
    <>
      <Dialog
        open={open && !removing}
        onClose={onClose}
        title={t.folders.title}
        actions={
          <button type="button" className="btn primary" onClick={onClose}>
            {t.common.close}
          </button>
        }
      >
        <div className="stack">
          {folders.length === 0 && <p className="muted small">{t.folders.empty}</p>}
          {folders.map((f) => (
            <div key={f.id} className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
              <input
                type="text"
                className="grow"
                aria-label={t.folders.rename(f.name)}
                defaultValue={f.name}
                maxLength={60}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value.trim() !== f.name) void renameFolder(f.id, e.target.value)
                  else e.target.value = f.name
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                style={{ flex: 1, minWidth: 0 }}
              />
              <span className="muted small nowrap">{t.folders.count(counts.get(f.id) ?? 0)}</span>
              <button type="button" className="icon-btn" aria-label={t.folders.delete(f.name)} onClick={() => setRemoving(f)}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
          <form className="row" style={{ flexWrap: 'nowrap', gap: 8 }} onSubmit={create}>
            <input
              type="text"
              className="grow"
              placeholder={t.folders.name}
              aria-label={t.folders.name}
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button type="submit" className="btn" disabled={!name.trim()}>
              <Icon name="plus" /> {t.folders.create}
            </button>
          </form>
        </div>
      </Dialog>
      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={t.folders.deleteTitle}
        actions={
          <>
            <button type="button" className="btn ghost" onClick={() => setRemoving(null)}>
              {t.common.cancel}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (removing) void deleteFolder(removing.id)
                setRemoving(null)
              }}
            >
              {t.common.delete}
            </button>
          </>
        }
      >
        <p>{removing && t.folders.deleteText(removing.name)}</p>
      </Dialog>
    </>
  )
}
