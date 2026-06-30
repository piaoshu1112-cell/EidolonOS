/**
 * llm-router.ts — Model Router / Vessel Streaming Conduit
 * ------------------------------------------------------------------
 * The Vessel is the compute vessel that hosts an Eidolon. This module
 * is the only place where LLM APIs are invoked. It speaks the
 * streaming chat protocol (SSE) and returns either a raw Web
 * ReadableStream for pass-through SSE consumers, or a fully aggregated
 * string for one-shot callers (AP2 settlement receipts, AA2P external
 * agents, fallback paths).
 *
 * TRIAGE PROVIDER STRATEGY (in priority order):
 * 1. Per-request `providerConfig` (sent from the browser via x-llm-*
 *    headers — API key stored in user's localStorage). OpenAI-compatible
 *    path is used with the supplied key + resolved baseUrl/model.
 * 2. Server env `OPENAI_API_KEY` (Vercel deployment). OpenAI-compatible
 *    path with OPENAI_BASE_URL / OPENAI_MODEL overrides.
 * 3. Otherwise: z-ai-web-dev-sdk sandbox path (Z.ai dev sandbox).
 *
 * ⚠️ Server-only. Never import this from a Client Component.
 */
import ZAI from 'z-ai-web-dev-sdk'
import './zai-bootstrap' // side-effect: synthesizes .z-ai-config from env vars
import {
  getProviderById,
  getDefaultModelId,
} from './model-providers'

export interface VesselMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface VesselCallOpts {
  temperature?: number
  maxTokens?: number
}

/**
 * Per-request provider configuration. Populated from x-llm-* HTTP
 * headers (set by the frontend from localStorage). All fields are
 * optional — when unset, the router falls back to env / sandbox.
 */
export interface ProviderConfig {
  /** Provider id (matches MODEL_PROVIDERS[].id). */
  provider?: string
  /** API key for the chosen provider. */
  apiKey?: string
  /** Override the provider's default base URL. */
  baseUrl?: string
  /** Override the provider's default model id. */
  model?: string
}

/**
 * Detect which LLM provider to use, given a per-request config.
 *
 * Resolution order:
 *   1. providerConfig.apiKey  → 'openai-compatible' (user-supplied)
 *   2. process.env.OPENAI_API_KEY → 'openai-compatible' (Vercel env)
 *   3. otherwise → 'zai' (sandbox SDK path)
 *
 * The first two both go through streamOpenAICompatible(); they only
 * differ in where baseUrl/apiKey/model are sourced from.
 */
function getProvider(
  cfg?: ProviderConfig,
): 'zai' | 'openai-compatible' {
  // Per-request API key wins (user pasted one in the frontend).
  if (cfg?.apiKey) return 'openai-compatible'
  // Vercel/external OpenAI-compatible env vars.
  if (process.env.OPENAI_API_KEY) return 'openai-compatible'
  // Z.ai dev sandbox.
  return 'zai'
}

/**
 * Lazily-instantiated singleton ZAI client.
 */
type ZAIClient = Awaited<ReturnType<typeof ZAI.create>>
let zaiPromise: Promise<ZAIClient> | null = null
async function getZAI(): Promise<ZAIClient> {
  if (!zaiPromise) {
    zaiPromise = ZAI.create()
  }
  return zaiPromise
}

/**
 * Open a streaming chat completion against the bound Vessel (LLM).
 * Returns the raw Web ReadableStream<Uint8Array> so the caller can pump
 * SSE tokens straight to the client (consciousness stream).
 *
 * Returns null if the provider yields no body — callers should fall
 * back to `completeFromVessel`.
 */
export async function streamFromVessel(
  messages: VesselMessage[],
  opts?: VesselCallOpts,
  providerConfig?: ProviderConfig,
): Promise<ReadableStream<Uint8Array> | null> {
  const provider = getProvider(providerConfig)

  if (provider === 'openai-compatible') {
    return streamOpenAICompatible(messages, opts, providerConfig)
  }

  // Z.ai sandbox path
  const zai = await getZAI()
  const body: Record<string, unknown> = {
    messages,
    stream: true,
    thinking: { type: 'disabled' },
  }
  if (opts?.temperature !== undefined) body.temperature = opts.temperature
  if (opts?.maxTokens !== undefined) body.max_tokens = opts.maxTokens
  const response = await zai.chat.completions.create(
    body as Parameters<typeof zai.chat.completions.create>[0],
  )
  if (response instanceof ReadableStream) {
    return response
  }
  const streamBody = (response as { body?: ReadableStream<Uint8Array> | null }).body
  return streamBody ?? null
}

/**
 * OpenAI-compatible streaming. Works with OpenAI, Azure OpenAI, Together,
 * Groq, OpenRouter, Gemini's OpenAI shim, Cerebras, z.ai public API, etc.
 *
 * Endpoint config resolution (highest priority first):
 *   - explicit providerConfig override (apiKey/baseUrl/model)
 *   - server env OPENAI_* vars
 */
