import {
  AiRecipeSchema,
  aiToRecipe,
  buildAiJsonSchema,
  buildRevisionPrompt,
  buildUserPrompt,
  carryRemoteIds,
  defaultSystemPrompt,
  getRobot,
  recipeToAi,
  renderSystemPrompt,
  type Locale,
  type Fix,
  type Recipe,
  type RobotId,
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

type AiOpts = {
  provider?: ProviderId
  signal?: AbortSignal
  lang?: Locale
  /** Robot visé ; par défaut celui des Paramètres. */
  robotId?: RobotId
}

/** Appelle le fournisseur actif avec le prompt système du robot configuré et valide la recette reçue. */
async function runModel(user: string, opts: AiOpts): Promise<GenerationResult> {
  const settings = await getSettings()
  const lang = opts.lang ?? 'fr'
  const providerId = opts.provider ?? settings.activeProvider
  if (!providerId) throw new AiError('bad_key', 'AI')
  const provider = PROVIDERS[providerId]
  const apiKey = await getSecret(`ai:${providerId}`)
  if (!apiKey) throw new AiError('bad_key', provider.label)
  const model = settings.models[providerId] ?? provider.defaultModels[0]!.id
  const robot = getRobot(opts.robotId ?? settings.robotId)

  const raw = await provider.generate({
    apiKey,
    model,
    system: renderSystemPrompt(settings.systemPrompt ?? defaultSystemPrompt(lang), robot, lang),
    user,
    schema: buildAiJsonSchema(robot),
    signal: opts.signal,
  })
  const parsed = AiRecipeSchema.safeParse(raw)
  if (!parsed.success) throw new AiError('invalid_output', provider.label)
  const { recipe, fixes } = aiToRecipe(parsed.data, robot)
  return { recipe, fixes, provider: providerId, model }
}

/** Génère une recette pour le robot configuré, avec le fournisseur et le modèle actifs. */
export function generateRecipe(wish: string, servings: number, opts: AiOpts = {}): Promise<GenerationResult> {
  return runModel(buildUserPrompt(wish, servings, opts.lang ?? 'fr'), opts)
}

/**
 * Propose une nouvelle version d'une recette existante : le modèle reçoit la recette
 * actuelle et la modification demandée. Rien n'est enregistré ici ; les identifiants
 * distants de l'ancienne version sont reportés pour une mise à jour sur place.
 */
export async function reviseRecipe(current: Recipe, request: string, opts: AiOpts = {}): Promise<GenerationResult> {
  const res = await runModel(buildRevisionPrompt(recipeToAi(current), request, opts.lang ?? 'fr'), opts)
  return { ...res, recipe: carryRemoteIds(res.recipe, current) }
}
