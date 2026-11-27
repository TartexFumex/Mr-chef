import {
  AiRecipeSchema,
  aiToRecipe,
  buildAiJsonSchema,
  buildUserPrompt,
  DEFAULT_SYSTEM_PROMPT,
  getRobot,
  renderSystemPrompt,
  type Fix,
  type Recipe,
} from '@mr-chef/recipe-schema'
import type { ProviderId } from '../../db/db'
import { getSettings } from '../settings'
import { getSecret } from '../vault'
import { anthropicProvider } from './anthropic'
import { mistralProvider } from './mistral'
import { openaiProvider } from './openai'
import { AiError, type RecipeProvider } from './types'

export * from './types'

export const PROVIDERS: Record<ProviderId, RecipeProvider> = {
  mistral: mistralProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
}
export const PROVIDER_ORDER: ProviderId[] = ['mistral', 'openai', 'anthropic']

export interface GenerationResult {
  recipe: Recipe
  fixes: Fix[]
  provider: ProviderId
  model: string
}

/** Génère une recette pour le robot configuré, avec le fournisseur et le modèle actifs. */
export async function generateRecipe(
  wish: string,
  servings: number,
  opts: { provider?: ProviderId; signal?: AbortSignal } = {},
): Promise<GenerationResult> {
  const settings = await getSettings()
  const providerId = opts.provider ?? settings.activeProvider
  if (!providerId) throw new AiError('bad_key', 'IA', 'aucun fournisseur configuré')
  const provider = PROVIDERS[providerId]
  const apiKey = await getSecret(`ai:${providerId}`)
  if (!apiKey) throw new AiError('bad_key', provider.label, 'clé absente')
  const model = settings.models[providerId] ?? provider.defaultModels[0]!.id
  const robot = getRobot(settings.robotId)

  const raw = await provider.generate({
    apiKey,
    model,
    system: renderSystemPrompt(settings.systemPrompt ?? DEFAULT_SYSTEM_PROMPT, robot),
    user: buildUserPrompt(wish, servings),
    schema: buildAiJsonSchema(robot),
    signal: opts.signal,
  })
  const parsed = AiRecipeSchema.safeParse(raw)
  if (!parsed.success) throw new AiError('invalid_output', provider.label)
  const { recipe, fixes } = aiToRecipe(parsed.data, robot)
  return { recipe, fixes, provider: providerId, model }
}
