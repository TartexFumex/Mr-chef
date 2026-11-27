import { chatCompletionJson, listModelsFrom } from './openai-compatible'
import type { RecipeProvider } from './types'

export const openaiProvider: RecipeProvider = {
  id: 'openai',
  label: 'OpenAI (GPT)',
  keyUrl: 'https://platform.openai.com/api-keys',
  keyPlaceholder: 'sk-…',
  defaultModels: [{ id: 'gpt-4o', label: 'gpt-4o' }],

  async listModels(apiKey, signal) {
    const models = await listModelsFrom(
      'https://api.openai.com/v1/models',
      { authorization: `Bearer ${apiKey}` },
      'OpenAI',
      (id) => /^(gpt-|o\d|chatgpt-)/.test(id) && !/(audio|realtime|transcribe|tts|image|search|instruct)/.test(id),
      signal,
    )
    return models.length ? models : this.defaultModels
  },

  generate({ apiKey, ...req }) {
    return chatCompletionJson('https://api.openai.com/v1/chat/completions', { authorization: `Bearer ${apiKey}` }, 'OpenAI', req)
  },
}
