import { PrismaClient } from '@prisma/client'

// On Vercel/serverless, use /tmp for the SQLite file (only writable directory).
// The DATABASE_URL from .env points to the local dev path; on Vercel we
// override to /tmp so the DB is writable (though ephemeral — see db-init.ts).
if (process.env.VERCEL && process.env.DATABASE_URL?.startsWith('file:')) {
  process.env.DATABASE_URL = 'file:/tmp/eidolonos.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbReadyPromise: Promise<void> | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
  })

// Cache the client across warm invocations (and dev HMR).
globalForPrisma.prisma = db

/**
 * Ensures the database schema exists and demo data is seeded.
 * MUST be called at the start of every API route handler on Vercel,
 * because each serverless function has its own ephemeral /tmp filesystem.
 *
 * On local dev, the schema already exists (via `bun run db:push`), so this
 * is a fast no-op (just checks prime.count() > 0).
 *
 * Safe to call multiple times — cached per-instance via globalThis.
 */
export async function ensureDbReady(): Promise<void> {
  // Local dev: schema already exists via `bun run db:push` — skip.
  if (!process.env.VERCEL) return

  if (globalForPrisma.dbReadyPromise) return globalForPrisma.dbReadyPromise

  globalForPrisma.dbReadyPromise = (async () => {
    try {
      // Check if schema exists by querying primes table
      let schemaReady = false
      try {
        await db.prime.count()
        schemaReady = true
      } catch {
        schemaReady = false
      }

      if (!schemaReady) {
        await createSchema()
      }

      // Auto-seed if empty
      const primeCount = await db.prime.count()
      if (primeCount === 0) {
        await autoSeed()
      }
    } catch (err) {
      console.error('[ensureDbReady] Failed:', err)
      globalForPrisma.dbReadyPromise = undefined // allow retry
      throw err
    }
  })()

  return globalForPrisma.dbReadyPromise
}

async function createSchema(): Promise<void> {
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
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MemoryShard_eidolonId_idx" ON "MemoryShard"("eidolonId")`)
}

async function autoSeed(): Promise<void> {
  const { randomUUID } = await import('node:crypto')
  const { embed } = await import('@/lib/eidolon/rag-pipeline')

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