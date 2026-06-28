/**
 * /api/dashboard — Aggregated Eidolon Matrix Console Stats
 * ------------------------------------------------------------------
 * Single GET that returns everything the holographic console needs to
 * render its system-status panel: counts, vessel usage breakdown,
 * recent ledgers, eidolon status distribution, total token usage.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureDbReady } from '@/lib/eidolon/db-init'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EIDOLON_STATUSES = ['dormant', 'awakening', 'active', 'sealed']

export async function GET() {
  try {
    await ensureDbReady()
    const [
      primeCount,
      eidolonCount,
      vesselCount,
      memoryShardCount,
      vessels,
      eidolons,
      recentLedgers,
      totalTokensAgg,
    ] = await Promise.all([
      db.prime.count(),
      db.eidolon.count(),
      db.vessel.count(),
      db.memoryShard.count(),
      db.vessel.findMany({
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { eidolons: true } } },
      }),
      db.eidolon.findMany({ select: { status: true } }),
      db.ledger.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { prime: { select: { displayName: true } } },
      }),
      db.vessel.aggregate({ _sum: { tokensUsed: true } }),
    ])

    const vesselBreakdown = vessels.map((v) => {
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
        eidolonCount: v._count.eidolons,
      }
    })

    const eidolonsByStatus: Record<string, number> = {}
    for (const s of EIDOLON_STATUSES) eidolonsByStatus[s] = 0
    for (const e of eidolons) {
      const s = EIDOLON_STATUSES.includes(e.status) ? e.status : 'dormant'
      eidolonsByStatus[s] += 1
    }

    return NextResponse.json({
      success: true,
      systemStatus: 'ONLINE',
      counts: {
        primes: primeCount,
        eidolons: eidolonCount,
        vessels: vesselCount,
        memoryShards: memoryShardCount,
      },
      vessels: vesselBreakdown,
      totalTokensUsed: totalTokensAgg._sum.tokensUsed ?? 0,
      eidolonsByStatus,
      recentLedgers,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Dashboard load failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
