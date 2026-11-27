import { describe, expect, it, vi } from 'vitest'
import { McClient, McError } from '../src/client'
import { isAllowedOperation, isAllowedUploadUrl } from '../src/endpoints'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('McClient', () => {
  it('enveloppe l’appel au format /proxy-api et ajoute secret et session', async () => {
    const fetchMock = vi.fn(async () => json({ code: 0, message: '', data: { recipe: { id: 42 } } }, 201))
    const c = new McClient({ url: 'https://relay.test/', secret: 's3cret' }, () => 'wordpress_logged_in_x=1', fetchMock as unknown as typeof fetch)
    const r = await c.createRecipe({ status: 'draft' } as never)
    expect(r.id).toBe(42)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://relay.test/mc')
    expect(JSON.parse(String(init.body))).toEqual({ endpoint: 'api/v3/auth/user/recipes/', method: 'POST', lang: 'fr-FR', payload: { status: 'draft' } })
    const h = new Headers(init.headers)
    expect(h.get('x-relay-secret')).toBe('s3cret')
    expect(h.get('x-mc-session')).toBe('wordpress_logged_in_x=1')
  })

  it('traduit les erreurs du relais', async () => {
    const mk = (body: unknown, status: number) => new McClient({ url: 'https://r', secret: 's' }, () => 'c', (async () => json(body, status)) as typeof fetch)
    await expect(mk({ error: 'mc_session_expired' }, 401).getUser()).rejects.toMatchObject({ kind: 'session_expired' })
    await expect(mk({ error: 'bad_secret' }, 401).getUser()).rejects.toMatchObject({ kind: 'relay_secret' })
    await expect(mk({ error: 'origin_not_allowed' }, 403).getUser()).rejects.toMatchObject({ kind: 'relay_origin' })
    await expect(mk({}, 502).getUser()).rejects.toMatchObject({ kind: 'mc_unavailable' })
    const noSession = new McClient({ url: 'https://r', secret: 's' }, () => null)
    await expect(noSession.getUser()).rejects.toBeInstanceOf(McError)
  })
})

describe('liste blanche', () => {
  it('accepte les opérations du HAR et refuse le reste', () => {
    expect(isAllowedOperation('GET', 'api/v1/users')).toBe(true)
    expect(isAllowedOperation('PATCH', 'api/v3/auth/user/recipes/10458034')).toBe(true)
    expect(isAllowedOperation('POST', 'api/v3/auth/user/recipes/')).toBe(true)
    expect(isAllowedOperation('GET', 'api/v1/media?ids[]=1&ids[]=2')).toBe(true)
    expect(isAllowedOperation('DELETE', 'api/v3/auth/user/recipes/1')).toBe(false)
    expect(isAllowedOperation('GET', 'api/v1/admin')).toBe(false)
    expect(isAllowedOperation('GET', 'api/v1/users/../admin')).toBe(false)
    expect(isAllowedUploadUrl('https://storage.googleapis.com/mc-recipe-web-user-prod/x.jpg?X-Goog-Signature=1')).toBe(true)
    expect(isAllowedUploadUrl('https://evil.example/mc-recipe-web-user-prod/x')).toBe(false)
  })
})