async function streamOpenAICompatible(
  messages: VesselMessage[],
  opts?: VesselCallOpts,
  cfg?: ProviderConfig,
): Promise<ReadableStream<Uint8Array> | null> {
  // Resolve baseUrl
  let baseUrl: string
  let apiKey: string
  let model: string

  if (cfg?.apiKey) {
    // Per-request config from x-llm-* headers.
    const provider = cfg.provider ? getProviderById(cfg.provider) : undefined
    baseUrl =
      cfg.baseUrl ||
      provider?.baseUrl ||
      process.env.OPENAI_BASE_URL ||
      'https://api.openai.com/v1'
    apiKey = cfg.apiKey
    // Model: explicit override → provider's default free model → env default.
    model =
      cfg.model ||
      (provider ? getDefaultModelId(provider) : '') ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini'
  } else {
    // Env-based (Vercel) path.
    baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    apiKey = process.env.OPENAI_API_KEY!
    model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
  }
  if (opts?.temperature !== undefined) body.temperature = opts.temperature
  if (opts?.maxTokens !== undefined) body.max_tokens = opts.maxTokens

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`LLM API ${response.status}: ${text.slice(0, 200)}`)
  }

  return response.body as ReadableStream<Uint8Array>
}

/**
 * Robust SSE line parser. Handles the case where a single `read()`
 * returns a chunk that ends mid-line — we buffer the remainder across
 * invocations. Closes over an internal buffer; returns a list of
 * complete `\n`-terminated lines parsed from the chunk.
 */
export function createSseLineParser(): {
  feed: (chunk: string) => string[]
  flush: () => string[]
} {
  let buffer = ''
  return {
    feed(chunk: string): string[] {
      buffer += chunk
      const lines: string[] = []
      let idx = buffer.indexOf('\n')
      while (idx !== -1) {
        const raw = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        // Per SSE spec, strip a single trailing \r if present.
        lines.push(raw.endsWith('\r') ? raw.slice(0, -1) : raw)
        idx = buffer.indexOf('\n')
      }
      return lines
    },
    flush(): string[] {
      if (buffer.length === 0) return []
      const tail = buffer
      buffer = ''
      return [tail]
    },
  }
}

/**
 * Extract a content delta from a single SSE `data:` payload string.
 * Returns the delta text (possibly empty string), or null if the line
 * is not a JSON data line (e.g. `[DONE]`, comments, events).
 */
export function parseSseDataLine(line: string): string | null {
  if (!line.startsWith('data:')) return null
  const payload = line.slice(5).trim()
  if (payload === '') return null
  if (payload === '[DONE]') return null
  try {
    const obj = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string } }>
    }
    const content = obj.choices?.[0]?.delta?.content
    return typeof content === 'string' ? content : ''
  } catch {
    // Malformed JSON — ignore; SSE streams occasionally emit heartbeat
    // comments or partial frames that we tolerate.
    return ''
  }
}

/**
 * Non-streaming fallback: aggregates a streamed completion into a
 * single string. Used by AA2P (one-shot agents), the /api/translate
 * endpoint, and as a safety net for the consciousness stream when
 * `streamFromVessel` returns null.
 */
export async function completeFromVessel(
  messages: VesselMessage[],
  opts?: VesselCallOpts,
  providerConfig?: ProviderConfig,
): Promise<string> {
  const stream = await streamFromVessel(messages, opts, providerConfig)
  if (!stream) {
    // The SDK failed to produce a stream — there is no non-stream
    // surface in this SDK variant, so we surface an empty reply.
    return ''
  }
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  const parser = createSseLineParser()
  let aggregated = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (!value) continue
    const text = decoder.decode(value, { stream: true })
    for (const line of parser.feed(text)) {
      const delta = parseSseDataLine(line)
      if (delta) aggregated += delta
    }
  }
  const tail = decoder.decode()
  if (tail) {
    for (const line of parser.feed(tail)) {
      const delta = parseSseDataLine(line)
      if (delta) aggregated += delta
    }
  }
  for (const line of parser.flush()) {
    const delta = parseSseDataLine(line)
    if (delta) aggregated += delta
  }
  return aggregated
}

/**
 * Rough token counter — there is no public tokenizer here, so we use
 * the empirical ~4-chars-per-token heuristic. Good enough for Vessel
 * quota tracking and TDPO value evaluation.
 */
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Extract ProviderConfig from incoming HTTP request headers.
 *
 * Frontend contract (all headers optional, all lowercase per HTTP/1.1):
 *   x-llm-provider:  groq|openrouter|gemini|together|cerebras|openai|zai
 *   x-llm-api-key:   <key>
 *   x-llm-base-url:  <url>   (optional override)
 *   x-llm-model:     <model id>  (optional override)
 *
 * Returns an object with `undefined` for any missing header so the
 * downstream `getProvider()` can cleanly fall through to env / sandbox.
 */
export function resolveProviderConfig(headers: Headers): ProviderConfig {
  return {
    provider: headers.get('x-llm-provider') || undefined,
    apiKey: headers.get('x-llm-api-key') || undefined,
    baseUrl: headers.get('x-llm-base-url') || undefined,
    model: headers.get('x-llm-model') || undefined,
  }
}
