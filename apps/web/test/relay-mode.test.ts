import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function load(publicUrl: string) {
  vi.stubEnv('VITE_PUBLIC_RELAY_URL', publicUrl)
  vi.resetModules()
  const { db } = await import('../src/db/db')
  await db.delete()
  await db.open()
  const vault = await import('../src/lib/vault')
  vault.resetVaultCache()
  return {
    settings: await import('../src/lib/settings'),
    mc: await import('../src/lib/mc'),
    vault,
  }
}

describe('choix du relais', () => {
  it('utilise le relais public par défaut, sans secret', async () => {
    const { settings, mc, vault } = await load('https://relais-public.example.workers.dev/')
    await vault.setSecret('relay:secret', 'ancien-secret')
    expect((await settings.getSettings()).relayMode).toBe('public')
    expect(await mc.relayConfig()).toEqual({ url: 'https://relais-public.example.workers.dev', secret: '' })

    await vault.setSecret('mc:session', 'wordpress_logged_in_a=b')
    const fetchMock = vi.fn(async () => new Response('{"code":0,"message":"","data":{"name":"chef"}}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await (await mc.getMcClient()).getUser()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://relais-public.example.workers.dev/mc')
    expect(new Headers(init.headers).has('x-relay-secret')).toBe(false)
    expect(new Headers(init.headers).get('x-mc-session')).toBe('wordpress_logged_in_a=b')
  })

  it('passe au relais personnel avec son secret', async () => {
    const { settings, mc, vault } = await load('https://relais-public.example.workers.dev')
    await settings.setSettings({ relayMode: 'custom', relayUrl: 'https://moi.workers.dev' })
    await vault.setSecret('relay:secret', 's3cret')
    expect(await mc.relayConfig()).toEqual({ url: 'https://moi.workers.dev', secret: 's3cret' })
  })

  it('sans relais public proposé, demande un relais personnel', async () => {
    const { settings, mc } = await load('')
    const s = await settings.getSettings()
    expect(s.relayMode).toBe('custom')
    expect(mc.hasRelay(s)).toBe(false)
    expect(await mc.relayConfig()).toBeNull()
  })
})
