/**
 * /api/quest — Quest (Growth-Hack Task) CRUD
 * ------------------------------------------------------------------
 * Simple CRUD for the Quest system. Quests are growth-hack directives
 * that reward Primes with points for bind_wallet, leave_email, invite,
 * converse, etc. — keeps the EidolonOS economy circulating.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbReady } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureDbReady()
    const quests = await db.quest.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, quests })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Quest list failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady()
    const body = (await req.json().catch(() => ({}))) as {
      title?: string
      description?: string
      reward?: number
      type?: string
      targetCount?: number
    }
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'title is required' },
        { status: 400 },
      )
    }
    if (typeof body.reward !== 'number' || body.reward < 0) {
      return NextResponse.json(
        { success: false, error: 'reward (number >= 0) is required' },
        { status: 400 },
      )
    }
    if (!body.type || body.type.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'type is required' },
        { status: 400 },
      )
    }
    const quest = await db.quest.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() ?? '',
        reward: body.reward,
        type: body.type.trim(),
        targetCount:
          typeof body.targetCount === 'number' && body.targetCount > 0
            ? body.targetCount
            : 1,
      },
    })
    return NextResponse.json({ success: true, quest }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Quest create failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
