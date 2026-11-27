/**
 * Liste blanche des opérations Tecpal relayées via `POST /proxy-api`
 * (toutes observées dans swagger.json et la capture HAR). Partagée par le
 * client et par le relais, qui refuse tout le reste.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH'

const RULES: { method: HttpMethod; pattern: RegExp }[] = [
  { method: 'GET', pattern: /^api\/v1\/users$/ },
  { method: 'GET', pattern: /^api\/v1\/ingredients\/quick-search\?[^#]*$/ },
  { method: 'POST', pattern: /^api\/v1\/media\/image\/upload-url$/ },
  { method: 'GET', pattern: /^api\/v1\/media\?(ids\[\]=\d+&?)+$/ },
  { method: 'GET', pattern: /^api\/v3\/auth\/user\/recipes(\?[^#]*)?$/ },
  { method: 'POST', pattern: /^api\/v3\/auth\/user\/recipes\/$/ },
  { method: 'GET', pattern: /^api\/v3\/auth\/user\/recipes\/\d+$/ },
  { method: 'PUT', pattern: /^api\/v3\/auth\/user\/recipes\/\d+$/ },
  { method: 'PATCH', pattern: /^api\/v3\/auth\/user\/recipes\/\d+$/ },
]

export function isAllowedOperation(method: string, endpoint: string): boolean {
  return RULES.some((r) => r.method === method && r.pattern.test(endpoint))
}

/** Seules les URL signées du stockage d'images Monsieur Cuisine sont acceptées pour l'envoi. */
export function isAllowedUploadUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === 'storage.googleapis.com' && u.pathname.startsWith('/mc-recipe-web-user-prod/')
  } catch {
    return false
  }
}
