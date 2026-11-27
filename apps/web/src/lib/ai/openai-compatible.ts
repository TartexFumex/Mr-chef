import { AiError, errorFromStatus, parseJsonOutput, type GenerateRequest, type ModelInfo } from './types'

/** Appel « chat completions » avec sortie JSON Schema stricte (format commun à OpenAI et Mistral). */
export async function chatCompletionJson(
  url: string,
  headers: Record<string, string>,
  provider: string,
  { model, system, user, schema, signal }: Omit<GenerateRequest, 'apiKey'>,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  let res: Response
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'recette', strict: true, schema } },
      }),
      signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new AiError('aborted', provider)
    throw new AiError('network', provider)
  }
  if (!res.ok) {
    let detail: string | undefined
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string }
      detail = body.error?.message ?? body.message
    } catch {
      /* corps non JSON */
    }
    throw errorFromStatus(res.status, provider, detail)
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[]
  }
  const choice = body.choices?.[0]
  if (choice?.message?.refusal) throw new AiError('refused', provider)
  if (choice?.finish_reason === 'length') throw new AiError('invalid_output', provider, 'truncated')
  return parseJsonOutput(choice?.message?.content, provider)
}

export async function listModelsFrom(
  url: string,
  headers: Record<string, string>,
  provider: string,
  filter: (id: string) => boolean,
  signal?: AbortSignal,
): Promise<ModelInfo[]> {
  let res: Response
  try {
    res = await fetch(url, { headers, signal })
  } catch {
    throw new AiError('network', provider)
  }
  if (!res.ok) throw errorFromStatus(res.status, provider)
  const body = (await res.json()) as { data?: { id: string; name?: string }[] }
  return (body.data ?? [])
    .map((m) => m.id)
    .filter(filter)
    .sort()
    .map((id) => ({ id, label: id }))
}
