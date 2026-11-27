import type { ProviderId } from '../../db/db'

export interface GenerateRequest {
  apiKey: string
  model: string
  system: string
  user: string
  schema: Record<string, unknown>
  signal?: AbortSignal
}

export interface ModelInfo {
  id: string
  label: string
}

export interface RecipeProvider {
  id: ProviderId
  label: string
  /** Lien vers la page où l'on crée une clé. */
  keyUrl: string
  keyPlaceholder: string
  defaultModels: ModelInfo[]
  listModels(apiKey: string, signal?: AbortSignal): Promise<ModelInfo[]>
  /** Renvoie l'objet JSON produit par le modèle (non encore validé). */
  generate(req: GenerateRequest): Promise<unknown>
}

export type AiErrorKind = 'bad_key' | 'quota' | 'refused' | 'network' | 'invalid_output' | 'aborted' | 'other'

const MESSAGES: Record<AiErrorKind, string> = {
  bad_key: 'Clé refusée par le fournisseur. Vérifiez-la dans les Paramètres.',
  quota: 'Limite d’utilisation atteinte chez le fournisseur. Réessayez plus tard ou changez de fournisseur.',
  refused: 'Le modèle a refusé de répondre à cette demande. Reformulez-la.',
  network: 'Impossible de joindre le fournisseur. Vérifiez votre connexion.',
  invalid_output: 'La réponse du modèle n’est pas une recette exploitable. Réessayez.',
  aborted: 'Génération annulée.',
  other: 'Le fournisseur a renvoyé une erreur.',
}

export class AiError extends Error {
  constructor(
    public readonly kind: AiErrorKind,
    public readonly provider: string,
    public readonly detail?: string,
  ) {
    super(detail ? `${MESSAGES[kind]} (${detail})` : MESSAGES[kind])
    this.name = 'AiError'
  }
}

export function errorFromStatus(status: number, provider: string, detail?: string): AiError {
  if (status === 401 || status === 403) return new AiError('bad_key', provider, detail)
  if (status === 429) return new AiError('quota', provider, detail)
  return new AiError('other', provider, detail ?? `HTTP ${status}`)
}

export function parseJsonOutput(text: string | null | undefined, provider: string): unknown {
  if (!text) throw new AiError('invalid_output', provider, 'empty')
  try {
    return JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch {
        /* ignoré */
      }
    }
    throw new AiError('invalid_output', provider, 'JSON illisible')
  }
}
