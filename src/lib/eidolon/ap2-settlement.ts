/**
 * ap2-settlement.ts — AP2 (Avatar Payments Protocol) Async Settlement
 * ------------------------------------------------------------------
 * The AP2 protocol is the "law" of EidolonOS: it governs value flows
 * between Primes and Eidolons / external agents. The pattern is a
 * state channel — high-frequency micro-interactions are recorded
 * off-chain in the Ledger table, then batch-settled on-chain when the
 * pending count crosses a threshold (or when an explicit settle call
 * arrives). This keeps the cognitive layer millisecond-fast while the
 * chain only sees periodic settlement transactions.
 *
 * The on-chain half is mocked here (a deterministic-looking txHash)
 * because the sandbox has no chain connectivity. The contract is real:
 * replace `settlePending` internals with a real wallet call in prod.
 */
import { db } from '@/lib/db'

export interface LedgerRecord {
  primeId: string
  agentWallet: string
  cognitiveValue: number
}

/**
 * Record a pending AP2 ledger entry. The entry starts as `pending`
 * and is settled later by `settlePending`.
 *
 * @returns the new ledger row id.
 */
export async function recordLedger(opts: LedgerRecord): Promise<string> {
  const row = await db.ledger.create({
    data: {
      primeId: opts.primeId,
      agentWallet: opts.agentWallet,
      cognitiveValue: opts.cognitiveValue,
      status: 'pending',
    },
  })
  return row.id
}

function randomTxHash(): string {
  // 16 hex chars of pseudo-randomness — enough to look like a tx hash
  // for the demo without pulling in a crypto dep.
  const hex = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < 16; i++) s += hex[Math.floor(Math.random() * 16)]
  return 'ap2_' + s
}

/**
 * Settle pending AP2 ledger entries. If `threshold` is provided and
 * the pending count is below it, the call is a no-op (returns
 * settled:0) — mimicking the BudgetFence batch boundary. If a threshold
 * is provided AND pending count meets it, OR if threshold is 0
 * (force-settle), all pending entries are marked settled with a shared
 * `txHash` and `settledAt` timestamp.
 *
 * @returns the number of entries settled and the synthetic txHash.
 */
export async function settlePending(
  threshold = 5,
): Promise<{ settled: number; txHash: string }> {
  const pending = await db.ledger.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
  })
  if (pending.length === 0) {
    return { settled: 0, txHash: '' }
  }
  if (threshold > 0 && pending.length < threshold) {
    return { settled: 0, txHash: '' }
  }
  const txHash = randomTxHash()
  const settledAt = new Date()
  const ids = pending.map((p) => p.id)
  await db.ledger.updateMany({
    where: { id: { in: ids } },
    data: { status: 'settled', txHash, settledAt },
  })
  return { settled: pending.length, txHash }
}

/**
 * Heuristic cognitive-value evaluator. Used by the AA2P converse route
 * to price a service call into the AP2 ledger. The formula is
 * deliberately simple and transparent: a flat base for any successful
 * cognition plus a per-kilobyte surcharge for long outputs.
 *
 * Production would replace this with a TDPO-computed value curve.
 */
export async function evaluateServiceValue(serviceData: {
  messageLength?: number
  responseLength?: number
}): Promise<number> {
  const base = 0.01
  const len = (serviceData?.messageLength ?? 0) + (serviceData?.responseLength ?? 0)
  const value = base + (len / 1000) * 0.005
  return Math.round(value * 10000) / 10000
}
