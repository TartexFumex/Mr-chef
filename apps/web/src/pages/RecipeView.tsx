import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CATEGORIES, COMPLEXITIES, NUTRIENTS, getRobot, iconOf, type Recipe, type RobotId } from '@mr-chef/recipe-schema'
import { useOnline } from '../components/Banners'
import { ChefSays } from '../components/Chef'
import { Icon } from '../components/Icon'
import { IconPicker } from '../components/IconPicker'
import { RecipeIconArt } from '../components/RecipeIcon'
import { StatusBadge } from '../components/StatusBadge'
import { toast, toastError } from '../components/toast'
import { TopBar } from '../components/TopBar'
import type { RecipeRecord } from '../db/db'
import { categoryLabel, unitLabel, useLang, useT } from '../i18n'
import { PROVIDERS, reviseRecipe, type GenerationResult } from '../lib/ai'
import { formatMinutes, modeSummary } from '../lib/format'
import { errorMessage } from '../lib/mc'
import { saveRecipe, useImageUrl, useRecipe } from '../lib/recipes'
import { useSettings } from '../lib/settings'

/** Lecture seule d'une recette : rien ne peut être modifié par mégarde, le bouton Modifier ouvre l'éditeur. */
export function RecipeView() {
  const { id } = useParams()
  const rec = useRecipe(id)
  const t = useT()
  if (rec === undefined) return null
  if (rec === null) {
    return (
      <>
        <TopBar title={t.editor.notFound} back="/recettes" />
        <main className="main">
          <p>{t.editor.notFoundText}</p>
        </main>
      </>
    )
  }
  return <RecipeViewLoaded rec={rec} />
}

