/**
 * /api/eidolons/[id]/converse — 🌟 SSE Consciousness Stream
 * ------------------------------------------------------------------
 * The heart of EidolonOS. The Prime sends a directive; the Eidolon
 * recalls memory, builds its consciousness prompt, opens a streaming
 * Vessel completion, and emits tokens back over SSE — the "意识流".
 *
 * SSE contract:
 *   event: consciousness-stream
 *   data: {"type":"memory","shards":N}
 *   data: {"type":"token","content":"..."}
 *   data: {"type":"done","tokensOut":N,"vesselId":"..."}
 *   data: {"type":"error","message":"..."}
 */
import { NextRequest } from 'next/server'
import { db, ensureDbReady } from '@/lib/db'
import { recallMemory } from '@/lib/eidolon/rag-pipeline'
import { buildConsciousnessPrompt } from '@/lib/eidolon/consciousness-stream'
import {
  streamFromVessel,
  completeFromVessel,
  countTokens,
  createSseLineParser,
  parseSseDataLine,
  resolveProviderConfig,
} from '@/lib/eidolon/llm-router'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: eidolonId } = await ctx.params
  // Ensure DB exists BEFORE anything else (Vercel ephemeral filesystem).
  await ensureDbReady()
  // Resolve per-request LLM provider (from x-llm-* headers set by the
  // frontend). Falls through to env / sandbox if absent.
  const providerConfig = resolveProviderConfig(req.headers)
  let body: { primeId?: string; message?: string; channel?: string }
  try {
    body = (await req.json().catch(() => ({}))) as typeof body
  } catch {
    body = {}
  }
  const primeId = body.primeId
  const message = body.message ?? ''
  const channel = body.channel ?? 'web'

  if (!primeId) {
    return new Response(JSON.stringify({ error: 'primeId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!message) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let eidolon = await db.eidolon.findUnique({
    where: { id: eidolonId },
    include: { vessel: true, prime: true },
  })

  // Vercel fallback: each serverless instance has its own ephemeral DB with
  // freshly-seeded UUIDs. If the requested ID doesn't exist in THIS instance,
  // fall back to the first available Eidolon (always 'Echo-01' after seed).
  if (!eidolon) {
    eidolon = await db.eidolon.findFirst({
      where: { status: 'active' },
      include: { vessel: true, prime: true },
    })
  }
  if (!eidolon) {
    return new Response(JSON.stringify({ error: 'Eidolon not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!eidolon.vessel) {
    return new Response(JSON.stringify({ error: 'No vessel bound' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // Capture the vessel into a narrowed const so TypeScript keeps the
  // non-null narrowing alive inside the ReadableStream closure.
  const vessel = eidolon.vessel
  // Use the eidolon's actual primeId (from DB) — on Vercel the request
  // primeId may belong to a different ephemeral instance.
  const effectivePrimeId = eidolon.primeId || primeId

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (data: Record<string, unknown>) => {
        const frame = `event: consciousness-stream\ndata: ${JSON.stringify(data)}\n\n`
        try {
          controller.enqueue(encoder.encode(frame))
        } catch {
          /* controller already closed */
        }
      }
      try {
        // [a] Recall long-term memory shards.
        const shards = await recallMemory(eidolon.id, message, 5)
        emit({ type: 'memory', shards: shards.length })

        // [b] Find or create the (prime, eidolon, channel) conversation
        // and pull the last 6 turns for the consciousness prompt.
        let conversation = await db.conversation.findFirst({
          where: { primeId: effectivePrimeId, eidolonId: eidolon.id, channel },
          orderBy: { createdAt: 'desc' },
          include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 6 },
          },
        })
        if (!conversation) {
          conversation = await db.conversation.create({
            data: { primeId: effectivePrimeId, eidolonId: eidolon.id, channel },
            include: { messages: true },
          })
        }
        const history = conversation.messages
          .slice()
          .reverse()
          .map((m) => ({ role: m.role, content: m.content }))

        const personality = JSON.parse(eidolon.personality || '{}')
        const promptChain = buildConsciousnessPrompt({
          personaPrompt: eidolon.personaPrompt,
          personality,
          memories: shards.map((s) => ({
            id: s.id,
            content: s.content,
            similarity: s.similarity,
            source: s.source,
          })),
          history,
          message,
        })

        // [c] Open the Vessel stream.
        const vesselStream = await streamFromVessel(
          promptChain,
          {
            temperature: vessel.temperature,
            maxTokens: vessel.maxTokens,
          },
          providerConfig,
        )

        let fullText = ''
        if (vesselStream) {
          const reader = vesselStream.getReader()
          const decoder = new TextDecoder('utf-8')
          const parser = createSseLineParser()
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (!value) continue
            const text = decoder.decode(value, { stream: true })
            for (const line of parser.feed(text)) {
              const delta = parseSseDataLine(line)
              if (delta) {
                fullText += delta
                emit({ type: 'token', content: delta })
              }
            }
          }
          // Flush any trailing bytes + buffered partial line.
          const tail = decoder.decode()
          if (tail) {
            for (const line of parser.feed(tail)) {
              const delta = parseSseDataLine(line)
              if (delta) {
                fullText += delta
                emit({ type: 'token', content: delta })
              }
            }
          }
          for (const line of parser.flush()) {
            const delta = parseSseDataLine(line)
            if (delta) {
              fullText += delta
              emit({ type: 'token', content: delta })
            }
          }
        } else {
          // Fallback path: Vessel gave no stream — aggregate one-shot.
          fullText = await completeFromVessel(
            promptChain,
            {
              temperature: vessel.temperature,
              maxTokens: vessel.maxTokens,
            },
            providerConfig,
          )
          if (fullText) emit({ type: 'token', content: fullText })
        }

        // [e] Persist Message rows + update Vessel quota.
        const tokensIn = countTokens(message)
        const tokensOut = countTokens(fullText)
        await db.message.createMany({
          data: [
            {
              conversationId: conversation.id,
              role: 'prime',
              content: message,
              tokensIn,
              tokensOut: 0,
            },
            {
              conversationId: conversation.id,
              role: 'eidolon',
              content: fullText,
              tokensIn: 0,
              tokensOut,
            },
          ],
        })
        await db.vessel.update({
          where: { id: vessel.id },
          data: { tokensUsed: { increment: tokensOut } },
        })

        emit({ type: 'done', tokensOut, vesselId: vessel.id })
        controller.close()
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Consciousness stream failure'
        emit({ type: 'error', message: msg })
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
