import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import {
  CATEGORIES,
  COMPLEXITIES,
  fitRecipeToRobot,
  getRobot,
  INGREDIENT_UNITS,
  newKey,
  NUTRIENTS,
  ROBOTS,
  SERVING_UNITS,
  type Fix,
  type Ingredient,
  type IngredientGroup,
  type Recipe,
  type RobotId,
  type Step,
} from '@mr-chef/recipe-schema'
import { useOnline } from '../components/Banners'
import { Dialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { ModeEditor } from '../components/ModeEditor'
import { SortableList } from '../components/Sortable'
import { StatusBadge } from '../components/StatusBadge'
import { toast, toastError } from '../components/toast'
import { TopBar } from '../components/TopBar'
import type { RecipeRecord } from '../db/db'
import { modeSummary, relativeTime } from '../lib/format'
import { errorMessage } from '../lib/mc'
import { deleteRecipeLocal, prepareImage, releaseImageUrl, saveRecipe, storeImage, syncStateOf, useImageUrl, useRecipe } from '../lib/recipes'
import { publishRecipe, resolveConflict, unpublishRecipe } from '../lib/sync'
import { useSettings } from '../lib/settings'
import { db } from '../db/db'

export function Editor() {
  const { id } = useParams()
  const rec = useRecipe(id)
  if (rec === undefined) return null
  if (rec === null) {
    return (
      <>
        <TopBar title="Recette introuvable" back="/recettes" />
        <main className="main">
          <p>Cette recette n’existe plus sur cet appareil.</p>
        </main>
      </>
    )
  }
  return <EditorLoaded key={rec.id} rec={rec} />
}

const SAVE_DELAY = 400

function EditorLoaded({ rec }: { rec: RecipeRecord }) {
  const location = useLocation()
  const navigate = useNavigate()
  const settings = useSettings()
  const online = useOnline()
  const [draft, setDraft] = useState<Recipe>(rec.recipe)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef(JSON.stringify(rec.recipe))
  const draftRef = useRef(rec.recipe)
  const [modeStep, setModeStep] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | 'publish' | 'unpublish'>(null)
  const [confirm, setConfirm] = useState<null | 'unpublish' | 'delete'>(null)
  const [initialFixes] = useState<Fix[]>(() => (location.state as { fixes?: Fix[] } | null)?.fixes ?? [])
  const imageUrl = useImageUrl(rec.imageId)
  const robot = getRobot(rec.robotId)
  const state = syncStateOf(rec)

  // Reprend la version en base si elle change ailleurs (actualisation, conflit résolu).
  useEffect(() => {
    const json = JSON.stringify(rec.recipe)
    if (json !== lastSaved.current && !timer.current) {
      lastSaved.current = json
      draftRef.current = rec.recipe
      setDraft(rec.recipe)
    }
  }, [rec.recipe])

  // Enregistre ce qui reste en attente en quittant l'éditeur.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        void saveRecipe(rec.id, { recipe: draftRef.current })
      }
    },
    [rec.id],
  )

  function update(next: Recipe) {
    draftRef.current = next
    setDraft(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      lastSaved.current = JSON.stringify(next)
      void saveRecipe(rec.id, { recipe: next })
    }, SAVE_DELAY)
  }
  async function flush() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
      lastSaved.current = JSON.stringify(draftRef.current)
      await saveRecipe(rec.id, { recipe: draftRef.current })
    }
  }
  const patch = (p: Partial<Recipe>) => update({ ...draft, ...p })

  const liveFixes = useMemo(() => fitRecipeToRobot(draft, robot).fixes, [draft, robot])

  async function run(kind: 'publish' | 'unpublish') {
    await flush()
    setBusy(kind)
    try {
      if (kind === 'publish') await publishRecipe(rec.id)
      else await unpublishRecipe(rec.id)
      const fresh = await db.recipes.get(rec.id)
      if (fresh?.pending) toast('Hors ligne : l’opération partira au retour du réseau.')
      else if (fresh?.sync.error) toastError(fresh.sync.error)
      else toast(kind === 'publish' ? 'Recette envoyée sur Monsieur Cuisine.' : 'Recette retirée de Monsieur Cuisine.')
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    const blob = await prepareImage(file)
    const imageId = await storeImage(blob)
    const old = rec.imageId
    await saveRecipe(rec.id, { imageId })
    if (old && old !== rec.sync.media?.imageId) {
      await db.media.delete(old)
      releaseImageUrl(old)
    }
  }

  const setGroup = (gi: number, g: IngredientGroup) =>
    patch({ ingredientGroups: draft.ingredientGroups.map((x, i) => (i === gi ? g : x)) })
  const setIngredient = (gi: number, ii: number, p: Partial<Ingredient>) => {
    const g = draft.ingredientGroups[gi]!
    setGroup(gi, { ...g, ingredients: g.ingredients.map((x, i) => (i === ii ? { ...x, ...p } : x)) })
  }
  const setStep = (si: number, p: Partial<Step>) => patch({ steps: draft.steps.map((x, i) => (i === si ? { ...x, ...p } : x)) })
  const editingStep = draft.steps.find((s) => s.key === modeStep)

  return (
    <>
      <TopBar title={draft.title || 'Sans titre'} back="/recettes">
        <StatusBadge rec={rec} />
      </TopBar>
      <main className="main">
        {rec.sync.conflict && (
          <div className="notice warn stack" role="alert">
            <p>
              <strong>Conflit :</strong> la recette a été modifiée sur Monsieur Cuisine et ici depuis la dernière
              synchronisation.
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={() => void resolveConflict(rec.id, 'remote')}>
                Prendre la version en ligne
              </button>
              <button type="button" className="btn primary" onClick={() => void resolveConflict(rec.id, 'local')}>
                Garder ma version et la publier
              </button>
            </div>
          </div>
        )}
        {initialFixes.length > 0 && (
          <details className="notice info">
            <summary>
              {initialFixes.length} ajustement{initialFixes.length > 1 ? 's' : ''} pour le {robot.name}
            </summary>
            <ul className="fixes small">
              {initialFixes.map((f, i) => (
                <li key={i}>
                  {f.stepIndex !== undefined && `Étape ${f.stepIndex + 1} : `}
                  {f.message}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="photo" style={{ marginTop: 12 }}>
          {imageUrl ? <img src={imageUrl} alt="" /> : <span className="muted">Aucune photo</span>}
          <div className="row">
            <label className="btn">
              <Icon name="camera" /> {imageUrl ? 'Changer' : 'Ajouter une photo'}
              <input type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
            </label>
            {imageUrl && (
              <button type="button" className="btn" onClick={() => void saveRecipe(rec.id, { imageId: null })}>
                Retirer
              </button>
            )}
          </div>
        </div>

        <section className="section stack">
          <label className="field">
            <span>Titre</span>
            <input type="text" value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea rows={3} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
          </label>
          <div className="grid4">
            <label className="field">
              <span>Difficulté</span>
              <select value={draft.complexity} onChange={(e) => patch({ complexity: e.target.value as Recipe['complexity'] })}>
                {COMPLEXITIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Préparation (min)</span>
              <input
                type="number"
                min={0}
                value={draft.preparationTime}
                onChange={(e) => patch({ preparationTime: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label className="field">
              <span>Prêt en (min)</span>
              <input
                type="number"
                min={0}
                value={draft.readyInTime}
                onChange={(e) => patch({ readyInTime: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label className="field">
              <span>Robot</span>
              <select
                value={rec.robotId}
                onChange={async (e) => {
                  await flush()
                  await saveRecipe(rec.id, { robotId: e.target.value as RobotId })
                }}
              >
                {ROBOTS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid2">
            <label className="field">
              <span>Portions</span>
              <input
                type="number"
                min={1}
                value={draft.servings.amount}
                onChange={(e) => patch({ servings: { ...draft.servings, amount: Math.max(1, Number(e.target.value) || 1) } })}
              />
            </label>
            <label className="field">
              <span>Unité</span>
              <select
                value={draft.servings.unit}
                onChange={(e) => patch({ servings: { ...draft.servings, unit: e.target.value as Recipe['servings']['unit'] } })}
              >
                {SERVING_UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>Catégories</span>
            <div className="chips" role="group" aria-label="Catégories" style={{ marginTop: 6 }}>
              {CATEGORIES.map((c) => {
                const on = draft.categoryIds.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="chip"
                    aria-pressed={on}
                    onClick={() =>
                      patch({ categoryIds: on ? draft.categoryIds.filter((x) => x !== c.id) : [...draft.categoryIds, c.id] })
                    }
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="section">
          <h2>Ingrédients</h2>
          <div className="stack">
            {draft.ingredientGroups.map((g, gi) => (
              <div key={g.key} className="card stack">
                <div className="row">
                  <input
                    type="text"
                    className="grow"
                    aria-label="Nom du groupe"
                    value={g.name}
                    onChange={(e) => setGroup(gi, { ...g, name: e.target.value })}
                    style={{ flex: 1, fontWeight: 600 }}
                  />
                  {draft.ingredientGroups.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Supprimer le groupe ${g.name}`}
                      onClick={() => patch({ ingredientGroups: draft.ingredientGroups.filter((_, i) => i !== gi) })}
                    >
                      <Icon name="trash" />
                    </button>
                  )}
                </div>
                <SortableList items={g.ingredients} onReorder={(ingredients) => setGroup(gi, { ...g, ingredients })}>
                  {(ing, ii, handle) => (
                    <div className="ing-row" style={{ marginBottom: 6 }}>
                      {handle}
                      <input
                        type="text"
                        inputMode="decimal"
                        className="ing-amount"
                        aria-label="Quantité"
                        value={ing.amount}
                        onChange={(e) => setIngredient(gi, ii, { amount: e.target.value })}
                      />
                      <select
                        className="ing-unit"
                        aria-label="Unité"
                        value={ing.unit}
                        onChange={(e) => setIngredient(gi, ii, { unit: e.target.value as Ingredient['unit'] })}
                      >
                        {INGREDIENT_UNITS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="ing-name"
                        aria-label="Ingrédient"
                        value={ing.name}
                        onChange={(e) => setIngredient(gi, ii, { name: e.target.value })}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: 36, height: 36 }}
                        aria-label={`Retirer ${ing.name}`}
                        onClick={() => setGroup(gi, { ...g, ingredients: g.ingredients.filter((_, i) => i !== ii) })}
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                  )}
                </SortableList>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    setGroup(gi, { ...g, ingredients: [...g.ingredients, { key: newKey('i'), name: '', amount: '', unit: 'g' }] })
                  }
                >
                  <Icon name="plus" /> Ajouter un ingrédient
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn"
              onClick={() =>
                patch({ ingredientGroups: [...draft.ingredientGroups, { key: newKey('g'), name: 'Nouveau groupe', ingredients: [] }] })
              }
            >
              <Icon name="plus" /> Ajouter un groupe
            </button>
          </div>
        </section>

        <section className="section">
          <h2>Étapes</h2>
          {liveFixes.length > 0 && (
            <div className="notice warn small" style={{ marginBottom: 12 }}>
              À la publication, Mr Chef ajustera ces réglages pour le {robot.name} :
              <ul className="fixes">
                {liveFixes.map((f, i) => (
                  <li key={i}>
                    {f.stepIndex !== undefined && `Étape ${f.stepIndex + 1} : `}
                    {f.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <SortableList items={draft.steps} onReorder={(steps) => patch({ steps })}>
            {(step, si, handle) => (
              <div className="step" style={{ marginBottom: 10 }}>
                <div className="step-head">
                  {handle}
                  <span className="step-num">{si + 1}</span>
                  <input
                    type="text"
                    className="grow"
                    aria-label={`Titre de l’étape ${si + 1}`}
                    value={step.title}
                    onChange={(e) => setStep(si, { title: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Supprimer l’étape ${si + 1}`}
                    onClick={() => patch({ steps: draft.steps.filter((_, i) => i !== si) })}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                <textarea
                  rows={3}
                  aria-label={`Instructions de l’étape ${si + 1}`}
                  value={step.description}
                  onChange={(e) => setStep(si, { description: e.target.value })}
                  style={{ marginTop: 8 }}
                />
                <button
                  type="button"
                  className={`mode-pill${step.mode ? '' : ' empty'}`}
                  onClick={() => setModeStep(step.key)}
                >
                  {step.mode ? modeSummary(step.mode) : '+ Programme du robot'}
                </button>
              </div>
            )}
          </SortableList>
          <button
            type="button"
            className="btn block"
            onClick={() =>
              patch({ steps: [...draft.steps, { key: newKey('s'), title: `Étape ${draft.steps.length + 1}`, description: '', mode: null }] })
            }
          >
            <Icon name="plus" /> Ajouter une étape
          </button>
        </section>

        <section className="section stack">
          <h2>Astuces</h2>
          <textarea rows={3} aria-label="Astuces" value={draft.hintsAndTips} onChange={(e) => patch({ hintsAndTips: e.target.value })} />
          <h2>Valeurs nutritionnelles (par portion)</h2>
          <div className="grid4">
            {NUTRIENTS.map((n) => (
              <label key={n.key} className="field">
                <span>
                  {n.label} ({n.unit})
                </span>
                <input
                  type="number"
                  min={0}
                  value={draft.nutrients[n.key]}
                  onChange={(e) => patch({ nutrients: { ...draft.nutrients, [n.key]: Math.max(0, Number(e.target.value) || 0) } })}
                />
              </label>
            ))}
          </div>
          {rec.origin.prompt && (
            <p className="muted small">
              Générée par {rec.origin.model} à partir de : « {rec.origin.prompt} »
            </p>
          )}
          <button type="button" className="btn ghost" onClick={() => setConfirm('delete')}>
            <Icon name="trash" /> Supprimer de cet appareil
          </button>
        </section>
      </main>

      <div className="syncbar">
        <div className="grow small muted">
          {rec.sync.error ? (
            <span style={{ color: 'var(--tomate)' }}>{rec.sync.error}</span>
          ) : rec.sync.lastSyncedAt ? (
            `Synchronisée ${relativeTime(rec.sync.lastSyncedAt)}`
          ) : (
            'Enregistrée sur cet appareil'
          )}
        </div>
        {state === 'local' && (
          <button type="button" className="btn primary" disabled={!!busy || !settings?.relayUrl} onClick={() => void run('publish')}>
            <Icon name="upload" /> {busy === 'publish' ? 'Publication…' : online ? 'Publier sur Monsieur Cuisine' : 'Publier au retour du réseau'}
          </button>
        )}
        {state === 'desynced' && (
          <button type="button" className="btn primary" disabled={!!busy} onClick={() => void run('publish')}>
            <Icon name="refresh" /> {busy === 'publish' ? 'Mise à jour…' : 'Mettre à jour en ligne'}
          </button>
        )}
        {state !== 'local' && (
          <button type="button" className="btn" disabled={!!busy} onClick={() => setConfirm('unpublish')}>
            {busy === 'unpublish' ? 'Retrait…' : 'Dépublier'}
          </button>
        )}
      </div>

      {editingStep && (
        <ModeEditor
          key={editingStep.key}
          open
          robot={robot}
          mode={editingStep.mode}
          onClose={() => setModeStep(null)}
          onSave={(mode) => {
            setStep(
              draft.steps.findIndex((s) => s.key === editingStep.key),
              { mode },
            )
            setModeStep(null)
          }}
        />
      )}

      <Dialog
        open={confirm === 'unpublish'}
        onClose={() => setConfirm(null)}
        title="Dépublier cette recette ?"
        actions={
          <>
            <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setConfirm(null)
                void run('unpublish')
              }}
            >
              Dépublier
            </button>
          </>
        }
      >
        <p>Elle sera retirée de votre compte Monsieur Cuisine (corbeille) et restera ici, en recette locale.</p>
      </Dialog>

      <Dialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        title="Supprimer cette recette ?"
        actions={
          <>
            <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={async () => {
                if (timer.current) clearTimeout(timer.current)
                timer.current = null
                await deleteRecipeLocal(rec.id)
                navigate('/recettes', { replace: true })
              }}
            >
              Supprimer
            </button>
          </>
        }
      >
        <p>
          Elle sera effacée de cet appareil.
          {state !== 'local' && ' La version publiée reste sur votre compte Monsieur Cuisine ; dépubliez-la d’abord pour la retirer.'}
        </p>
      </Dialog>
    </>
  )
}
