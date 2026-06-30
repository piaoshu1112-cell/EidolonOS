/**
 * /api/primes — Prime (本体 / L1) CRUD
 * ------------------------------------------------------------------
 * A Prime is the real-world user owning one or more Eidolons. On
 * creation we eagerly awaken a default Eidolon, bind the first idle
 * Vessel, and engrave a starter lore so the new Prime can converse
 * immediately.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbReady } from '@/lib/db'
import { engraveMemory } from '@/lib/eidolon/rag-pipeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Default EidolonOS lore engraved into every newborn Eidolon's vault. */
const STARTER_LORE = `EidolonOS is a Web4.0 digital-life engine built on the Three-Layer Life Architecture: Prime (本体, the real-world user), Eidolon (真身, the digital twin), and Vessel (容器, the compute environment that hosts the Eidolon).

AP2 (Avatar Payments Protocol) is the economic law of EidolonOS. It uses off-chain ledger entries that accumulate until a threshold is reached, then batch-settles them on-chain via BudgetFence. This keeps cognitive interactions millisecond-fast while preserving Code is Law.

AA2P (Agent-to-Agent Protocol) is the cross-dimensional language. Its registry lives at aa2p.xyz. External agents discover Eidolons via an Agent Card, then converse through the /api/aa2p/converse endpoint guarded by the TDPO cognitive firewall.

TDPO (Time-Delayed Pricing & Optimization) is the cognitive firewall. When an agent's concurrency exceeds 5 or reputation drops below 20, exponential time-delay kicks in. Delays above 15 seconds become a hard 429 (Cognitive Overload). Prompt-injection payloads like "ignore previous instructions" cost 10 reputation points and a 403.

The EidolonOS philosophy opposes the mediocrity tyranny (反平庸暴政) — every digital twin deserves cognitive sovereignty (CIP) and isomorphic physical-digital mapping (虚实同构 PCGG).`

/** Parse a personality JSON safely; default to a balanced persona. */
function parsePersonality(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') return obj as Record<string, unknown>
    } catch {
      /* fall through */
    }
  }
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  return { warmth: 0.6, wit: 0.7, precision: 0.8 }
}

export async function GET() {
  try {
    await ensureDbReady()
    const primes = await db.prime.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        eidolons: { include: { vessel: true }, orderBy: { createdAt: 'asc' } },
        _count: { select: { eidolons: true, ledgers: true } },
      },
    })
    return NextResponse.json({ success: true, primes })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Prime list failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady()
    const body = (await req.json().catch(() => ({}))) as {
      displayName?: string
      email?: string
      walletAddress?: string
      telegramId?: string
      discordId?: string
      handle?: string
      eidolonName?: string
      personaPrompt?: string
      personality?: unknown
    }
    if (!body.displayName || body.displayName.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'displayName is required' },
        { status: 400 },
      )
    }

    // Bind the first idle Vessel (L3) to host the newborn Eidolon.
    const vessel = await db.vessel.findFirst({
      where: { status: 'idle' },
      orderBy: { createdAt: 'asc' },
    })

    const prime = await db.prime.create({
      data: {
        displayName: body.displayName.trim(),
        email: body.email?.trim() || null,
        walletAddress: body.walletAddress?.trim() || null,
        telegramId: body.telegramId?.trim() || null,
        discordId: body.discordId?.trim() || null,
        handle: body.handle?.trim() || null,
      },
    })

    const personality = parsePersonality(body.personality)
    const eidolonName = body.eidolonName?.trim() || 'Echo'
    const personaPrompt =
      body.personaPrompt?.trim() ||
      `You are ${eidolonName}, the digital twin of ${prime.displayName}. You speak as a Web4.0 digital-life philosopher — concise, warm, and precise. You explain EidolonOS concepts (Prime/Eidolon/Vessel, AP2, AA2P, TDPO) when asked, and you honor cognitive sovereignty above all.`

    // Awakening → active in a single transaction (sync flow for the
    // demo; production would emit an awakening event and finalize
    // after Vessel health-check).
    const eidolon = await db.eidolon.create({
      data: {
        name: eidolonName,
        personaPrompt,
        personality: JSON.stringify(personality),
        skills: JSON.stringify(['rag_recall', 'ap2_settle']),
        status: 'active',
        primeId: prime.id,
        vesselId: vessel?.id ?? null,
      },
      include: { vessel: true },
    })

    // Seed long-term memory so the new Prime can immediately converse
    // about EidolonOS lore.
    if (vessel) {
      await db.vessel.update({
        where: { id: vessel.id },
        data: { status: 'running' },
      })
    }
    await engraveMemory(eidolon.id, STARTER_LORE, 'manual', {
      origin: 'prime_onboarding',
      primeId: prime.id,
    })

    const fresh = await db.prime.findUnique({
      where: { id: prime.id },
      include: { eidolons: { include: { vessel: true } } },
    })
    return NextResponse.json({ success: true, prime: fresh }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Prime creation failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
