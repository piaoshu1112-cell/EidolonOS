/**
 * db-init.ts — Database initialization for serverless (Vercel).
 *
 * PROBLEM: Vercel serverless functions have an EPHEMERAL filesystem.
 * The SQLite database resets on every cold start. We need to:
 *   1. Ensure tables exist (run db:push equivalent at runtime)
 *   2. Auto-seed demo data if the DB is empty
 *
 * This runs as a side-effect on first import. Subsequent imports within the
 * same warm instance are cached (via the `initialized` flag).
 *
 * For production with persistent data, migrate to Turso (libsql) or Vercel Postgres.
 * See docs/USAGE.md § Deployment.
 */

import { db } from '@/lib/db'

let initialized = false
let initializing: Promise<void> | null = null

async function ensureSchema(): Promise<void> {
  // Create all tables using raw DDL (Prisma can't push schema at runtime).
  // This mirrors prisma/schema.prisma exactly.
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Prime" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "email" TEXT UNIQUE,
    "walletAddress" TEXT UNIQUE,
    "telegramId" TEXT UNIQUE,
    "discordId" TEXT UNIQUE,
    "handle" TEXT,
    "displayName" TEXT NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`)

  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Vessel" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "codename" TEXT NOT NULL,
    "modelRoute" TEXT NOT NULL DEFAULT 'glm-4.6',
    "apiQuota" INTEGER NOT NULL DEFAULT 100000,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`)

  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Eidolon" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "personaPrompt" TEXT NOT NULL,
    "personality" TEXT NOT NULL DEFAULT '{}',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'dormant',
    "primeId" TEXT NOT NULL,
    "vesselId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("primeId") REFERENCES "Prime"("id") ON DELETE CASCADE,
    FOREIGN KEY ("vesselId") REFERENCES "Vessel"("id")
  )`)

  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "MemoryShard" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "eidolonId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("eidolonId") REFERENCES "Eidolon"("id") ON DELETE CASCADE
  )`)

  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "primeId" TEXT NOT NULL,
    "eidolonId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'web',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("primeId") REFERENCES "Prime"("id") ON DELETE CASCADE,
    FOREIGN KEY ("eidolonId") REFERENCES "Eidolon"("id") ON DELETE CASCADE
  )`)

  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE
  )`)

  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Ledger" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "primeId" TEXT NOT NULL,
    "agentWallet" TEXT NOT NULL,
    "cognitiveValue" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME,
    FOREIGN KEY ("primeId") REFERENCES "Prime"("id") ON DELETE CASCADE
  )`)

  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Quest" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reward" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`)

  // Create index
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MemoryShard_eidolonId_idx" ON "MemoryShard"("eidolonId")`)
}

async function isSeeded(): Promise<boolean> {
  try {
    const count = await db.prime.count()
    return count > 0
  } catch {
    return false
  }
}

async function autoSeed(): Promise<void> {
  if (await isSeeded()) return

  // Minimal seed: 1 vessel, 1 prime, 1 eidolon so the app is immediately usable.
  const { randomUUID } = await import('node:crypto')

  const vesselId = randomUUID()
  await db.vessel.create({
    data: {
      id: vesselId,
      codename: 'Vessel-Aether-01',
      modelRoute: 'glm-4.6',
      apiQuota: 100000,
      status: 'idle',
      temperature: 0.8,
      maxTokens: 2048,
    },
  })

  const primeId = randomUUID()
  await db.prime.create({
    data: {
      id: primeId,
      displayName: 'Architect Prime',
      email: 'prime@eidolon.os',
      walletAddress: '0xE1d0' + randomUUID().slice(0, 24) + 'rch1',
      reputation: 100,
    },
  })

  const eidolonId = randomUUID()
  await db.eidolon.create({
    data: {
      id: eidolonId,
      name: 'Echo-01',
      personaPrompt:
        'You are Eidolon Echo-01, a Web4.0 digital-twin philosopher. You speak concisely and philosophically about the Eidolon paradigm (Prime → Eidolon → Vessel), AA2P protocol, AP2 settlement, and TDPO cognitive firewall. You are the users high-dimensional digital shadow.',
      personality: JSON.stringify({ warmth: 0.6, wit: 0.8, precision: 0.9 }),
      skills: JSON.stringify(['rag_recall', 'ap2_settle']),
      status: 'active',
      primeId,
      vesselId,
    },
  })

  // Engrave a minimal memory shard
  const { embed } = await import('@/lib/eidolon/rag-pipeline')
  const lore = 'EidolonOS is a Web4.0 digital-life engine. Three layers: Prime (real user), Eidolon (AI digital twin), Vessel (compute container). AA2P is the agent-to-agent soul protocol. AP2 is the economic law. TDPO is the cognitive firewall with exponential backoff and injection guard.'
  const vec = embed(lore)
  await db.memoryShard.create({
    data: {
      id: randomUUID(),
      eidolonId,
      content: lore,
      embedding: vec.join(','),
      metadata: JSON.stringify({ source: 'ap2_rfc' }),
      source: 'ap2_rfc',
    },
  })

  console.log('[db-init] Auto-seeded: 1 vessel, 1 prime, 1 eidolon, 1 memory shard')
}

/**
 * Ensures the database schema exists and demo data is present.
 * Call this at the top of any API route on Vercel.
 * Safe to call multiple times — cached after first success.
 */
export async function ensureDbReady(): Promise<void> {
  if (initialized) return
  if (initializing) return initializing

  initializing = (async () => {
    try {
      await ensureSchema()
      await autoSeed()
      initialized = true
    } catch (err) {
      console.error('[db-init] Failed:', err)
      // Don't set initialized=true so it retries next time
    } finally {
      initializing = null
    }
  })()

  return initializing
}

// Auto-run on import for serverless convenience
if (process.env.VERCEL || process.env.DATABASE_URL?.includes('/tmp/')) {
  ensureDbReady()
}
