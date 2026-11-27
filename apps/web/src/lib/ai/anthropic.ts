import type AnthropicType from '@anthropic-ai/sdk'
import { AiError, errorFromStatus, parseJsonOutput, type RecipeProvider } from './types'

// Le SDK n'est chargé qu'à la première utilisation de Claude, pour alléger le démarrage.
let sdk: Promise<typeof AnthropicType> | null = null
const loadSdk = () => (sdk ??= import('@anthropic-ai/sdk').then((m) => m.default))

async function client(apiKey: string) {
  const Anthropic = await loadSdk()
  // Appel direct depuis le navigateur : la clé reste sur l'appareil de l'utilisateur.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 })
}

async function wrap(e: unknown): Promise<AiError> {
  if (e instanceof AiError) return e
  const Anthropic = await loadSdk()
  if (e instanceof Anthropic.APIUserAbortError) return new AiError('aborted', 'Claude')
  if (e instanceof Anthropic.APIConnectionError) return new AiError('network', 'Claude')
  if (e instanceof Anthropic.APIError) return errorFromStatus(e.status ?? 0, 'Claude', e.message)
  return new AiError('other', 'Claude', e instanceof Error ? e.message : undefined)
}

export const anthropicProvider: RecipeProvider = {
  id: 'anthropic',
  label: 'Claude (Anthropic)',
  keyUrl: 'https://platform.claude.com/settings/keys',
  keyPlaceholder: 'sk-ant-…',
  defaultModels: [
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
    { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
  ],

  async listModels(apiKey, signal) {
    try {
      const page = await (await client(apiKey)).models.list({ limit: 100 }, { signal })
      const models = page.data
        .filter((m) => m.id.startsWith('claude-'))
        .map((m) => ({ id: m.id, label: m.display_name || m.id }))
      return models.length ? models : this.defaultModels
    } catch (e) {
      throw await wrap(e)
    }
  },

  async generate({ apiKey, model, system, user, schema, signal }) {
    try {
      const res = await (await client(apiKey)).beta.messages.create(
        {
          model,
          max_tokens: 16000,
          system,
          messages: [{ role: 'user', content: user }],
          output_config: { format: { type: 'json_schema', schema } },
          // Si le modèle décline, l'API relance la même demande sur un modèle de repli.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        },
        { signal },
      )
      if (res.stop_reason === 'refusal') throw new AiError('refused', 'Claude')
      if (res.stop_reason === 'max_tokens') throw new AiError('invalid_output', 'Claude', 'truncated')
      const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
      return parseJsonOutput(text, 'Claude')
    } catch (e) {
      throw await wrap(e)
    }
  },
}
