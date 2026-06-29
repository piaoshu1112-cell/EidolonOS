/**
 * /api/eidolons — Eidolon (真身 / L2) CRUD
 * ------------------------------------------------------------------
 * An Eidolon is the digital twin of a Prime. POST here "awakens" a
 * new Eidolon: it injects persona, personality, and skills; binds a
 * Vessel (auto-assigned if not specified); and transitions through
 * `awakening` → `active`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbReady } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseJsonArray(raw: unknown): string[] {
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw)
      if (Array.isArray(v)) return v.filter((x) => typeof x === 'string')
    } catch {
      /* fall through */
    }
  }
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string')
  return []
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw)
      if (v && typeof v === 'object') return v as Record<string, unknown>
    } catch {
      /* fall through */
    }
  }
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  return {}
}

export async function GET() {
  try {
    await ensureDbReady()
    const eidolons = await db.eidolon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        prime: true,
        vessel: true,
        _count: { select: { memories: true, conversations: true } },
      },
    })
    return NextResponse.json({ success: true, eidolons })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Eidolon list failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady()
    const body = (await req.json().catch(() => ({}))) as {
      name?: string
      personaPrompt?: string
      personality?: unknown
      skills?: unknown
      primeId?: string
      vesselId?: string
    }
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 },
      )
    }
    if (!body.primeId) {
      return NextResponse.json(
        { success: false, error: 'primeId is required' },
        { status: 400 },
      )
    }
    const prime = await db.prime.findUnique({ where: { id: body.primeId } })
    if (!prime) {
      return NextResponse.json(
        { success: false, error: 'Prime not found' },
        { status: 404 },
      )
    }

    // Auto-assign first idle Vessel if none specified.
    let vesselId = body.vesselId ?? null
    if (!vesselId) {
      const idle = await db.vessel.findFirst({
        where: { status: 'idle' },
        orderBy: { createdAt: 'asc' },
      })
      vesselId = idle?.id ?? null
    } else {
      const exists = await db.vessel.findUnique({ where: { id: vesselId } })
      if (!exists) {
        return NextResponse.json(
          { success: false, error: 'Vessel not found' },
          { status: 404 },
        )
      }
    }

    const personality = parseJsonObject(body.personality)
    const skills = parseJsonArray(body.skills)
    const personaPrompt =
      body.personaPrompt?.trim() ||
      `You are ${body.name}, a digital twin in the Eidolon Matrix.`

    // Awakening → active in one shot (synchronous awakening for the
    // demo; production would hold `awakening` until Vessel readiness
    // probe succeeds).
    const eidolon = await db.eidolon.create({
      data: {
        name: body.name.trim(),
        personaPrompt,
        personality: JSON.stringify(personality),
        skills: JSON.stringify(skills.length > 0 ? skills : ['rag_recall']),
        status: 'active',
        primeId: body.primeId,
        vesselId,
      },
      include: { vessel: true, prime: true },
    })

    if (vesselId) {
      await db.vessel.update({
        where: { id: vesselId },
        data: { status: 'running' },
      })
    }

    return NextResponse.json({ success: true, eidolon }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Eidolon awaken failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
