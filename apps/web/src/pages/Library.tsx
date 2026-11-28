import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { emptyRecipe } from '@mr-chef/recipe-schema'
import { useOnline } from '../components/Banners'
import { ChefSays } from '../components/Chef'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { toast, toastError } from '../components/toast'
import { TopBar } from '../components/TopBar'
import type { RecipeRecord } from '../db/db'
import { formatMinutes, relativeTime } from '../lib/format'
import { errorMessage, hasRelay } from '../lib/mc'
import { createRecipeRecord, syncStateOf, useImageUrl, useRecipes } from '../lib/recipes'
import { useSettings } from '../lib/settings'
import { foldTag, matchesTag, suggestTags, useAllTags } from '../lib/tags'
import { processPendingQueue, refreshFromRemote } from '../lib/sync'
import { useT } from '../i18n'

type Filter = 'all' | 'local' | 'published' | 'desynced'
const FILTERS: Filter[] = ['all', 'local', 'published', 'desynced']
type SearchMode = 'title' | 'tag'

export function Library() {
  const recipes = useRecipes()
  const t = useT()
  const settings = useSettings()
  const online = useOnline()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const location = useLocation()
  // Un mot-clé touché dans la vue lecture arrive ici comme recherche par mot-clé.
  const fromTag = (location.state as { tag?: string } | null)?.tag
  const [mode, setMode] = useState<SearchMode>(fromTag ? 'tag' : 'title')
  const [query, setQuery] = useState(fromTag ?? '')
  const [searching, setSearching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const allTags = useAllTags()
  const tagSuggestions = mode === 'tag' && searching ? suggestTags(allTags, query, 10) : []

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
    navigate(`/recette/${id}/modifier`)
  }

  const q = foldTag(query)
  const shown = (recipes ?? []).filter((r) => {
    if (mode === 'title' && q && !foldTag(r.title).includes(q)) return false
    if (mode === 'tag' && !matchesTag(r.tags, query)) return false
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
        <div className="search-bar">
          <input
            type="search"
            className="grow"
            placeholder={mode === 'tag' ? t.tags.searchTag : t.library.search}
            aria-label={mode === 'tag' ? t.tags.searchTag : t.library.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearching(true)}
            onBlur={() => setSearching(false)}
          />
          <div className="segmented" role="group" aria-label={t.tags.searchBy}>
            {(['title', 'tag'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === 'title' ? t.tags.byTitle : t.tags.byTag}
              </button>
            ))}
          </div>
        </div>
        {tagSuggestions.length > 0 && (
          <div className="chips tag-suggestions" role="group" aria-label={t.tags.suggestions}>
            {tagSuggestions.map((tag) => (
              <button key={tag} type="button" className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery(tag)}>
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className="chips" role="group" aria-label={t.library.filter}>
          {FILTERS.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {t.library[f]}
            </button>
          ))}
        </div>
        {recipes && recipes.length === 0 ? (
          <div className="card stack">
            <ChefSays>{t.chef.empty}</ChefSays>
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
          <ul className="list library-list">
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
            {(rec.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="tag small">
                {tag}
              </span>
            ))}
          </span>
        </span>
      </Link>
    </li>
  )
}
