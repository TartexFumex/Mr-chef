import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
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
import { errorMessage, hasRelay } from '../lib/mc'
import { deleteRecipeLocal, prepareImage, releaseImageUrl, saveRecipe, storeImage, syncStateOf, useImageUrl, useRecipe } from '../lib/recipes'
import { publishRecipe, resolveConflict, unpublishRecipe } from '../lib/sync'
import { useSettings } from '../lib/settings'
import { db } from '../db/db'
import { categoryLabel, describeFix, unitLabel, useLang, useT } from '../i18n'

export function Editor() {
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
  return <EditorLoaded key={rec.id} rec={rec} />
}

const SAVE_DELAY = 400

function EditorLoaded({ rec }: { rec: RecipeRecord }) {
  const location = useLocation()
  const navigate = useNavigate()
  const settings = useSettings()
  const online = useOnline()
  const t = useT()
  const lang = useLang()
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
      if (fresh?.pending) toast(t.editor.queued)
      else if (fresh?.sync.error) toastError(fresh.sync.error)
      else toast(kind === 'publish' ? t.editor.published : t.editor.unpublished)
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
      <TopBar title={draft.title || t.editor.untitled} back={`/recette/${rec.id}`}>
        <StatusBadge rec={rec} />
        <Link to={`/recette/${rec.id}`} className="btn primary">
          <Icon name="check" /> {t.editor.done}
        </Link>
      </TopBar>
      <main className="main">
        {rec.sync.conflict && (
          <div className="notice warn stack" role="alert">
            <p>
              <strong>{t.editor.conflictTitle}</strong> {t.editor.conflictText}
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={() => void resolveConflict(rec.id, 'remote')}>
                {t.editor.takeRemote}
              </button>
              <button type="button" className="btn primary" onClick={() => void resolveConflict(rec.id, 'local')}>
                {t.editor.keepLocal}
              </button>
            </div>
          </div>
        )}
        {initialFixes.length > 0 && (
          <details className="notice info">
            <summary>
              {t.editor.adjustments(initialFixes.length, robot.name)}
            </summary>
            <ul className="fixes small">
              {initialFixes.map((f, i) => (
                <li key={i}>{describeFix(f, t, robot.name, lang)}</li>
              ))}
            </ul>
          </details>
        )}

        <div className="photo" style={{ marginTop: 12 }}>
          {imageUrl ? <img src={imageUrl} alt="" /> : <span className="muted">{t.editor.noPhoto}</span>}
          <div className="row">
            <label className="btn">
              <Icon name="camera" /> {imageUrl ? t.editor.changePhoto : t.editor.addPhoto}
              <input type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
            </label>
            {imageUrl && (
              <button type="button" className="btn" onClick={() => void saveRecipe(rec.id, { imageId: null })}>
                {t.editor.removePhoto}
              </button>
            )}
          </div>
        </div>

        <section className="section stack">
          <label className="field">
            <span>{t.editor.title}</span>
            <input type="text" value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
          </label>
          <label className="field">
            <span>{t.editor.description}</span>
            <textarea rows={3} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
          </label>
          <div className="grid4">
            <label className="field">
              <span>{t.editor.complexity}</span>
              <select value={draft.complexity} onChange={(e) => patch({ complexity: e.target.value as Recipe['complexity'] })}>
                {COMPLEXITIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {t.complexity[c.key] ?? c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t.editor.prep}</span>
              <input
                type="number"
                min={0}
                value={draft.preparationTime}
                onChange={(e) => patch({ preparationTime: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label className="field">
              <span>{t.editor.ready}</span>
              <input
                type="number"
                min={0}
                value={draft.readyInTime}
                onChange={(e) => patch({ readyInTime: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label className="field">
              <span>{t.editor.robot}</span>
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
              <span>{t.editor.servings}</span>
              <input
                type="number"
                min={1}
                value={draft.servings.amount}
                onChange={(e) => patch({ servings: { ...draft.servings, amount: Math.max(1, Number(e.target.value) || 1) } })}
              />
            </label>
            <label className="field">
              <span>{t.editor.unit}</span>
              <select
                value={draft.servings.unit}
                onChange={(e) => patch({ servings: { ...draft.servings, unit: e.target.value as Recipe['servings']['unit'] } })}
              >
                {SERVING_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {unitLabel(u, t)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>{t.editor.categories}</span>
            <div className="chips" role="group" aria-label={t.editor.categories} style={{ marginTop: 6 }}>
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
                    {categoryLabel(c.id, c.label, t)}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="section">
          <h2>{t.editor.ingredients}</h2>
          <div className="stack">
            {draft.ingredientGroups.map((g, gi) => (
              <div key={g.key} className="card stack">
                <div className="row">
                  <input
                    type="text"
                    className="grow"
                    aria-label={t.editor.groupName}
                    value={g.name}
                    onChange={(e) => setGroup(gi, { ...g, name: e.target.value })}
                    style={{ flex: 1, fontWeight: 600 }}
                  />
                  {draft.ingredientGroups.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={t.editor.deleteGroup(g.name)}
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
                        aria-label={t.editor.amount}
                        value={ing.amount}
                        onChange={(e) => setIngredient(gi, ii, { amount: e.target.value })}
                      />
                      <select
                        className="ing-unit"
                        aria-label={t.editor.unit}
                        value={ing.unit}
                        onChange={(e) => setIngredient(gi, ii, { unit: e.target.value as Ingredient['unit'] })}
                      >
                        {INGREDIENT_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {unitLabel(u, t)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="ing-name"
                        aria-label={t.editor.ingredient}
                        value={ing.name}
                        onChange={(e) => setIngredient(gi, ii, { name: e.target.value })}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: 36, height: 36 }}
                        aria-label={t.editor.removeIngredient(ing.name)}
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
                  <Icon name="plus" /> {t.editor.addIngredient}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn"
              onClick={() =>
                patch({ ingredientGroups: [...draft.ingredientGroups, { key: newKey('g'), name: t.editor.newGroup, ingredients: [] }] })
              }
            >
              <Icon name="plus" /> {t.editor.addGroup}
            </button>
          </div>
        </section>

        <section className="section">
          <h2>{t.editor.steps}</h2>
          {liveFixes.length > 0 && (
            <div className="notice warn small" style={{ marginBottom: 12 }}>
              {t.editor.willAdjust(robot.name)}
              <ul className="fixes">
                {liveFixes.map((f, i) => (
                  <li key={i}>{describeFix(f, t, robot.name, lang)}</li>
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
                    aria-label={t.editor.stepTitle(si + 1)}
                    value={step.title}
                    onChange={(e) => setStep(si, { title: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t.editor.deleteStep(si + 1)}
                    onClick={() => patch({ steps: draft.steps.filter((_, i) => i !== si) })}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                <textarea
                  rows={3}
                  aria-label={t.editor.stepText(si + 1)}
                  value={step.description}
                  onChange={(e) => setStep(si, { description: e.target.value })}
                  style={{ marginTop: 8 }}
                />
                <button
                  type="button"
                  className={`mode-pill${step.mode ? '' : ' empty'}`}
                  onClick={() => setModeStep(step.key)}
                >
                  {step.mode ? modeSummary(step.mode) : t.editor.addProgram}
                </button>
              </div>
            )}
          </SortableList>
          <button
            type="button"
            className="btn block"
            onClick={() =>
              patch({ steps: [...draft.steps, { key: newKey('s'), title: t.editor.stepN(draft.steps.length + 1), description: '', mode: null }] })
            }
          >
            <Icon name="plus" /> {t.editor.addStep}
          </button>
        </section>

        <section className="section stack">
          <h2>{t.editor.tips}</h2>
          <textarea rows={3} aria-label={t.editor.tips} value={draft.hintsAndTips} onChange={(e) => patch({ hintsAndTips: e.target.value })} />
          <h2>{t.editor.nutrition}</h2>
          <div className="grid4">
            {NUTRIENTS.map((n) => (
              <label key={n.key} className="field">
                <span>
                  {t.nutrients[n.key] ?? n.label} ({n.unit})
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
              {t.editor.generatedBy(rec.origin.model ?? '', rec.origin.prompt)}
            </p>
          )}
          <button type="button" className="btn ghost" onClick={() => setConfirm('delete')}>
            <Icon name="trash" /> {t.editor.deleteLocal}
          </button>
        </section>
      </main>

      <div className="syncbar">
        <div className="grow small muted">
          {rec.sync.error ? (
            <span style={{ color: 'var(--tomate)' }}>{rec.sync.error}</span>
          ) : rec.sync.lastSyncedAt ? (
            t.editor.syncedAgo(relativeTime(rec.sync.lastSyncedAt))
          ) : (
            t.editor.savedLocal
          )}
        </div>
        {state === 'local' && (
          <button type="button" className="btn primary" disabled={!!busy || !hasRelay(settings)} onClick={() => void run('publish')}>
            <Icon name="upload" /> {busy === 'publish' ? t.editor.publishing : online ? t.editor.publish : t.editor.publishOffline}
          </button>
        )}
        {state === 'desynced' && (
          <button type="button" className="btn primary" disabled={!!busy} onClick={() => void run('publish')}>
            <Icon name="refresh" /> {busy === 'publish' ? t.editor.updating : t.editor.update}
          </button>
        )}
        {state !== 'local' && (
          <button type="button" className="btn" disabled={!!busy} onClick={() => setConfirm('unpublish')}>
            {busy === 'unpublish' ? t.editor.unpublishing : t.editor.unpublish}
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
        title={t.editor.unpublishTitle}
        actions={
          <>
            <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
              {t.common.cancel}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setConfirm(null)
                void run('unpublish')
              }}
            >
              {t.editor.unpublish}
            </button>
          </>
        }
      >
        <p>{t.editor.unpublishText}</p>
      </Dialog>

      <Dialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        title={t.editor.deleteTitle}
        actions={
          <>
            <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
              {t.common.cancel}
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
              {t.common.delete}
            </button>
          </>
        }
      >
        <p>
          {t.editor.deleteText}
          {state !== 'local' && t.editor.deleteRemote}
        </p>
      </Dialog>
    </>
  )
}
