/**
 * /api/aa2p/converse — AA2P Cross-Dimensional Converse (TDPO-guarded)
 * ------------------------------------------------------------------
 * The external-agent entry point. Unlike the SSE consciousness stream
 * (which is for the Prime's own UI), AA2P returns a single aggregated
 * JSON response — external agents want one-shot semantics, not a
 * stream they'd have to drain.
 *
 * Pipeline:
 *   1. Resolve agentWallet (x-agent-wallet header → body → 'anonymous')
 *   2. TDPO guard (injection regex + concurrency backpressure)
 *   3. Recall memory + build consciousness prompt
 *   4. completeFromVessel (one-shot, internally aggregates the stream)
 *   5. Persist Message rows + Vessel quota bump
 *   6. Record AP2 Ledger entry (cognitive value via evaluateServiceValue)
 *   7. adjustReputation(+1) on success
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbReady } from '@/lib/db'
import { recallMemory } from '@/lib/eidolon/rag-pipeline'
import { buildConsciousnessPrompt } from '@/lib/eidolon/consciousness-stream'
import {
  completeFromVessel,
  countTokens,
} from '@/lib/eidolon/llm-router'
import {
  tdpoGuard,
  release,
  sleep,
  adjustReputation,
} from '@/lib/eidolon/tdpo-firewall'
import {
  recordLedger,
  evaluateServiceValue,
} from '@/lib/eidolon/ap2-settlement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: {
    primeId?: string
    eidolonId?: string
    message?: string
    agentWallet?: string
  }
  try {
    await ensureDbReady()
    body = (await req.json().catch(() => ({}))) as typeof body
  } catch {
    body = {}
  }

  const agentWallet =
    req.headers.get('x-agent-wallet') ||
    body.agentWallet ||
    'anonymous'

  // [1] TDPO cognitive firewall.
  const verdict = await tdpoGuard({ agentWallet, body })
  if (!verdict.allowed) {
    return NextResponse.json(
      { success: false, error: verdict.reason ?? 'TDPO blocked' },
      { status: verdict.status ?? 403 },
    )
  }
  if (verdict.delayMs && verdict.delayMs > 0) {
    await sleep(verdict.delayMs)
  }

  try {
    if (!body.eidolonId || !body.primeId || !body.message) {
      release(agentWallet)
      return NextResponse.json(
        {
          success: false,
          error: 'eidolonId, primeId, and message are required',
        },
        { status: 400 },
      )
    }
    const eidolon = await db.eidolon.findUnique({
      where: { id: body.eidolonId },
      include: { vessel: true, prime: true },
    })
    if (!eidolon) {
      release(agentWallet)
      return NextResponse.json(
        { success: false, error: 'Eidolon not found' },
        { status: 404 },
      )
    }
    if (!eidolon.vessel) {
      release(agentWallet)
      return NextResponse.json(
        { success: false, error: 'No vessel bound' },
        { status: 400 },
      )
    }
    const prime = await db.prime.findUnique({
      where: { id: body.primeId },
    })
    if (!prime) {
      release(agentWallet)
      return NextResponse.json(
        { success: false, error: 'Prime not found' },
        { status: 404 },
      )
    }

    // [2] Recall memory.
    const shards = await recallMemory(eidolon.id, body.message, 5)

    // [3] Find or create AA2P conversation; load last 6 turns.
    let conversation = await db.conversation.findFirst({
      where: {
        primeId: body.primeId,
        eidolonId: eidolon.id,
        channel: 'aa2p',
      },
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 6 } },
    })
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          primeId: body.primeId,
          eidolonId: eidolon.id,
          channel: 'aa2p',
        },
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
      message: body.message,
    })

    // [4] One-shot Vessel completion.
    const response = await completeFromVessel(promptChain, {
      temperature: eidolon.vessel.temperature,
      maxTokens: eidolon.vessel.maxTokens,
    })

    // [5] Persist Message rows + bump Vessel quota.
    const tokensIn = countTokens(body.message)
    const tokensOut = countTokens(response)
    await db.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: 'prime',
          content: body.message,
          tokensIn,
          tokensOut: 0,
        },
        {
          conversationId: conversation.id,
          role: 'eidolon',
          content: response,
          tokensIn: 0,
          tokensOut,
        },
      ],
    })
    await db.vessel.update({
      where: { id: eidolon.vessel.id },
      data: { tokensUsed: { increment: tokensOut } },
    })

    // [6] Record AP2 ledger entry.
    const cognitiveValue = await evaluateServiceValue({
      messageLength: body.message.length,
      responseLength: response.length,
    })
    const ledgerId = await recordLedger({
      primeId: body.primeId,
      agentWallet,
      cognitiveValue,
    })

    // [7] Reward the agent for a clean interaction.
    adjustReputation(agentWallet, +1)

    return NextResponse.json({
      success: true,
      response,
      tokensOut,
      ledgerId,
      vesselId: eidolon.vessel.id,
      cognitiveValue,
    })
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'AA2P converse failure'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  } finally {
    release(agentWallet)
  }
}
