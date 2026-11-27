import { describe, expect, it } from 'vitest'
import { McError } from '@mr-chef/mc-client'
import { defaultSystemPrompt, getRobot, renderSystemPrompt } from '@mr-chef/recipe-schema'
import { DICTS, describeError, describeFix, setCurrentLang } from '../src/i18n'
import { AiError } from '../src/lib/ai/types'
import { formatSeconds, modeSummary } from '../src/lib/format'
import { formatPassphraseInput, TransferError } from '../src/lib/transfer'

/** Toutes les clés présentes dans un dictionnaire, à plat. */
function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('phrase secrète', () => {
  it('ajoute les tirets et les majuscules pendant la saisie', () => {
    expect(formatPassphraseInput('abcd')).toBe('ABCD')
    expect(formatPassphraseInput('abcde')).toBe('ABCD-E')
    expect(formatPassphraseInput('ABCD-')).toBe('ABCD')
    expect(formatPassphraseInput('ab cd ef gh')).toBe('ABCD-EFGH')
    expect(formatPassphraseInput('abcdefghjkmnpqrs')).toBe('ABCD-EFGH-JKMN-PQRS')
    expect(formatPassphraseInput('ABCD-EFGH-JKMN-PQRS-TUVW')).toBe('ABCD-EFGH-JKMN-PQRS')
  })
})

describe('traductions', () => {
  it('le dictionnaire anglais a les mêmes clés que le français', () => {
    const ignore = (k: string) => k.startsWith('categories') || k.startsWith('units')
    expect(keys(DICTS.en).filter((k) => !ignore(k))).toEqual(keys(DICTS.fr).filter((k) => !ignore(k)))
  })

  it('traduit erreurs, durées et programmes selon la langue active', () => {
    setCurrentLang('en')
    expect(describeError(new McError('quota'))).toBe(DICTS.en.errors.mc.quota)
    expect(describeError(new AiError('bad_key', 'Claude', 'HTTP 401'))).toBe(`${DICTS.en.errors.ai.bad_key} (HTTP 401)`)
    expect(describeError(new TransferError('passphrase'))).toBe('Wrong passphrase.')
    expect(formatSeconds(90)).toBe('1 min 30 s')
    expect(modeSummary({ type: 'customized', settings: { time: 60, temperature: 0, speed: 2, clockwise: true } })).toBe(
      'Custom cooking · 1 min · no heat · speed 2 · reverse',
    )
    expect(describeFix({ stepIndex: 1, kind: 'speed', mode: 'customized', value: 3, message: '' }, DICTS.en, 'Connect', 'en')).toBe(
      'Step 2: Speed set to 3 (Custom cooking)',
    )
    setCurrentLang('fr')
    expect(describeError(new TransferError('passphrase'))).toBe('Phrase secrète incorrecte.')
    expect(modeSummary({ type: 'turbo', settings: { time: 5 } })).toBe('Turbo · 5 s')
  })

  it('donne un prompt système anglais avec les programmes traduits', () => {
    const prompt = renderSystemPrompt(defaultSystemPrompt('en'), getRobot('connect'), 'en')
    expect(prompt).toContain('Write in English')
    expect(prompt).toContain('customized (Custom cooking)')
    expect(prompt).not.toContain('{{')
  })
})
