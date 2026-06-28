/**
 * llm-router.ts — Model Router / Vessel Streaming Conduit
 * ------------------------------------------------------------------
 * The Vessel is the compute vessel that hosts an Eidolon. This module
 * is the only place where z-ai-web-dev-sdk is invoked. It speaks the
 * streaming chat protocol (SSE) and returns either a raw Web
 * ReadableStream for pass-through SSE consumers, or a fully aggregated
 * string for one-shot callers (AP2 settlement receipts, AA2P external
 * agents, fallback paths).
 *
 * ⚠️ Server-only. Never import this from a Client Component.
 * z-ai-web-dev-sdk MUST stay behind this boundary.
 */
import ZAI from 'z-ai-web-dev-sdk'

export interface VesselMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface VesselCallOpts {
  temperature?: number
  maxTokens?: number
}

/**
 * Lazily-instantiated singleton ZAI client. The SDK reads env vars on
 * create(); we cache the promise so HMR / concurrent calls don't pay
 * repeated init cost.
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
 * Returns the raw Web ReadableStream<Uint8Array> from the SDK so the
 * caller can pump SSE tokens straight to the client (consciousness stream).
 *
 * Returns null if the SDK unexpectedly yields no body — callers should
 * fall back to `completeFromVessel`.
 */
export async function streamFromVessel(
  messages: VesselMessage[],
  opts?: VesselCallOpts,
): Promise<ReadableStream<Uint8Array> | null> {
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
  // SDK contract: when stream:true, the SDK returns `response.body`
  // from the underlying fetch — i.e. the ReadableStream itself (NOT
  // an object wrapping it). We handle both shapes defensively.
  if (response instanceof ReadableStream) {
    return response
  }
  const streamBody = (response as { body?: ReadableStream<Uint8Array> | null }).body
  return streamBody ?? null
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
 * single string. Used by AA2P (one-shot agents) and as a safety net
 * for the consciousness stream when `streamFromVessel` returns null.
 */
export async function completeFromVessel(
  messages: VesselMessage[],
  opts?: VesselCallOpts,
): Promise<string> {
  const stream = await streamFromVessel(messages, opts)
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
