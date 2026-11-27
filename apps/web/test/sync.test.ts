import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyRecipe, newKey, type Recipe } from '@mr-chef/recipe-schema'
import { db } from '../src/db/db'
import { createRecipeRecord, saveRecipe, syncStateOf } from '../src/lib/recipes'
import { setSettings } from '../src/lib/settings'
import { publishRecipe, processPendingQueue, refreshFromRemote, unpublishRecipe } from '../src/lib/sync'
import { resetVaultCache, setSecret } from '../src/lib/vault'

interface Call {
  endpoint: string
  method: string
  payload?: Record<string, unknown>
}

/** Faux relais : répond comme /proxy-api en recopiant le corps envoyé avec des identifiants. */
function fakeRelay() {
  const calls: Call[] = []
  const store = new Map<number, Record<string, unknown>>()
  let nextId = 1000
  const withIds = (id: number, payload: Record<string, unknown>) => {
    const servingSizes = (payload.servingSizes as Record<string, unknown>[]).map((s) => ({
      ...s,
      id: (s.id as number | null) ?? nextId++,
      isDefault: true,
      ingredientGroups: (s.ingredientGroups as Record<string, unknown>[]).map((g, gi) => ({
        ...g,
        id: (g.id as number | null) ?? nextId++,
        order: gi,
        ingredients: (g.ingredients as Record<string, unknown>[]).map((i) => ({ ...i, id: (i.id as number | null) ?? nextId++ })),
      })),
      steps: (s.steps as Record<string, unknown>[]).map((st, si) => ({ ...st, id: (st.id as number | null) ?? nextId++, order: si })),
    }))
    const rec = { ...payload, id, servingSizes, updatedAt: `2026-11-27T10:00:0${store.size}Z` }
    store.set(id, rec)
    return rec
  }
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    expect(new Headers(init.headers).get('x-relay-secret')).toBe('s3cret')
    const body = JSON.parse(String(init.body)) as Call
    calls.push(body)
    const ok = (data: unknown) => new Response(JSON.stringify({ code: 0, message: 'ok', data }), { status: 200 })
    const m = body.endpoint.match(/recipes\/(\d+)/)
    if (body.method === 'POST') return ok({ recipe: withIds(nextId++, body.payload!) })
    if (body.method === 'PUT') return ok({ recipe: withIds(Number(m![1]), body.payload!) })
    if (body.method === 'PATCH') {
      store.delete(Number(m![1]))
      return ok(null)
    }
    if (body.method === 'GET' && body.endpoint.includes('user/recipes?')) {
      const recipes = [...store.values()].map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt }))
      return ok({ recipes, pagination: { total: recipes.length, page: 1, size: 50, totalPages: 1 } })
    }
    if (body.method === 'GET' && m) return ok({ recipe: store.get(Number(m[1])) })
    return new Response('{}', { status: 404 })
  })
  return { calls, store, fetchMock }
}

function sample(): Recipe {
  return {
    ...emptyRecipe(),
    title: 'Velouté de potiron',
    ingredientGroups: [{ key: newKey('g'), name: 'Ingrédients', ingredients: [{ key: newKey('i'), name: 'Potiron', amount: '800', unit: 'g' }] }],
    steps: [{ key: newKey('s'), title: 'Cuire', description: 'Cuire le potiron.', mode: { type: 'customized', settings: { time: 1200, temperature: 100, speed: 1 } } }],
  }
}

let relay: ReturnType<typeof fakeRelay>

beforeEach(async () => {
  await db.delete()
  await db.open()
  resetVaultCache()
  relay = fakeRelay()
  vi.stubGlobal('fetch', relay.fetchMock)
  await setSettings({ relayUrl: 'https://relay.test', onboardingDone: true })
  await setSecret('relay:secret', 's3cret')
  await setSecret('mc:session', 'wordpress_logged_in_x=abc')
})

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})

