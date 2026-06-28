/**
 * /api/aa2p/settle — AP2 Async Settlement Trigger
 * ------------------------------------------------------------------
 * Triggers batch on-chain settlement of pending AP2 ledger entries.
 * If `threshold` is provided and the pending count is below it, this
 * is a no-op (BudgetFence not yet tripped). If threshold is 0 or
 * omitted, force-settles all pending entries.
 */
import { NextRequest, NextResponse } from 'next/server'
import { settlePending } from '@/lib/eidolon/ap2-settlement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      threshold?: number
    }
    const threshold =
      typeof body.threshold === 'number' && body.threshold >= 0
        ? body.threshold
        : 5
    const result = await settlePending(threshold)
    return NextResponse.json({
      success: true,
      settled: result.settled,
      txHash: result.txHash,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AP2 settle failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
