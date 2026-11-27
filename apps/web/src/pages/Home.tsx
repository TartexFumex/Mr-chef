import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon } from '../components/Icon'
import { InstallPrompt } from '../components/InstallPrompt'
import { Logo } from '../components/Logo'
import { generateRecipe, PROVIDERS } from '../lib/ai'
import { errorMessage } from '../lib/mc'
import { createRecipeRecord } from '../lib/recipes'
import { useSettings } from '../lib/settings'
import { useOnline } from '../components/Banners'
import { useLang, useT } from '../i18n'

export function Home() {
  const settings = useSettings()
  const t = useT()
  const lang = useLang()
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
      const res = await generateRecipe(wish.trim(), portions, { signal: ctrl.signal, lang })
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
            <strong>{t.home.thinking}</strong>
            <br />
            <span className="muted small">
              {t.home.duration(provider?.label ?? '', model ?? '')}
            </span>
          </p>
          <button type="button" className="btn" onClick={() => abort.current?.abort()}>
            {t.common.cancel}
          </button>
        </div>
      ) : (
        <form onSubmit={generate} className="stack">
          <label className="field">
            <span className="sr-only">{t.home.wishLabel}</span>
            <textarea
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              placeholder={t.home.placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void generate(e)
              }}
            />
          </label>
          <div className="row">
            <label className="row grow" style={{ gap: 8 }}>
              <span>{t.home.servings}</span>
              <input
                type="number"
                min={1}
                max={20}
                value={portions}
                onChange={(e) => setServings(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                style={{ width: 80 }}
              />
            </label>
            <span className="muted small">{provider ? provider.label : t.home.noAi}</span>
          </div>
          {!online && <p className="notice warn">{t.home.offline}</p>}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn primary lg block" disabled={!wish.trim() || !online || !provider}>
            <Icon name="sparkle" /> {t.home.generate}
          </button>
        </form>
      )}
      <nav className="home-links" aria-label={t.home.nav}>
        <Link to="/recettes" className="btn">
          <Icon name="book" /> {t.nav.recipes}
        </Link>
        <Link to="/parametres" className="btn">
          <Icon name="settings" /> {t.nav.settings}
        </Link>
        <Link to="/aide" className="btn">
          <Icon name="help" /> {t.nav.help}
        </Link>
      </nav>
      {!busy && <InstallPrompt />}
    </main>
  )
}
