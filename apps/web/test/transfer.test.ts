import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/db'
import { getSettings, setSettings } from '../src/lib/settings'
import {
  applyBundle,
  buildBundle,
  decryptBundle,
  encryptBundle,
  extractCode,
  generatePassphrase,
  TransferError,
} from '../src/lib/transfer'
import { getSecret, resetVaultCache, setSecret } from '../src/lib/vault'

beforeEach(async () => {
  await db.delete()
  await db.open()
  resetVaultCache()
})

describe('transfert de configuration', () => {
  it('chiffre puis restaure clés, relais et session avec la bonne phrase', async () => {
    await setSettings({ relayUrl: 'https://relay.test', robotId: 'smart', activeProvider: 'anthropic', mcUser: 'chef' })
    await setSecret('relay:secret', 'relay-secret')
    await setSecret('ai:anthropic', 'sk-ant-xyz')
    await setSecret('mc:session', 'wordpress_logged_in_a=b')
    const bundle = await buildBundle({ prefs: true, relay: true, ai: true, mc: true })
    const pass = generatePassphrase()
    expect(pass).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/)
    const code = await encryptBundle(bundle, pass)
    expect(code).not.toContain('sk-ant')
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)

    await db.delete()
    await db.open()
    resetVaultCache()
    const back = await decryptBundle(extractCode(`https://x.github.io/app/#/importer?c=${code}`), pass.toLowerCase().replace(/-/g, '- '))
    expect(await applyBundle(back)).toBe(true)
    const s = await getSettings()
    expect(s).toMatchObject({ relayUrl: 'https://relay.test', robotId: 'smart', activeProvider: 'anthropic', onboardingDone: true, mcUser: 'chef' })
    expect(await getSecret('ai:anthropic')).toBe('sk-ant-xyz')
    expect(await getSecret('relay:secret')).toBe('relay-secret')
    expect(await getSecret('mc:session')).toBe('wordpress_logged_in_a=b')
  })

  it('refuse une mauvaise phrase et ne transfère que ce qui est coché', async () => {
    await setSecret('ai:mistral', 'mistral-key')
    await setSecret('mc:session', 'wordpress_logged_in_a=b')
    const bundle = await buildBundle({ prefs: false, relay: true, ai: true, mc: false })
    expect(bundle.mc).toBeUndefined()
    expect(bundle.relay).toBeUndefined()
    const code = await encryptBundle(bundle, 'AAAA-BBBB-CCCC-DDDD')
    await expect(decryptBundle(code, 'AAAA-BBBB-CCCC-DDDE')).rejects.toBeInstanceOf(TransferError)
  })
})
