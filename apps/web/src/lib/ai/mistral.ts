import { chatCompletionJson, listModelsFrom } from './openai-compatible'
import { AiError, type RecipeProvider } from './types'
import { relayConfig } from '../mc'

const API = 'https://api.mistral.ai/v1/chat/completions'

/**
 * Mistral est appelé directement. Si le navigateur bloque l'appel (CORS), Mr Chef
 * repasse par le relais personnel (route /ai/mistral), sans changement pour l'utilisateur.
 */
export const mistralProvider: RecipeProvider = {
  id: 'mistral',
  label: 'Mistral AI',
  keyUrl: 'https://console.mistral.ai/api-keys',
  keyPlaceholder: 'Clé Mistral',
  defaultModels: [
    { id: 'mistral-large-latest', label: 'Mistral Large' },
    { id: 'mistral-medium-latest', label: 'Mistral Medium' },
    { id: 'mistral-small-latest', label: 'Mistral Small' },
    { id: 'open-mixtral-8x22b', label: 'Mixtral 8x22B' },
  ],

  async listModels(apiKey, signal) {
    try {
      const models = await listModelsFrom(
        'https://api.mistral.ai/v1/models',
        { authorization: `Bearer ${apiKey}` },
        'Mistral',
        (id) => /^(mistral|open-mi|mixtral|magistral|ministral)/.test(id) && !/(embed|ocr|moderation)/.test(id),
        signal,
      )
      return models.length ? models : this.defaultModels
    } catch (e) {
      if (e instanceof AiError && e.kind === 'network') return this.defaultModels
      throw e
    }
  },

  async generate({ apiKey, ...req }) {
    try {
      return await chatCompletionJson(API, { authorization: `Bearer ${apiKey}` }, 'Mistral', req)
    } catch (e) {
      if (!(e instanceof AiError) || e.kind !== 'network') throw e
      const relay = await relayConfig()
      if (!relay) throw e
      return chatCompletionJson(
        `${relay.url.replace(/\/+$/, '')}/ai/mistral`,
        { 'x-ai-key': apiKey, ...(relay.secret ? { 'x-relay-secret': relay.secret } : {}) },
        'Mistral',
        req,
      )
    }
  },
}
