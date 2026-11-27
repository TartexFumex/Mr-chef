import type { McRecipeList, McRecipeRecord, McRecipeWritePayload } from '@mr-chef/recipe-schema'
import type { HttpMethod } from './endpoints'

export interface RelayConfig {
  /** Adresse du relais, ex. https://mr-chef-relay.exemple.workers.dev */
  url: string
  secret: string
}

export type McErrorKind =
  | 'relay_unreachable'
  | 'relay_origin'
  | 'relay_secret'
  | 'relay_refused'
  | 'session_missing'
  | 'session_expired'
  | 'mc_unavailable'
  | 'mc_error'
  | 'quota'

const MESSAGES: Record<McErrorKind, string> = {
  relay_unreachable: 'Relais injoignable. Vérifiez son adresse dans les Paramètres et votre connexion.',
  relay_origin: 'Origine refusée par le relais : RELAY_ALLOWED_ORIGIN ne correspond pas à l’adresse de Mr Chef.',
  relay_secret: 'Secret incorrect : le secret du relais et celui de Mr Chef sont différents.',
  relay_refused: 'Le relais a refusé cette opération.',
  session_missing: 'Aucune session Monsieur Cuisine. Collez votre session dans les Paramètres.',
  session_expired: 'Session Monsieur Cuisine expirée. Reconnectez-vous sur monsieur-cuisine.com puis recollez votre session.',
  mc_unavailable: 'Monsieur Cuisine ne répond pas. Réessayez dans quelques minutes.',
  mc_error: 'Monsieur Cuisine a refusé la demande.',
  quota: 'Quota du relais atteint pour aujourd’hui. Réessayez demain.',
}

export class McError extends Error {
  constructor(
    public readonly kind: McErrorKind,
    detail?: string,
    public readonly status?: number,
  ) {
    super(detail ? `${MESSAGES[kind]} (${detail})` : MESSAGES[kind])
    this.name = 'McError'
  }
}

interface Envelope<T> {
  code: number
  message: string
  data: T
}

/** Réponse de api/v1/media/image/upload-url (HAR : { url, extraHeaders, mediaId }). */
export interface UploadUrl {
  url: string
  mediaId: number
  extraHeaders?: Record<string, string>
}

/**
 * Client des opérations Monsieur Cuisine, transportées par le relais personnel.
 * Ne connaît ni IndexedDB ni l'interface : il reçoit la session à chaque appel.
 */
export class McClient {
  constructor(
    private readonly relay: RelayConfig,
    private readonly getSession: () => string | null | Promise<string | null>,
    private readonly fetchImpl: typeof fetch = (...a) => fetch(...a),
  ) {}

  private base(path: string): string {
    return this.relay.url.replace(/\/+$/, '') + path
  }

