import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { generateRecipe, PROVIDERS } from '../lib/ai'
import { errorMessage } from '../lib/mc'
import { createRecipeRecord } from '../lib/recipes'
import { useSettings } from '../lib/settings'
import { useOnline } from '../components/Banners'

const PLACEHOLDER = 'Décrivez vos envies, une idée de plat ou les ingrédients que vous avez sous la main…'

export function Home() {
  const settings = useSettings()
  const navigate = useNavigate()
  const online = useOnline()
  const [wish, setWish] = useState('')
  const [servings, setServings] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  if (!settings) return null
  const portions = servings ?? settings.defaultServings
  const provider = settings.activeProvider ? PROVIDERS[settings.activeProvider] : null
  const model = settings.activeProvider ? (settings.models[settings.activeProvider] ?? provider?.defaultModels[0]?.label) : null

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!wish.trim()) return
    setBusy(true)
    setError(null)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const res = await generateRecipe(wish.trim(), portions, { signal: ctrl.signal })
      // Enregistrement automatique dès réception, avant tout affichage.
      const id = await createRecipeRecord({
        recipe: res.recipe,
        robotId: settings!.robotId,
        origin: { provider: res.provider, model: res.model, prompt: wish.trim() },
      })
      navigate(`/recette/${id}`, { state: { fixes: res.fixes, fresh: true } })
    } catch (err) {
      if (!ctrl.signal.aborted) setError(errorMessage(err))
    } finally {
      setBusy(false)
      abort.current = null
    }
  }

  return (
    <main className="main home">
      <Logo size={96} className="logo" />
      <h1>Mr Chef</h1>
      {busy ? (
        <div className="loading" role="status" aria-live="polite">
          <div className="spinner" aria-hidden />
          <p>
            <strong>Le chef réfléchit à votre recette…</strong>
            <br />
            <span className="muted small">
              {provider?.label} · {model}. Cela prend généralement 10 à 40 secondes.
            </span>
          </p>
          <button type="button" className="btn" onClick={() => abort.current?.abort()}>
            Annuler
          </button>
        </div>
      ) : (
        <form onSubmit={generate} className="stack">
          <label className="field">
            <span className="sr-only">Votre envie</span>
            <textarea
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              placeholder={PLACEHOLDER}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void generate(e)
              }}
            />
          </label>
          <div className="row">
            <label className="row grow" style={{ gap: 8 }}>
              <span>Portions</span>
              <input
                type="number"
                min={1}
                max={20}
                value={portions}
                onChange={(e) => setServings(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                style={{ width: 80 }}
              />
            </label>
            <span className="muted small">{provider ? `${provider.label}` : 'Aucune IA configurée'}</span>
          </div>
          {!online && <p className="notice warn">La génération nécessite une connexion Internet.</p>}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn primary lg block" disabled={!wish.trim() || !online || !provider}>
            <Icon name="sparkle" /> Générer la recette
          </button>
        </form>
      )}
      <nav className="home-links" aria-label="Navigation">
        <Link to="/recettes" className="btn">
          <Icon name="book" /> Mes recettes
        </Link>
        <Link to="/parametres" className="btn">
          <Icon name="settings" /> Paramètres
        </Link>
        <Link to="/aide" className="btn">
          <Icon name="help" /> Aide
        </Link>
      </nav>
    </main>
  )
}
