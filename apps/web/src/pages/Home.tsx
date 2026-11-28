import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getRobot } from '@mr-chef/recipe-schema'
import { ChefSays, pick } from '../components/Chef'
import { Icon } from '../components/Icon'
import { InstallPrompt } from '../components/InstallPrompt'
import { NumberInput } from '../components/NumberInput'
import { StatusBadge } from '../components/StatusBadge'
import { useOnline } from '../components/Banners'
import { generateRecipe, PROVIDERS } from '../lib/ai'
import { errorMessage } from '../lib/mc'
import { createRecipeRecord, useRecipes } from '../lib/recipes'
import { useSettings } from '../lib/settings'
import { useLang, useT } from '../i18n'

/** Accueil en conversation : Gaston pose la question, on répond dans le champ en bas. */
export function Home() {
  const settings = useSettings()
  const recipes = useRecipes()
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const online = useOnline()
  const [wish, setWish] = useState('')
  const [servings, setServings] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hello] = useState(() => pick(t.chef.hello))
  const [line, setLine] = useState(0)
  const abort = useRef<AbortController | null>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  // Pendant la génération, Gaston enchaîne ses répliques.
  useEffect(() => {
    if (!busy) return
    const id = window.setInterval(() => setLine((n) => n + 1), 3000)
    return () => window.clearInterval(id)
  }, [busy])

  const recent = useMemo(() => [...(recipes ?? [])].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3), [recipes])

  if (!settings) return null
  const portions = servings ?? settings.defaultServings
  const provider = settings.activeProvider ? PROVIDERS[settings.activeProvider] : null
  const model = settings.activeProvider ? (settings.models[settings.activeProvider] ?? provider?.defaultModels[0]?.label) : null
  const robot = getRobot(settings.robotId).name.replace(/^Monsieur Cuisine\s+/, '')

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!wish.trim()) return
    setLine(0)
    setBusy(true)
    setError(null)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const res = await generateRecipe(wish.trim(), portions, { signal: ctrl.signal, lang })
      // Enregistrement automatique dès réception, avant tout affichage.
      const id = await createRecipeRecord({
        recipe: res.recipe,
        robotId: settings!.robotId,
        origin: { provider: res.provider, model: res.model, prompt: wish.trim() },
      })
      navigate(`/recette/${id}/modifier`, { state: { fixes: res.fixes, fresh: true } })
    } catch (err) {
      if (!ctrl.signal.aborted) setError(errorMessage(err))
    } finally {
      setBusy(false)
      abort.current = null
    }
  }

  function applyIdea(idea: string) {
    setWish(idea)
    input.current?.focus()
  }

  return (
    <main className="main home">
      <header className="home-bar">
        <h1>Mr Chef</h1>
        <Link to="/aide" className="icon-btn" aria-label={t.nav.help}>
          <Icon name="help" />
        </Link>
        <Link to="/parametres" className="icon-btn" aria-label={t.nav.settings}>
          <Icon name="settings" />
        </Link>
      </header>

      {busy ? (
        <div className="stack" role="status">
          <ChefSays live thinking>
            {t.chef.cooking[line % t.chef.cooking.length]}
          </ChefSays>
          <div className="home-wait">
            <span className="muted small grow">{t.home.duration(provider?.label ?? '', model ?? '')}</span>
            <button type="button" className="btn" onClick={() => abort.current?.abort()}>
              {t.common.cancel}
            </button>
          </div>
        </div>
      ) : (
        <>
          {error ? (
            <ChefSays live>
              <strong>{t.chef.error}</strong> <span role="alert">{error}</span>
            </ChefSays>
          ) : (
            <ChefSays>{hello}</ChefSays>
          )}
          <div className="ideas" role="group" aria-label={t.home.ideasLabel}>
            {t.home.ideas.map((idea) => (
              <button key={idea} type="button" className="idea" onClick={() => applyIdea(idea)}>
                {idea}
              </button>
            ))}
          </div>
          {recent.length > 0 && (
            <section className="recent" aria-labelledby="recent-title">
              <h2 id="recent-title" className="label">
                {t.home.recent}
              </h2>
              <ul>
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link to={`/recette/${r.id}`}>{r.title || t.library.untitled}</Link>
                    <StatusBadge rec={r} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <div className="grow" />

      {!busy && (
        <form onSubmit={generate} className="composer">
          <label className="sr-only" htmlFor="wish">
            {t.home.wishLabel}
          </label>
          <textarea
            id="wish"
            ref={input}
            rows={2}
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            placeholder={t.home.placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void generate(e)
            }}
          />
          <div className="composer-row">
            <Link to="/parametres" className="pill on">
              {robot}
            </Link>
            <label className="pill">
              <NumberInput min={1} max={20} value={portions} onChange={setServings} aria-label={t.home.servings} />
              <span aria-hidden>{t.home.servingsUnit}</span>
            </label>
            <span className="pill">{provider ? provider.label : t.home.noAi}</span>
            <button
              type="submit"
              className="send"
              aria-label={t.home.generate}
              title={t.home.generate}
              disabled={!wish.trim() || !online || !provider}
            >
              <Icon name="sparkle" />
            </button>
          </div>
          {!online && <p className="notice warn small">{t.home.offline}</p>}
        </form>
      )}

      <nav className="home-links" aria-label={t.home.nav}>
        <Link to="/recettes">{t.home.allRecipes(recipes?.length ?? 0)}</Link>
      </nav>
      {!busy && <InstallPrompt />}
    </main>
  )
}
