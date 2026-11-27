import { afterEach, describe, expect, it, vi } from 'vitest'
import { handle, type Env } from '../src/index'

const env: Env = { ALLOWED_ORIGIN: 'https://moi.github.io, http://localhost:5173', RELAY_SHARED_SECRET: 'secret' }
const ORIGIN = 'https://moi.github.io'

function req(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  return new Request(`https://relay.test${path}`, {
    ...init,
    headers: { origin: ORIGIN, 'x-relay-secret': 'secret', 'x-mc-session': 'wordpress_logged_in_x=1', ...(init.headers ?? {}) },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('relais', () => {
  it('refuse une origine inconnue', async () => {
    const r = await handle(req('/health', { headers: { origin: 'https://evil.example' } }), env)
    expect(r.status).toBe(403)
  })

  it('répond au préflight CORS et au test de santé', async () => {
    const pre = await handle(req('/mc', { method: 'OPTIONS' }), env)
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    const h = await handle(req('/health'), env)
    expect(await h.json()).toMatchObject({ ok: true })
  })

  it('exige le secret partagé', async () => {
    const r = await handle(req('/mc', { method: 'POST', headers: { 'x-relay-secret': 'faux' }, body: '{}' }), env)
    expect(r.status).toBe(401)
    expect(await r.json()).toEqual({ error: 'bad_secret' })
  })

  it('refuse une opération hors liste blanche', async () => {
    const r = await handle(req('/mc', { method: 'POST', body: JSON.stringify({ endpoint: 'api/v1/admin', method: 'GET' }) }), env)
    expect(r.status).toBe(403)
  })

  it('transmet à /proxy-api avec le cookie et les en-têtes du site', async () => {
    const fetchMock = vi.fn(async () => new Response('{"code":0,"message":"","data":{}}', { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const r = await handle(req('/mc', { method: 'POST', body: JSON.stringify({ endpoint: 'api/v1/users', method: 'GET', lang: 'fr-FR' }) }), env)
    expect(r.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://www.monsieur-cuisine.com/proxy-api')
    const h = new Headers(init.headers)
    expect(h.get('cookie')).toBe('wordpress_logged_in_x=1')
    expect(h.get('device-type')).toBe('web')
    expect(JSON.parse(String(init.body))).toEqual({ endpoint: 'api/v1/users', method: 'GET', lang: 'fr-FR' })
  })

  it('signale une session expirée quand WordPress redirige', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 302, headers: { location: '/fr/sso/login' } })))
    const r = await handle(req('/mc', { method: 'POST', body: JSON.stringify({ endpoint: 'api/v1/users', method: 'GET' }) }), env)
    expect(r.status).toBe(401)
    expect(await r.json()).toEqual({ error: 'mc_session_expired' })
  })

  it('n’envoie des images que vers le stockage Monsieur Cuisine', async () => {
    const bad = await handle(req(`/upload?url=${encodeURIComponent('https://evil.example/x')}`, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: 'x' }), env)
    expect(bad.status).toBe(403)
  })
})
