import { describe, expect, it } from 'vitest'
import { parseSessionInput, SessionParseError } from '../src/session'

// Valeurs fictives : user|expiration|jeton|signature
const LOGGED = 'wordpress_logged_in_abc123=matthieu%7C1767225600%7Ctok%7Chmac'

describe('parseSessionInput', () => {
  it('lit une commande cURL bash avec -b', () => {
    const s = parseSessionInput(`curl 'https://www.monsieur-cuisine.com/proxy-api' -H 'accept: */*' -b '_ga=GA1; ${LOGGED}; wordpress_sec_abc123=xyz' --data-raw '{}'`)
    expect(s.names).toEqual(['wordpress_logged_in_abc123', 'wordpress_sec_abc123'])
    expect(s.cookie).toBe(`${LOGGED}; wordpress_sec_abc123=xyz`)
    expect(s.user).toBe('matthieu')
    expect(s.expiresAt?.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('lit une commande cURL cmd (Windows) avec en-tête cookie', () => {
    const s = parseSessionInput(`curl ^"https://www.monsieur-cuisine.com/proxy-api^" -H ^"cookie: ${LOGGED.replaceAll('%', '^%')}; foo=bar^"`)
    expect(s.names).toEqual(['wordpress_logged_in_abc123'])
    expect(s.user).toBe('matthieu')
  })

  it('lit une commande PowerShell', () => {
    const s = parseSessionInput(`$session.Cookies.Add((New-Object System.Net.Cookie("wordpress_logged_in_abc123", "matthieu%7C1767225600%7Ct%7Ch", "/", "www.monsieur-cuisine.com")))`)
    expect(s.names).toEqual(['wordpress_logged_in_abc123'])
  })

  it('lit un en-tête brut', () => {
    expect(parseSessionInput(`cookie: ${LOGGED}`).names).toEqual(['wordpress_logged_in_abc123'])
  })

  it('refuse un texte sans cookie de connexion', () => {
    expect(() => parseSessionInput('_ga=1; wordpress_sec_a=1')).toThrow(SessionParseError)
    expect(() => parseSessionInput('bonjour')).toThrow(SessionParseError)
  })
})