  private async send(path: string, init: RequestInit, needsSession: boolean): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('x-relay-secret', this.relay.secret)
    if (needsSession) {
      const session = await this.getSession()
      if (!session) throw new McError('session_missing')
      headers.set('x-mc-session', session)
    }
    let res: Response
    try {
      res = await this.fetchImpl(this.base(path), { ...init, headers })
    } catch (e) {
      throw new McError('relay_unreachable', e instanceof Error ? e.message : undefined)
    }
    if (res.ok) return res
    let code = ''
    try {
      code = ((await res.clone().json()) as { error?: string }).error ?? ''
    } catch {
      /* corps non JSON */
    }
    if (code === 'origin_not_allowed') throw new McError('relay_origin', undefined, res.status)
    if (code === 'bad_secret') throw new McError('relay_secret', undefined, res.status)
    if (code === 'operation_not_allowed' || code === 'bad_request') throw new McError('relay_refused', code, res.status)
    if (code === 'mc_session_expired' || res.status === 401) throw new McError('session_expired', undefined, res.status)
    if (res.status === 429) throw new McError('quota', undefined, res.status)
    if (res.status >= 500) throw new McError('mc_unavailable', `HTTP ${res.status}`, res.status)
    throw new McError('mc_error', `HTTP ${res.status}`, res.status)
  }

  /** Appel générique d'une opération Tecpal via POST /proxy-api. */
  async call<T>(method: HttpMethod, endpoint: string, payload?: unknown): Promise<T> {
    const body = JSON.stringify({ endpoint, method, lang: 'fr-FR', ...(payload !== undefined ? { payload } : {}) })
    const res = await this.send('/mc', { method: 'POST', headers: { 'content-type': 'application/json' }, body }, true)
    const env = (await res.json()) as Envelope<T>
    if (typeof env !== 'object' || env === null || env.code !== 0) {
      throw new McError('mc_error', (env as Envelope<T> | null)?.message || 'réponse inattendue')
    }
    return env.data
  }

  async health(): Promise<{ ok: boolean; version: string }> {
    const res = await this.send('/health', { method: 'GET' }, false)
    return (await res.json()) as { ok: boolean; version: string }
  }

  getUser() {
    return this.call<{ id?: number; name?: string; email?: string; [k: string]: unknown }>('GET', 'api/v1/users')
  }

  listRecipes(page = 1, size = 50) {
    const q = `size=${size}&page=${page}&sortBy[0][field]=title&sortBy[0][direction]=ASC&filters[status][]=draft&filters[status][]=private-publish&q=`
    return this.call<McRecipeList>('GET', `api/v3/auth/user/recipes?${q}`)
  }

  async listAllRecipes(): Promise<McRecipeList['recipes']> {
    const first = await this.listRecipes(1)
    const all = [...first.recipes]
    for (let p = 2; p <= first.totalPage; p++) all.push(...(await this.listRecipes(p)).recipes)
    return all
  }

  async getRecipe(id: number): Promise<McRecipeRecord> {
    return (await this.call<{ recipe: McRecipeRecord }>('GET', `api/v3/auth/user/recipes/${id}`)).recipe
  }

  async createRecipe(payload: McRecipeWritePayload): Promise<McRecipeRecord> {
    return (await this.call<{ recipe: McRecipeRecord }>('POST', 'api/v3/auth/user/recipes/', payload)).recipe
  }

  async updateRecipe(id: number, payload: McRecipeWritePayload): Promise<McRecipeRecord> {
    return (await this.call<{ recipe: McRecipeRecord }>('PUT', `api/v3/auth/user/recipes/${id}`, payload)).recipe
  }

  async trashRecipe(id: number): Promise<void> {
    await this.call<null>('PATCH', `api/v3/auth/user/recipes/${id}`, { status: 'trash' })
  }

  requestUploadUrl(fileName: string, mimeType: string) {
    return this.call<UploadUrl>('POST', 'api/v1/media/image/upload-url', { fileName, mimeType })
  }

  async mediaStatus(ids: number[]) {
    const q = ids.map((id) => `ids[]=${id}`).join('&')
    const data = await this.call<{ media: { id: number; uploadStatus: string | number; url?: string }[] }>('GET', `api/v1/media?${q}`)
    return data.media ?? []
  }

  /** Envoie l'image vers l'URL signée Google Cloud Storage, via le relais. */
  async uploadImage(signedUrl: string, blob: Blob): Promise<void> {
    await this.send(`/upload?url=${encodeURIComponent(signedUrl)}`, {
      method: 'PUT',
      headers: { 'content-type': blob.type || 'image/jpeg' },
      body: blob,
    }, false)
  }

  /** Téléverse une image complète : URL signée, envoi, puis attente du traitement. */
  async uploadRecipeImage(blob: Blob, fileName: string, opts: { pollMs?: number; tries?: number } = {}): Promise<number> {
    const up = await this.requestUploadUrl(fileName, blob.type || 'image/jpeg')
    const mediaId = Number(up.mediaId)
    if (!up.url || !Number.isFinite(mediaId)) throw new McError('mc_error', 'URL d’envoi inattendue')
    await this.uploadImage(up.url, blob)
    const tries = opts.tries ?? 20
    for (let i = 0; i < tries; i++) {
      const status = await this.mediaStatus([mediaId])
      const item = status.find((m) => m.id === mediaId)
      if (item && String(item.uploadStatus) === '3') return mediaId
      await new Promise((r) => setTimeout(r, opts.pollMs ?? 1500))
    }
    throw new McError('mc_error', 'image toujours en cours de traitement')
  }

  /**
   * Téléverse l'illustration d'une recette comme le site officiel : une image « détails »
   * et une vignette, chacune avec son propre média.
   */
  async uploadRecipeImages(blob: Blob): Promise<{ detailsMediaId: number; thumbnailMediaId: number }> {
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
    const detailsMediaId = await this.uploadRecipeImage(blob, `mr-chef-details.${ext}`)
    const thumbnailMediaId = await this.uploadRecipeImage(blob, `mr-chef-thumbnail.${ext}`)
    return { detailsMediaId, thumbnailMediaId }
  }

  /** Invalide la session côté Monsieur Cuisine (déconnexion WordPress puis Lidl). */
  async logout(): Promise<void> {
    await this.send('/mc/logout', { method: 'POST' }, true)
  }
}
