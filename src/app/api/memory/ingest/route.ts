/**
 * /api/memory/ingest — 🧠 Memory Engraving
 * ------------------------------------------------------------------
 * Engrave long-term memory into an Eidolon's vault. Splits text into
 * chunks, embeds each chunk (TF-hash → 256-dim L2-normalized), and
 * persists MemoryShard rows. The Eidolon will recall these shards
 * on subsequent converse calls via cosine similarity.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbReady } from '@/lib/db'
import { engraveMemory } from '@/lib/eidolon/rag-pipeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady()
    const body = (await req.json().catch(() => ({}))) as {
      eidolonId?: string
      text?: string
      source?: string
      metadata?: Record<string, unknown>
    }
    if (!body.eidolonId) {
      return NextResponse.json(
        { success: false, error: 'eidolonId is required' },
        { status: 400 },
      )
    }
    if (!body.text || body.text.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'text is required' },
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
    const chunks = await engraveMemory(
      body.eidolonId,
      body.text,
      body.source ?? 'manual',
      body.metadata ?? {},
    )
    return NextResponse.json(
      { success: true, chunks, eidolonId: body.eidolonId },
      { status: 201 },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Memory ingest failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
