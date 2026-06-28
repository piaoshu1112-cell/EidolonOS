import { PrismaClient } from '@prisma/client'

// On Vercel/serverless, use /tmp for the SQLite file (only writable directory).
// The DATABASE_URL from .env points to the local dev path; on Vercel we
// override to /tmp so the DB is writable (though ephemeral — see db-init.ts).
if (process.env.VERCEL && process.env.DATABASE_URL?.startsWith('file:')) {
  process.env.DATABASE_URL = 'file:/tmp/eidolonos.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
  })

// Cache the client across warm invocations (and dev HMR).
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
else globalForPrisma.prisma = db