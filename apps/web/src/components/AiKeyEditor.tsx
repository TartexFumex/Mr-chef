import { useEffect, useState } from 'react'
import type { ProviderId } from '../db/db'
import { AiError, PROVIDERS, type ModelInfo } from '../lib/ai'
import { errorMessage } from '../lib/mc'
import { getSettings, setSettings, useSettings } from '../lib/settings'
import { deleteSecret, getSecret, maskSecret, setSecret } from '../lib/vault'
import { toast } from './toast'

/** Ajout, modification ou suppression de la clé d'un fournisseur et choix de son modèle. */
export function AiKeyEditor({ provider: id, onChange }: { provider: ProviderId; onChange?: () => void }) {
  const provider = PROVIDERS[id]
  const settings = useSettings()
  const [stored, setStored] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [models, setModels] = useState<ModelInfo[]>(provider.defaultModels)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getSecret(`ai:${id}`).then((k) => {
      setStored(k)
      setEditing(!k)
    })
  }, [id])

  useEffect(() => {
    if (!stored) return
    const ctrl = new AbortController()
    provider
      .listModels(stored, ctrl.signal)
      .then((list) => list.length && setModels(list))
      .catch(() => undefined)
    return () => ctrl.abort()
  }, [stored, provider])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const key = value.trim()
    if (!key) return
    setBusy(true)
    setError(null)
    try {
      let list: ModelInfo[] = []
      let unverified = false
      try {
        list = await provider.listModels(key)
      } catch (err) {
        // Une clé refusée bloque ; un souci réseau ou CORS n'empêche pas l'enregistrement.
        if (err instanceof AiError && err.kind === 'bad_key') throw err
        unverified = true
      }
      await setSecret(`ai:${id}`, key)
      if (list.length) setModels(list)
      const s = await getSettings()
      if (!s.activeProvider) await setSettings({ activeProvider: id })
      setStored(key)
      setValue('')
      setEditing(false)
      toast(unverified ? `Clé ${provider.label} enregistrée sans vérification (fournisseur injoignable).` : `Clé ${provider.label} enregistrée.`)
      onChange?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    await deleteSecret(`ai:${id}`)
    setStored(null)
    setEditing(true)
    const s = await getSettings()
    if (s.activeProvider === id) {
      let next: ProviderId | null = null
      for (const p of Object.keys(PROVIDERS) as ProviderId[]) {
        if (p !== id && (await getSecret(`ai:${p}`))) next = p
      }
      await setSettings({ activeProvider: next })
    }
    toast(`Clé ${provider.label} supprimée.`)
    onChange?.()
  }

  const model = settings?.models[id] ?? provider.defaultModels[0]?.id ?? ''
  const options = models.some((m) => m.id === model) ? models : [{ id: model, label: model }, ...models]

  return (
    <div className="stack">
      {stored && !editing ? (
        <div className="row">
          <span className="mono grow">{maskSecret(stored)}</span>
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            Modifier
          </button>
          <button type="button" className="btn ghost" onClick={() => void remove()}>
            Supprimer
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={save}>
          <label className="field">
            <span>
              Clé API {provider.label}{' '}
              <a className="hint" href={provider.keyUrl} target="_blank" rel="noreferrer">
                (obtenir une clé)
              </a>
            </span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={provider.keyPlaceholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <div className="row">
            <button type="submit" className="btn primary" disabled={busy || !value.trim()}>
              {busy ? 'Vérification…' : 'Vérifier et enregistrer'}
            </button>
            {stored && (
              <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
                Annuler
              </button>
            )}
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
      {stored && (
        <label className="field">
          <span>Modèle</span>
          <select
            value={model}
            onChange={(e) => void setSettings({ models: { ...settings?.models, [id]: e.target.value } })}
          >
            {options.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
