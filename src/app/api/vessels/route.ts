/**
 * /api/vessels — Vessel (容器 / L3) CRUD
 * ------------------------------------------------------------------
 * A Vessel is the compute environment hosting an Eidolon — its model
 * route, API quota, sampling temperature, and live token usage. GET
 * returns usage breakdown; POST deploys a new Vessel.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbReady } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureDbReady()
    const vessels = await db.vessel.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { eidolons: true } } },
    })
    const breakdown = vessels.map((v) => {
      const usagePercent =
        v.apiQuota > 0 ? Math.min(100, (v.tokensUsed / v.apiQuota) * 100) : 0
      return {
        id: v.id,
        codename: v.codename,
        modelRoute: v.modelRoute,
        apiQuota: v.apiQuota,
        tokensUsed: v.tokensUsed,
        usagePercent: Math.round(usagePercent * 100) / 100,
        status: v.status,
        temperature: v.temperature,
        maxTokens: v.maxTokens,
        eidolonCount: v._count.eidolons,
        createdAt: v.createdAt,
      }
    })
    const totalTokensUsed = vessels.reduce((s, v) => s + v.tokensUsed, 0)
    return NextResponse.json({
      success: true,
      vessels: breakdown,
      totalTokensUsed,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Vessel list failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady()
    const body = (await req.json().catch(() => ({}))) as {
      codename?: string
      modelRoute?: string
      apiQuota?: number
      temperature?: number
      maxTokens?: number
    }
    if (!body.codename || body.codename.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'codename is required' },
        { status: 400 },
      )
    }
    const vessel = await db.vessel.create({
      data: {
        codename: body.codename.trim(),
        modelRoute: body.modelRoute?.trim() || 'glm-4.6',
        apiQuota:
          typeof body.apiQuota === 'number' && body.apiQuota > 0
            ? body.apiQuota
            : 100000,
        temperature:
          typeof body.temperature === 'number' ? body.temperature : 0.7,
        maxTokens:
          typeof body.maxTokens === 'number' && body.maxTokens > 0
            ? body.maxTokens
            : 2048,
        status: 'idle',
      },
    })
    return NextResponse.json({ success: true, vessel }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Vessel deploy failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