describe('synchronisation', () => {
  it('publie en brouillon puis private-publish, et passe Locale → Publiée → Désynchronisée', async () => {
    const id = await createRecipeRecord({ recipe: sample(), robotId: 'connect', origin: { provider: 'manual', model: null, prompt: null } })
    expect(syncStateOf((await db.recipes.get(id))!)).toBe('local')

    await publishRecipe(id)
    expect(relay.calls.map((c) => c.method)).toEqual(['POST', 'PUT'])
    expect(relay.calls[0]!.payload!.status).toBe('draft')
    expect(relay.calls[1]!.payload!.status).toBe('private-publish')
    let rec = (await db.recipes.get(id))!
    expect(syncStateOf(rec)).toBe('published')
    expect(rec.recipe.steps[0]!.remoteId).toBeTypeOf('number')

    await saveRecipe(id, { recipe: { ...rec.recipe, title: 'Velouté de potiron rôti' } })
    rec = (await db.recipes.get(id))!
    expect(syncStateOf(rec)).toBe('desynced')

    // La mise à jour réutilise les identifiants distants : un seul PUT, aucun nouveau POST.
    await publishRecipe(id)
    expect(relay.calls.map((c) => c.method)).toEqual(['POST', 'PUT', 'PUT'])
    expect(syncStateOf((await db.recipes.get(id))!)).toBe('published')
  })

  it('dépublie : corbeille côté Monsieur Cuisine, recette gardée en locale', async () => {
    const id = await createRecipeRecord({ recipe: sample(), robotId: 'connect', origin: { provider: 'manual', model: null, prompt: null } })
    await publishRecipe(id)
    await unpublishRecipe(id)
    const last = relay.calls.at(-1)!
    expect(last.method).toBe('PATCH')
    expect(last.payload).toEqual({ status: 'trash' })
    const rec = (await db.recipes.get(id))!
    expect(syncStateOf(rec)).toBe('local')
    expect(rec.recipe.steps[0]!.remoteId).toBeUndefined()
  })

  it('met la publication en attente hors ligne et la rejoue au retour du réseau', async () => {
    const id = await createRecipeRecord({ recipe: sample(), robotId: 'connect', origin: { provider: 'manual', model: null, prompt: null } })
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    await publishRecipe(id)
    expect((await db.recipes.get(id))!.pending).toBe('publish')
    expect(relay.calls).toHaveLength(0)

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    await processPendingQueue()
    const rec = (await db.recipes.get(id))!
    expect(rec.pending).toBeNull()
    expect(syncStateOf(rec)).toBe('published')
  })

  it('importe les recettes du compte et signale un conflit si les deux versions ont changé', async () => {
    const id = await createRecipeRecord({ recipe: sample(), robotId: 'connect', origin: { provider: 'manual', model: null, prompt: null } })
    await publishRecipe(id)
    const remoteId = (await db.recipes.get(id))!.remoteId!

    // Une autre recette existe seulement en ligne.
    relay.store.set(5, { ...relay.store.get(remoteId)!, id: 5, title: 'Pain maison', updatedAt: '2026-11-20T00:00:00Z' })
    // La recette publiée change en ligne et en local.
    relay.store.set(remoteId, { ...relay.store.get(remoteId)!, title: 'Titre en ligne', updatedAt: '2026-11-27T12:00:00Z' })
    const local = (await db.recipes.get(id))!
    await saveRecipe(id, { recipe: { ...local.recipe, title: 'Titre local' } })

    const report = await refreshFromRemote()
    expect(report).toMatchObject({ imported: 1, conflicts: 1 })
    expect((await db.recipes.get(id))!.sync.conflict?.recipe.title).toBe('Titre en ligne')
    expect(await db.recipes.where('remoteId').equals(5).count()).toBe(1)
  })

  it('garde l’identifiant distant si la mise en ligne échoue après le brouillon', async () => {
    const id = await createRecipeRecord({ recipe: sample(), robotId: 'connect', origin: { provider: 'manual', model: null, prompt: null } })
    const base = relay.fetchMock.getMockImplementation()!
    relay.fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (JSON.parse(String(init.body)).method === 'PUT') return new Response('{"error":"mc_unavailable"}', { status: 502 })
      return base(url, init)
    })
    await expect(publishRecipe(id)).rejects.toThrow()
    const rec = (await db.recipes.get(id))!
    expect(rec.remoteId).toBeTypeOf('number')
    expect(rec.sync.error).toBeTruthy()
    expect(syncStateOf(rec)).toBe('desynced')
  })
})
