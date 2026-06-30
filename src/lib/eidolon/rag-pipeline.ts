/**
 * rag-pipeline.ts — Long-term Memory Engraving & Recall
 * ------------------------------------------------------------------
 * SQLite has no native vector type, so we adopt a deliberately small,
 * deterministic, dependency-free embedding: Term-Frequency hashed into
 * a fixed 256-dim vector, L2-normalized. Cosine similarity is computed
 * in-memory across all shards of a single Eidolon.
 *
 * This is NOT a research-grade embedding — it is a faithful, fast
 * stand-in that keeps the EidolonOS RAG contract intact for this
 * single-instance demo. Production swap-path: replace `embed()` with a
 * real embedding model (z-ai-web-dev-sdk or pgvector) and the rest of
 * the pipeline stays the same.
 */
import { db } from '@/lib/db'

export const EMBED_DIM = 256

/** Tiny FNV-1a-ish string hash, stable across runs. */
function hashToken(token: string): number {
  let h = 2166136261
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // Force unsigned 32-bit.
  return h >>> 0
}

/**
 * Tokenizer: lowercase, split on non-alphanumeric, but treat each CJK
 * ideograph as its own token (so 中文也能被索引). Empties are dropped.
 */
export function tokenize(text: string): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const tokens: string[] = []
  // Split runs of ASCII word chars; capture CJK chars individually.
  const re = /[\u4e00-\u9fa5]|[a-z0-9]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(lower)) !== null) {
    if (m[0].length > 0) tokens.push(m[0])
  }
  return tokens
}

/**
 * Embed text into a 256-dim L2-normalized vector via TF hashing.
 * Returns a zero vector (length EMBED_DIM) when there are no tokens,
 * so downstream cosine math stays well-defined.
 */
export function embed(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0)
  const tokens = tokenize(text)
  if (tokens.length === 0) return vec
  for (const tk of tokens) {
    const bucket = hashToken(tk) % EMBED_DIM
    vec[bucket] += 1
  }
  // L2 normalize. If norm is 0 (shouldn't happen since tokens exist),
  // leave the vector as-is.
  let norm = 0
  for (const v of vec) norm += v * v
  norm = Math.sqrt(norm)
  if (norm > 0) {
    for (let i = 0; i < EMBED_DIM; i++) vec[i] /= norm
  }
  return vec
}

/** Cosine similarity for two equal-length numeric vectors. */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/**
 * Chunk a long text into ~chunkSize-char pieces, breaking on sentence
 * / paragraph boundaries when feasible. Returns at least one chunk.
 */
export function chunkText(text: string, chunkSize = 500): string[] {
  const clean = (text || '').trim()
  if (clean.length === 0) return []
  // First split on double-newlines (paragraphs); if a paragraph is
  // still too long, fall back to sentence split, then hard slice.
  const paragraphs = clean.split(/\n\s*\n/)
  const chunks: string[] = []
  let buf = ''
  const flush = () => {
    const t = buf.trim()
    if (t.length > 0) chunks.push(t)
    buf = ''
  }
  for (const p of paragraphs) {
    const para = p.trim()
    if (para.length === 0) continue
    if ((buf + '\n\n' + para).length > chunkSize && buf) {
      flush()
    }
    if (para.length > chunkSize) {
      // Sentence-level split.
      const sentences = para.split(/(?<=[。！？.!?])\s+/)
      for (const s of sentences) {
        if ((buf + s).length > chunkSize && buf) {
          flush()
        }
        if (s.length > chunkSize) {
          // Hard slice.
          for (let i = 0; i < s.length; i += chunkSize) {
            chunks.push(s.slice(i, i + chunkSize).trim())
          }
        } else {
          buf += (buf ? ' ' : '') + s
        }
      }
    } else {
      buf += (buf ? '\n\n' : '') + para
    }
  }
  flush()
  return chunks
}

function vectorToCsv(vec: number[]): string {
  return vec.map((n) => n.toFixed(6)).join(',')
}

function csvToVector(csv: string): number[] {
  if (!csv) return new Array<number>(EMBED_DIM).fill(0)
  const parts = csv.split(',')
  const vec = new Array<number>(EMBED_DIM).fill(0)
  for (let i = 0; i < parts.length && i < EMBED_DIM; i++) {
    const n = Number(parts[i])
    if (!Number.isNaN(n)) vec[i] = n
  }
  return vec
}

/**
 * Engrave (persist) a piece of long-term memory into the Eidolon's
 * shard vault. Splits the text into chunks, embeds each chunk, and
 * writes a MemoryShard row with the embedding serialized as CSV.
 *
 * @returns the number of shards engraved.
 */
export async function engraveMemory(
  eidolonId: string,
  text: string,
  source = 'manual',
  metadata: Record<string, unknown> = {},
): Promise<number> {
  const chunks = chunkText(text)
  if (chunks.length === 0) return 0
  const metaJson = JSON.stringify(metadata)
  await db.memoryShard.createMany({
    data: chunks.map((content) => ({
      eidolonId,
      content,
      embedding: vectorToCsv(embed(content)),
      metadata: metaJson,
      source,
    })),
  })
  return chunks.length
}

/** Lightweight shard shape returned to the prompt builder / API. */
export interface RecalledShard {
  id: string
  content: string
  similarity: number
  source: string
  metadata: string
  createdAt: Date
}

/**
 * Recall the top-K most relevant memory shards for a query. Loads all
 * shards for the Eidolon (single-instance SQLite; production swap is
 * pgvector ANN), embeds the query, and ranks by cosine similarity.
 *
 * Returns `[]` when the Eidolon has no memories yet.
 */
export async function recallMemory(
  eidolonId: string,
  query: string,
  topK = 5,
): Promise<RecalledShard[]> {
  const shards = await db.memoryShard.findMany({
    where: { eidolonId },
    orderBy: { createdAt: 'desc' },
  })
  if (shards.length === 0) return []
  const qvec = embed(query)
  const scored = shards.map((s) => ({
    id: s.id,
    content: s.content,
    source: s.source,
    metadata: s.metadata,
    createdAt: s.createdAt,
    similarity: cosine(qvec, csvToVector(s.embedding)),
  }))
  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, Math.max(1, topK))
}
