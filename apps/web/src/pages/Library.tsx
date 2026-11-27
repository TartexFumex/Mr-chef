import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { emptyRecipe } from '@mr-chef/recipe-schema'
import { useOnline } from '../components/Banners'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { toast, toastError } from '../components/toast'
import { TopBar } from '../components/TopBar'
import type { RecipeRecord } from '../db/db'
import { formatMinutes, relativeTime } from '../lib/format'
import { errorMessage, hasRelay } from '../lib/mc'
import { createRecipeRecord, syncStateOf, useImageUrl, useRecipes } from '../lib/recipes'
import { useSettings } from '../lib/settings'
import { processPendingQueue, refreshFromRemote } from '../lib/sync'

type Filter = 'all' | 'local' | 'published' | 'desynced'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'local', label: 'Locales' },
  { id: 'published', label: 'Publiées' },
  { id: 'desynced', label: 'Désynchronisées' },
]

export function Library() {
  const recipes = useRecipes()
  const settings = useSettings()
  const online = useOnline()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    try {
      await processPendingQueue()
      const r = await refreshFromRemote()
      const parts = [
        r.imported && `${r.imported} importée${r.imported > 1 ? 's' : ''}`,
        r.updated && `${r.updated} mise${r.updated > 1 ? 's' : ''} à jour`,
        r.conflicts && `${r.conflicts} en conflit`,
        r.detached && `${r.detached} retirée${r.detached > 1 ? 's' : ''} du compte`,
      ].filter(Boolean)
      toast(parts.length ? `Synchronisé : ${parts.join(', ')}.` : 'Tout est à jour.')
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }

  async function createBlank() {
    const id = await createRecipeRecord({
      recipe: emptyRecipe(),
      robotId: settings!.robotId,
      origin: { provider: 'manual', model: null, prompt: null },
    })
    navigate(`/recette/${id}`)
  }

  const q = query.trim().toLowerCase()
  const shown = (recipes ?? []).filter((r) => {
    if (q && !r.title.toLowerCase().includes(q)) return false
    return filter === 'all' || syncStateOf(r) === filter
  })

  return (
    <>
      <TopBar title="Mes recettes">
        <button
          type="button"
          className="btn"
          disabled={refreshing || !online || !hasRelay(settings)}
          onClick={() => void refresh()}
          title={settings?.lastRefreshAt ? `Dernière synchronisation ${relativeTime(settings.lastRefreshAt)}` : undefined}
        >
          <Icon name="refresh" /> {refreshing ? 'Synchro…' : 'Synchroniser'}
        </button>
      </TopBar>
      <main className="main stack">
        <input type="search" placeholder="Rechercher une recette" aria-label="Rechercher" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="chips" role="group" aria-label="Filtrer">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        {recipes && recipes.length === 0 ? (
          <div className="card stack" style={{ textAlign: 'center' }}>
            <p>Aucune recette pour l’instant.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link className="btn primary" to="/">
                <Icon name="sparkle" /> Générer une recette
              </Link>
              {hasRelay(settings) && (
                <button type="button" className="btn" onClick={() => void refresh()} disabled={!online}>
                  Importer depuis Monsieur Cuisine
                </button>
              )}
            </div>
          </div>
        ) : (
          <ul className="list">
            {shown.map((r) => (
              <RecipeItem key={r.id} rec={r} />
            ))}
            {recipes && shown.length === 0 && <li className="muted">Aucune recette ne correspond.</li>}
          </ul>
        )}
        <button type="button" className="btn block" onClick={() => void createBlank()}>
          <Icon name="plus" /> Nouvelle recette vierge
        </button>
      </main>
    </>
  )
}

function RecipeItem({ rec }: { rec: RecipeRecord }) {
  const url = useImageUrl(rec.imageId)
  return (
    <li className="recipe-item">
      <Link to={`/recette/${rec.id}`} className="row grow" style={{ flexWrap: 'nowrap', gap: 12 }}>
        {url ? <img className="thumb" src={url} alt="" /> : <span className="thumb" aria-hidden><Icon name="book" /></span>}
        <span className="grow">
          <h3>{rec.title || 'Sans titre'}</h3>
          <span className="row small muted" style={{ gap: 8 }}>
            <StatusBadge rec={rec} />
            <span>{formatMinutes(rec.recipe.readyInTime)}</span>
            <span>· modifiée {relativeTime(rec.updatedAt)}</span>
          </span>
        </span>
      </Link>
    </li>
  )
}
