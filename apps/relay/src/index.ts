/**
 * Relais personnel Mr Chef (Cloudflare Worker).
 *
 * Transmet à www.monsieur-cuisine.com les appels que le navigateur ne peut pas faire
 * lui-même (CORS fermé, en-tête Cookie interdit). Sans état et sans journal :
 * rien n'est conservé entre deux requêtes.
 */
import { isAllowedOperation, isAllowedUploadUrl } from '@mr-chef/mc-client/endpoints'

export interface Env {
  ALLOWED_ORIGIN: string
  RELAY_SHARED_SECRET: string
}

const VERSION = '0.1.0'
const MC = 'https://www.monsieur-cuisine.com'
const MISTRAL = 'https://api.mistral.ai/v1/chat/completions'

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
    'access-control-allow-headers': 'content-type, x-relay-secret, x-mc-session, x-ai-key',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(origin ? corsHeaders(origin) : {}) },
  })
}

/** Comparaison en temps constant du secret partagé. */
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  let diff = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return diff === 0
}

function validSession(value: string | null): value is string {
  return !!value && value.length < 8192 && !/[\r\n]/.test(value)
}

function mcHeaders(session: string, request: Request, extra: Record<string, string> = {}): Headers {
  const h = new Headers({
    accept: 'application/json, text/plain, */*',
    'accept-language': 'fr-FR,fr;q=0.9',
    cookie: session,
    'device-type': 'web',
    'x-request-id': crypto.randomUUID(),
    'x-bypass-cdn': crypto.randomUUID(),
    origin: MC,
    referer: `${MC}/fr/mes-recettes`,
    'user-agent': request.headers.get('user-agent') ?? 'Mozilla/5.0',
    ...extra,
  })
  return h
}

/** WordPress répond par une redirection ou une page HTML quand la session n'est plus valide. */
function looksLoggedOut(res: Response): boolean {
  if (res.status >= 300 && res.status < 400) return true
  if (res.status === 401 || res.status === 403) return true
  const type = res.headers.get('content-type') ?? ''
  return res.ok && type.includes('text/html')
}

async function relayResponse(res: Response, origin: string): Promise<Response> {
  if (looksLoggedOut(res)) return json({ error: 'mc_session_expired' }, 401, origin)
  if (res.status >= 500) return json({ error: 'mc_unavailable', status: res.status }, 502, origin)
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', ...corsHeaders(origin) },
  })
}

export async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const origin = (request.headers.get('origin') ?? '').replace(/\/+$/, '')
  const allowed = allowedOrigins(env)

  if (!origin || !allowed.includes(origin)) {
    return json({ error: 'origin_not_allowed' }, 403, null)
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })

  if (url.pathname === '/health' && request.method === 'GET') {
    return json({ ok: true, version: VERSION }, 200, origin)
  }

  if (!env.RELAY_SHARED_SECRET || !safeEqual(request.headers.get('x-relay-secret') ?? '', env.RELAY_SHARED_SECRET)) {
    return json({ error: 'bad_secret' }, 401, origin)
  }

  try {
    // Opérations Tecpal via POST /proxy-api
    if (url.pathname === '/mc' && request.method === 'POST') {
      const session = request.headers.get('x-mc-session')
      if (!validSession(session)) return json({ error: 'mc_session_expired' }, 401, origin)
      let body: { endpoint?: unknown; method?: unknown; lang?: unknown; payload?: unknown }
      try {
        body = await request.json()
      } catch {
        return json({ error: 'bad_request' }, 400, origin)
      }
      const endpoint = typeof body.endpoint === 'string' ? body.endpoint : ''
      const method = typeof body.method === 'string' ? body.method.toUpperCase() : ''
      if (!isAllowedOperation(method, endpoint)) return json({ error: 'operation_not_allowed' }, 403, origin)
      const forward = { endpoint, method, lang: typeof body.lang === 'string' ? body.lang : 'fr-FR', ...(body.payload !== undefined ? { payload: body.payload } : {}) }
      const res = await fetch(`${MC}/proxy-api`, {
        method: 'POST',
        headers: mcHeaders(session, request, { 'content-type': 'application/json' }),
        body: JSON.stringify(forward),
        redirect: 'manual',
      })
      return relayResponse(res, origin)
    }

    // Référentiels de l'éditeur officiel
    if (url.pathname === '/mc/ajax' && request.method === 'POST') {
      const session = request.headers.get('x-mc-session')
      if (!validSession(session)) return json({ error: 'mc_session_expired' }, 401, origin)
      const form = new FormData()
      form.set('action', 'load_recipe_post')
      const res = await fetch(`${MC}/wp-admin/admin-ajax.php`, {
        method: 'POST',
        headers: mcHeaders(session, request),
        body: form,
        redirect: 'manual',
      })
      return relayResponse(res, origin)
    }

    // Déconnexion côté serveur (WordPress puis Lidl)
    if (url.pathname === '/mc/logout' && request.method === 'POST') {
      const session = request.headers.get('x-mc-session')
      if (!validSession(session)) return json({ ok: true }, 200, origin)
      await fetch(`${MC}/fr/sso/logout?redirect_uri=${encodeURIComponent(`${MC}/fr`)}`, {
        headers: mcHeaders(session, request, { accept: 'text/html' }),
        redirect: 'manual',
      })
      return json({ ok: true }, 200, origin)
    }

    // Envoi d'une image vers l'URL signée Google Cloud Storage
    if (url.pathname === '/upload' && request.method === 'PUT') {
      const target = url.searchParams.get('url') ?? ''
      if (!isAllowedUploadUrl(target)) return json({ error: 'operation_not_allowed' }, 403, origin)
      const type = request.headers.get('content-type') ?? 'application/octet-stream'
      if (!type.startsWith('image/')) return json({ error: 'bad_request' }, 400, origin)
      const res = await fetch(target, {
        method: 'PUT',
        headers: { 'content-type': type, origin: MC },
        body: request.body,
      })
      if (!res.ok) return json({ error: 'upload_failed', status: res.status }, 502, origin)
      return json({ ok: true }, 200, origin)
    }

    // Repli pour Mistral si son API refuse les appels directs du navigateur
    if (url.pathname === '/ai/mistral' && request.method === 'POST') {
      const key = request.headers.get('x-ai-key')
      if (!key || /[\r\n]/.test(key)) return json({ error: 'bad_request' }, 400, origin)
      const res = await fetch(MISTRAL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: request.body,
      })
      return new Response(res.body, {
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', ...corsHeaders(origin) },
      })
    }

    return json({ error: 'not_found' }, 404, origin)
  } catch {
    return json({ error: 'mc_unavailable' }, 502, origin)
  }
}

export default { fetch: handle } satisfies ExportedHandler<Env>
