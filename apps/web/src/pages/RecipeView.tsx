import { Link, useNavigate, useParams } from 'react-router'
import { CATEGORIES, COMPLEXITIES, NUTRIENTS, getRobot } from '@mr-chef/recipe-schema'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { TopBar } from '../components/TopBar'
import type { RecipeRecord } from '../db/db'
import { categoryLabel, unitLabel, useT } from '../i18n'
import { formatMinutes, modeSummary } from '../lib/format'
import { useImageUrl, useRecipe } from '../lib/recipes'

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
  const imageUrl = useImageUrl(rec.imageId)
  const navigate = useNavigate()
  const r = rec.recipe
  const robot = getRobot(rec.robotId)
  const complexity = COMPLEXITIES.find((c) => c.key === r.complexity)
  const categories = CATEGORIES.filter((c) => r.categoryIds.includes(c.id))
  const editUrl = `/recette/${rec.id}/modifier`

  return (
    <>
      <TopBar title={r.title || t.editor.untitled} back="/recettes">
        <StatusBadge rec={rec} />
      </TopBar>
      <main className="main recipe-view">
        {rec.sync.conflict && (
          <div className="notice warn row" role="alert">
            <span className="grow">{t.view.conflict}</span>
            <Link to={editUrl} className="btn">
              {t.view.resolve}
            </Link>
          </div>
        )}

        {imageUrl && (
          <div className="photo" style={{ marginTop: 12, borderStyle: 'solid' }}>
            <img src={imageUrl} alt="" />
          </div>
        )}

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

        <div className="row end" style={{ marginTop: 16 }}>
          <Link to={editUrl} className="btn primary">
            <Icon name="edit" /> {t.view.edit}
          </Link>
        </div>

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
