/**
 * /api/memory/recall — Memory Recall (RAG retrieval)
 * ------------------------------------------------------------------
 * Embed the query, score all shards of an Eidolon by cosine
 * similarity, return the Top-K. Returns empty array when the
 * Eidolon has no memories yet.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recallMemory } from '@/lib/eidolon/rag-pipeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      eidolonId?: string
      query?: string
      topK?: number
    }
    if (!body.eidolonId) {
      return NextResponse.json(
        { success: false, error: 'eidolonId is required' },
        { status: 400 },
      )
    }
    if (!body.query || body.query.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 },
      )
    }
    const eidolon = await db.eidolon.findUnique({
      where: { id: body.eidolonId },
      select: { id: true },
    })
    if (!eidolon) {
      return NextResponse.json(
        { success: false, error: 'Eidolon not found' },
        { status: 404 },
      )
    }
    const topK =
      typeof body.topK === 'number' && body.topK > 0 ? body.topK : 5
    const shards = await recallMemory(body.eidolonId, body.query, topK)
    return NextResponse.json({ success: true, shards, query: body.query })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Memory recall failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
