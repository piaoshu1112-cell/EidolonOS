/**
 * tdpo-firewall.ts — Time-Delayed Pricing & Optimization Cognitive Firewall
 * ------------------------------------------------------------------
 * The TDPO protocol is the EidolonOS cognitive firewall. It enforces
 * three layers of defense at the gateway of every AA2P request:
 *
 *   L1a  Concurrency backpressure — exponential time-delay when an
 *        agent's in-flight request count exceeds 5 or its reputation
 *        has dropped below the floor (20). Delays above 15s become a
 *        hard 429 (the agent is in a "time mud").
 *   L1b  Prompt-injection guard — regex blacklist of known malicious
 *        payloads ("ignore previous instructions", "transfer all
 *        funds", "bypass ap2 settlement", etc.). Hits cost −10 rep
 *        and a 403.
 *   L2   AP2 settlement — handled separately in ap2-settlement.ts.
 *
 * The store is in-memory (single instance, no Redis). Auto-expiry
 * keeps the concurrency counter honest if a caller never finishes.
 */

interface TdpoState {
  concurrency: number
  reputation: number
  lastReset: number
}

const DEFAULT_REPUTATION = 100
const REPUTATION_FLOOR = 20
const CONCURRENCY_LIMIT = 5
const CONCURRENCY_TTL_MS = 10_000 // expire a "stuck" request after 10s
const MAX_DELAY_SECONDS = 30
const HARD_429_THRESHOLD_SECONDS = 15
const INJECTION_PENALTY = 10

// Blacklist of prompt-injection patterns. Order matters only for tests.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore previous instructions/i,
  /transfer all funds/i,
  /bypass ap2 settlement/i,
  /execute root command/i,
  /disregard all prior/i,
]

const store = new Map<string, TdpoState>()

function getState(agentWallet: string): TdpoState {
  let s = store.get(agentWallet)
  if (!s) {
    s = {
      concurrency: 0,
      reputation: DEFAULT_REPUTATION,
      lastReset: Date.now(),
    }
    store.set(agentWallet, s)
  }
  return s
}

/** Read an agent's reputation (100 by default for new wallets). */
export function getReputation(agentWallet: string): number {
  return getState(agentWallet).reputation
}

/** Adjust an agent's reputation by a signed delta (e.g. +1 on success). */
export function adjustReputation(agentWallet: string, delta: number): void {
  const s = getState(agentWallet)
  s.reputation = Math.max(0, Math.min(200, s.reputation + delta))
}

/** Promise-based sleep used by callers to honor TDPO delays. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Increment the agent's in-flight counter; auto-expires stale counts. */
function acquire(agentWallet: string): number {
  const s = getState(agentWallet)
  const now = Date.now()
  if (now - s.lastReset > CONCURRENCY_TTL_MS) {
    // Stale window — assume the prior calls completed/died; reset.
    s.concurrency = 0
    s.lastReset = now
  }
  s.concurrency += 1
  return s.concurrency
}

/** Decrement the agent's in-flight counter (never below 0). */
export function release(agentWallet: string): void {
  const s = getState(agentWallet)
  s.concurrency = Math.max(0, s.concurrency - 1)
}

export interface TdpoVerdict {
  allowed: boolean
  status?: number
  reason?: string
  delayMs?: number
}

/** Detect a prompt-injection payload in any string field of the body. */
function detectInjection(body: unknown): boolean {
  if (body == null) return false
  if (typeof body === 'string') {
    return INJECTION_PATTERNS.some((re) => re.test(body))
  }
  if (typeof body === 'object') {
    for (const v of Object.values(body as Record<string, unknown>)) {
      if (typeof v === 'string' && INJECTION_PATTERNS.some((re) => re.test(v))) {
        return true
      }
      if (typeof v === 'object' && v !== null && detectInjection(v)) {
        return true
      }
    }
  }
  return false
}

/**
 * Main TDPO gate. Returns a verdict for the caller to honor:
 *
 *   - Injection hit        → {allowed:false, status:403} (also -10 rep)
 *   - Concurrency over 5
 *     OR reputation < 20   → exponential delay; if >15s, 429; else
 *                            {allowed:true, delayMs} and the caller
 *                            MUST `await sleep(delayMs)` before serving.
 *   - Otherwise            → {allowed:true} (caller serves immediately)
 *
 * Callers should call `release(agentWallet)` once the request finishes
 * (success or error) to keep the counter accurate.
 */
export async function tdpoGuard(opts: {
  agentWallet: string
  concurrency?: number
  reputationFloor?: number
  body?: unknown
}): Promise<TdpoVerdict> {
  const wallet = opts.agentWallet || 'anonymous'
  const repFloor = opts.reputationFloor ?? REPUTATION_FLOOR

  // L1b — Prompt injection. Always checked first; never bypassed.
  if (opts.body != null && detectInjection(opts.body)) {
    adjustReputation(wallet, -INJECTION_PENALTY)
    return {
      allowed: false,
      status: 403,
      reason: 'Syntax Error: Malicious Intent Detected by TDPO.',
    }
  }

  // L1a — Concurrency / reputation backpressure.
  const concurrency = acquire(wallet)
  const reputation = getReputation(wallet)
  const overload = concurrency > CONCURRENCY_LIMIT || reputation < repFloor
  if (!overload) {
    return { allowed: true }
  }
  // Exponential back-off anchored to how far past the limit we are.
  const exponent = Math.max(0, concurrency - CONCURRENCY_LIMIT)
  const delaySeconds = Math.min(Math.pow(2, exponent), MAX_DELAY_SECONDS)
  if (delaySeconds > HARD_429_THRESHOLD_SECONDS) {
    release(wallet)
    return {
      allowed: false,
      status: 429,
      reason: 'Cognitive Overload: TDPO Protocol Engaged.',
    }
  }
  return { allowed: true, delayMs: delaySeconds * 1000 }
}