function RecipeViewLoaded({ rec }: { rec: RecipeRecord }) {
  const t = useT()
  const lang = useLang()
  const settings = useSettings()
  const online = useOnline()
  const imageUrl = useImageUrl(rec.imageId)
  const navigate = useNavigate()
  const editUrl = `/recette/${rec.id}/modifier`

  // Retouche par IA : formulaire, génération en cours, puis choix entre les deux versions.
  const [askOpen, setAskOpen] = useState(false)
  const [request, setRequest] = useState('')
  const [busy, setBusy] = useState(false)
  const [proposal, setProposal] = useState<GenerationResult | null>(null)
  const [showing, setShowing] = useState<'new' | 'old'>('new')
  const [line, setLine] = useState(0)
  const [picking, setPicking] = useState(false)
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => {
    if (!busy) return
    const id = window.setInterval(() => setLine((n) => n + 1), 3000)
    return () => window.clearInterval(id)
  }, [busy])

  const provider = settings?.activeProvider ? PROVIDERS[settings.activeProvider] : null
  const canRevise = online && !!provider && !busy && !proposal
  const shown = proposal && showing === 'new' ? proposal.recipe : rec.recipe

  async function revise(e?: React.FormEvent) {
    e?.preventDefault()
    if (!request.trim() || !canRevise) return
    setAskOpen(false)
    setLine(0)
    setBusy(true)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const res = await reviseRecipe(rec.recipe, request.trim(), { signal: ctrl.signal, lang, robotId: rec.robotId })
      if (ctrl.signal.aborted) return
      setProposal(res)
      setShowing('new')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (!ctrl.signal.aborted) {
        toastError(errorMessage(err))
        setAskOpen(true)
      }
    } finally {
      if (abort.current === ctrl) abort.current = null
      setBusy(false)
    }
  }

  async function accept() {
    if (!proposal) return
    await saveRecipe(rec.id, { recipe: proposal.recipe })
    setProposal(null)
    setRequest('')
    toast(t.revise.replaced)
  }
  function reject() {
    setProposal(null)
    toast(t.revise.kept)
  }

  return (
    <>
      <TopBar title={shown.title || t.editor.untitled} back="/recettes">
        <StatusBadge rec={rec} />
      </TopBar>
      <main className={proposal ? 'main recipe-view with-bar' : 'main recipe-view'}>
        {busy && (
          <div className="revise-pending" role="status" aria-live="polite">
            <div className="revise-wait">
              <ChefSays size={40} thinking>
                {t.chef.cooking[line % t.chef.cooking.length]}
              </ChefSays>
              <button type="button" className="revise-cancel" aria-label={t.revise.cancel} title={t.revise.cancel} onClick={() => abort.current?.abort()}>
                <Icon name="close" />
              </button>
            </div>
          </div>
        )}

        {proposal && (
          <>
            <div className="revise-bar" role="region" aria-label={t.revise.proposalTitle}>
              <ChefSays size={36}>
                <strong>{showing === 'new' ? `${t.revise.proposalTitle}.` : t.revise.showingOld}</strong> {t.revise.keepQuestion}
              </ChefSays>
              <div className="revise-actions">
                <button
                  type="button"
                  className="btn icon-only"
                  aria-pressed={showing === 'old'}
                  aria-label={showing === 'new' ? t.revise.viewOld : t.revise.viewNew}
                  title={showing === 'new' ? t.revise.viewOld : t.revise.viewNew}
                  onClick={() => setShowing(showing === 'new' ? 'old' : 'new')}
                >
                  <Icon name="eye" />
                </button>
                <button type="button" className="btn" aria-label={t.revise.keepOld} onClick={reject}>
                  <Icon name="close" /> {t.revise.no}
                </button>
                <button type="button" className="btn primary" aria-label={t.revise.replace} onClick={() => void accept()}>
                  <Icon name="check" /> {t.revise.yes}
                </button>
              </div>
            </div>
          </>
        )}

        {rec.sync.conflict && (
          <div className="notice warn row" role="alert">
            <span className="grow">{t.view.conflict}</span>
            <Link to={editUrl} className="btn">
              {t.view.resolve}
            </Link>
          </div>
        )}

        {imageUrl ? (
          <div className="photo" style={{ marginTop: 12, borderStyle: 'solid' }}>
            <img src={imageUrl} alt="" />
          </div>
        ) : (
          <div className="view-cover">
            <button type="button" title={t.editor.pickIcon} aria-label={t.editor.pickIcon} disabled={!!proposal} onClick={() => setPicking(true)}>
              <RecipeIconArt recipe={shown} size={96} />
            </button>
            <IconPicker
              open={picking}
              current={iconOf(rec.recipe).id}
              onClose={() => setPicking(false)}
              onPick={(icon) => {
                setPicking(false)
                void saveRecipe(rec.id, { recipe: { ...rec.recipe, icon } })
              }}
            />
          </div>
        )}

        <RecipeBody
          recipe={shown}
          robotId={rec.robotId}
          actions={
            <>
              <button
                type="button"
                className="btn"
                aria-expanded={askOpen}
                disabled={!canRevise}
                title={!online ? t.revise.offline : !provider ? t.home.noAi : undefined}
                onClick={() => setAskOpen((o) => !o)}
              >
                <Icon name="sparkle" /> {t.revise.open}
              </button>
              <Link to={editUrl} className="btn primary" aria-disabled={!!proposal} onClick={(e) => proposal && e.preventDefault()}>
                <Icon name="edit" /> {t.view.edit}
              </Link>
            </>
          }
          below={
            askOpen && canRevise ? (
              <form className="revise-form stack" onSubmit={(e) => void revise(e)}>
                <ChefSays size={44}>{t.revise.label}</ChefSays>
                <div className="ideas" role="group" aria-label={t.home.ideasLabel}>
                  {t.revise.ideas.map((idea) => (
                    <button key={idea} type="button" className="idea" onClick={() => setRequest(idea)}>
                      {idea}
                    </button>
                  ))}
                </div>
                <div className="composer">
                  <textarea
                    autoFocus
                    rows={2}
                    aria-label={t.revise.label}
                    value={request}
                    onChange={(e) => setRequest(e.target.value)}
                    placeholder={t.revise.placeholder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void revise()
                    }}
                  />
                  <div className="composer-row">
                    <span className="pill">{provider?.label}</span>
                    <button type="button" className="btn ghost" style={{ marginLeft: 'auto' }} onClick={() => setAskOpen(false)}>
                      {t.common.cancel}
                    </button>
                    <button type="submit" className="send" style={{ marginLeft: 0 }} aria-label={t.revise.submit} title={t.revise.submit} disabled={!request.trim()}>
                      <Icon name="sparkle" />
                    </button>
                  </div>
                </div>
              </form>
            ) : null
          }
        />

        {(rec.tags ?? []).length > 0 && (
          <section className="section">
            <h2>{t.tags.label}</h2>
            <div className="chips">
              {rec.tags!.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="chip"
                  title={t.tags.searchFor(tag)}
                  onClick={() => navigate('/recettes', { state: { tag } })}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
        )}

        {rec.origin.prompt && (
          <p className="muted small">{t.editor.generatedBy(rec.origin.model ?? '', rec.origin.prompt)}</p>
        )}
      </main>
    </>
  )
}

