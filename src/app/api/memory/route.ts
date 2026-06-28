/**
 * /api/memory — Memory Shard Vault Listing
 * ------------------------------------------------------------------
 * Returns the long-term memory shards engraved into an Eidolon's
 * vault. Newest first; metadata is parsed back into an object for
 * the consumer.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseMetadata(raw: string): Record<string, unknown> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function GET(req: NextRequest) {
  try {
    const eidolonId = req.nextUrl.searchParams.get('eidolonId')
    if (!eidolonId) {
      return NextResponse.json(
        { success: false, error: 'eidolonId query param is required' },
        { status: 400 },
      )
    }
    const shards = await db.memoryShard.findMany({
      where: { eidolonId },
      orderBy: { createdAt: 'desc' },
    })
    const parsed = shards.map((s) => ({
      id: s.id,
      eidolonId: s.eidolonId,
      content: s.content,
      source: s.source,
      metadata: parseMetadata(s.metadata),
      embeddingDim: s.embedding ? s.embedding.split(',').length : 0,
      createdAt: s.createdAt,
    }))
    return NextResponse.json({ success: true, shards: parsed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Memory list failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
