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
import { useT } from '../i18n'

type Filter = 'all' | 'local' | 'published' | 'desynced'
const FILTERS: Filter[] = ['all', 'local', 'published', 'desynced']

export function Library() {
  const recipes = useRecipes()
  const t = useT()
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
      const rep = t.library.report
      const parts = [
        r.imported && rep.imported(r.imported),
        r.updated && rep.updated(r.updated),
        r.conflicts && rep.conflicts(r.conflicts),
        r.detached && rep.detached(r.detached),
      ].filter(Boolean)
      toast(parts.length ? rep.done(parts.join(', ')) : rep.upToDate)
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }

  async function createBlank() {
    const id = await createRecipeRecord({
      recipe: emptyRecipe({ title: t.editor.newRecipe, group: t.editor.ingredientsGroup }),
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
      <TopBar title={t.library.title}>
        <button
          type="button"
          className="btn"
          disabled={refreshing || !online || !hasRelay(settings)}
          onClick={() => void refresh()}
          title={settings?.lastRefreshAt ? t.library.lastSync(relativeTime(settings.lastRefreshAt)) : undefined}
        >
          <Icon name="refresh" /> {refreshing ? t.library.syncing : t.library.sync}
        </button>
      </TopBar>
      <main className="main stack">
        <input type="search" placeholder={t.library.search} aria-label={t.library.searchLabel} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="chips" role="group" aria-label={t.library.filter}>
          {FILTERS.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {t.library[f]}
            </button>
          ))}
        </div>
        {recipes && recipes.length === 0 ? (
          <div className="card stack" style={{ textAlign: 'center' }}>
            <p>{t.library.empty}</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link className="btn primary" to="/">
                <Icon name="sparkle" /> {t.library.generateOne}
              </Link>
              {hasRelay(settings) && (
                <button type="button" className="btn" onClick={() => void refresh()} disabled={!online}>
                  {t.library.importMc}
                </button>
              )}
            </div>
          </div>
        ) : (
          <ul className="list">
            {shown.map((r) => (
              <RecipeItem key={r.id} rec={r} />
            ))}
            {recipes && shown.length === 0 && <li className="muted">{t.library.noMatch}</li>}
          </ul>
        )}
        <button type="button" className="btn block" onClick={() => void createBlank()}>
          <Icon name="plus" /> {t.library.blank}
        </button>
      </main>
    </>
  )
}

function RecipeItem({ rec }: { rec: RecipeRecord }) {
  const url = useImageUrl(rec.imageId)
  const t = useT()
  return (
    <li className="recipe-item">
      <Link to={`/recette/${rec.id}`} className="row grow" style={{ flexWrap: 'nowrap', gap: 12 }}>
        {url ? <img className="thumb" src={url} alt="" /> : <span className="thumb" aria-hidden><Icon name="book" /></span>}
        <span className="grow">
          <h3>{rec.title || t.library.untitled}</h3>
          <span className="row small muted" style={{ gap: 8 }}>
            <StatusBadge rec={rec} />
            <span>{formatMinutes(rec.recipe.readyInTime)}</span>
            <span>{t.library.modified(relativeTime(rec.updatedAt))}</span>
          </span>
        </span>
      </Link>
    </li>
  )
}