/** Contenu d'une recette (titre, infos, ingrédients, étapes…), affiché pour la version actuelle ou la version proposée. */
function RecipeBody({
  recipe: r,
  robotId,
  actions,
  below,
}: {
  recipe: Recipe
  robotId: RobotId
  actions: React.ReactNode
  below: React.ReactNode
}) {
  const t = useT()
  const robot = getRobot(robotId)
  const complexity = COMPLEXITIES.find((c) => c.key === r.complexity)
  const categories = CATEGORIES.filter((c) => r.categoryIds.includes(c.id))
  return (
    <>
      <h2 className="view-title">{r.title || t.editor.untitled}</h2>
      {r.description && <p className="view-desc">{r.description}</p>}

      <ul className="view-meta">
        <li>{t.view.servings(r.servings.amount, unitLabel(r.servings.unit, t))}</li>
        {r.preparationTime > 0 && <li>{t.view.prep(formatMinutes(r.preparationTime))}</li>}
        {r.readyInTime > 0 && <li>{t.view.ready(formatMinutes(r.readyInTime))}</li>}
        {complexity && <li>{t.complexity[complexity.key] ?? complexity.label}</li>}
        <li>{robot.name}</li>
      </ul>
      {categories.length > 0 && (
        <div className="chips" style={{ marginTop: 8 }}>
          {categories.map((c) => (
            <span key={c.id} className="tag">
              {categoryLabel(c.id, c.label, t)}
            </span>
          ))}
        </div>
      )}

      <div className="view-actions">
        {actions}
      </div>
      {below}

      <section className="section">
        <h2>{t.view.ingredients}</h2>
        {r.ingredientGroups.every((g) => g.ingredients.length === 0) ? (
          <p className="muted">{t.view.noIngredients}</p>
        ) : (
          r.ingredientGroups.map((g) => (
            <div key={g.key} className="card" style={{ marginBottom: 10 }}>
              {r.ingredientGroups.length > 1 && <h3 style={{ marginTop: 0 }}>{g.name}</h3>}
              <ul className="view-ingredients">
                {g.ingredients.map((ing) => (
                  <li key={ing.key}>
                    <span className="mono qty">
                      {ing.amount} {unitLabel(ing.unit, t)}
                    </span>
                    <span>{ing.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="section">
        <h2>{t.view.steps}</h2>
        {r.steps.length === 0 ? (
          <p className="muted">{t.view.noSteps}</p>
        ) : (
          <ol className="view-steps">
            {r.steps.map((s, i) => (
              <li key={s.key} className="step">
                <div className="step-head">
                  <span className="step-num">{i + 1}</span>
                  <strong className="grow">{s.title}</strong>
                </div>
                {s.description && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-line' }}>{s.description}</p>}
                {s.mode && <span className="mode-pill static">{modeSummary(s.mode)}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {r.hintsAndTips && (
        <section className="section">
          <h2>{t.view.tips}</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{r.hintsAndTips}</p>
        </section>
      )}

      {NUTRIENTS.some((n) => r.nutrients[n.key] > 0) && (
        <section className="section">
          <h2>{t.view.nutrition}</h2>
          <div className="grid4">
            {NUTRIENTS.map((n) => (
              <div key={n.key} className="card" style={{ padding: 10 }}>
                <div className="muted small">{t.nutrients[n.key] ?? n.label}</div>
                <strong className="mono">
                  {r.nutrients[n.key]} {n.unit}
                </strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
