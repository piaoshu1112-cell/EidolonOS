/**
 * EidolonOS Telegram Bot — @EidolonOS_Bot
 * ------------------------------------------------------------------
 * A standalone Bun + Telegraf mini-service that bridges Telegram to
 * the EidolonOS Headless API. All AI logic lives in the main Next.js
 * app; this bot only orchestrates the "Eidolon awakening ritual"
 * (docs/EidolonOS-DEVELOPMENT.md §7.3) and forwards user directives
 * to the SSE consciousness stream.
 *
 * Ritual flow:
 *   /start   → SYSTEM INITIALIZED greeting + Awaken button
 *   /awaken  → register Prime (or fetch existing) + list Eidolons
 *   text     → typewriter consciousness stream via SSE
 *   /clear   → reset Eidolon selection
 *   /help    → command cheat sheet
 *
 * CRITICAL CONSTRAINTS:
 *   - NO Prisma, NO z-ai-web-dev-sdk. Pure HTTP client to API_BASE_URL.
 *   - MarkdownV2 special chars (`_*[]()~` >#+-=|{}.!`) MUST be escaped
 *     in all dynamic text sent with parse_mode=MarkdownV2.
 *   - TG editMessageText is rate-limited (~1/sec per message). The
 *     typewriter throttles edits to max 1/sec to avoid 429s.
 *
 * Entry point: `bun run dev` (or `bun run start`).
 */
import { Telegraf, Markup } from 'telegraf'
import type { Context } from 'telegraf'
import { message } from 'telegraf/filters'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || ''
const API_BASE_URL = (
  process.env.API_BASE_URL || 'http://localhost:3000'
).replace(/\/+$/, '')
const BOT_PORT = parseInt(process.env.BOT_PORT || '3003', 10)

/** Minimum ms between TG editMessageText calls (anti-429). */
const TYPEWRITER_MIN_INTERVAL_MS = 1000
/** How often (ms) the flusher checks whether a throttled edit is due. */
const TYPEWRITER_FLUSH_INTERVAL_MS = 600
/** Telegram message hard char limit (with safety margin). */
const TG_MAX_MSG_LEN = 4000

if (!TG_BOT_TOKEN) {
  console.error('❌ TG_BOT_TOKEN is required. Set it in .env')
  process.exit(1)
}

console.log(`⟢ EidolonOS TG Bot — booting…`)
console.log(`  API_BASE_URL = ${API_BASE_URL}`)
console.log(`  BOT_PORT     = ${BOT_PORT}`)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Eidolon {
  id: string
  name: string
  personaPrompt: string
  status: string
  primeId: string
  vesselId?: string | null
}

interface Prime {
  id: string
  displayName: string
  telegramId?: string | null
  email?: string | null
  walletAddress?: string | null
}

interface UserSession {
  primeId: string
  eidolonId: string
  eidolonName: string
}

interface SSEEvent {
  type: string
  content?: string
  shards?: number
  tokensOut?: number
  vesselId?: string
  message?: string
}

// ---------------------------------------------------------------------------
// In-memory session store (resets on restart — acceptable for MVP).
// Keyed by Telegram user id.
// ---------------------------------------------------------------------------
const sessions = new Map<number, UserSession>()

// ---------------------------------------------------------------------------
// MarkdownV2 escaping — THE #1 TG bot bug.
// Special chars per https://core.telegram.org/bots/api#markdownv2-style:
//   _ * [ ] ( ) ~ ` > # + - = | { } . !
// We also escape backslash itself.
// ---------------------------------------------------------------------------
const MDV2_SPECIAL = /([_*\[\]()~`>#+\-=|{}.!\\])/g
function escapeMdV2(text: string): string {
  return text.replace(MDV2_SPECIAL, '\\$1')
}

/**
 * Truncate a string to fit within `maxLen` chars, appending an ellipsis
 * (also escaped) if truncated. Used to keep typewriter edits under the
 * 4096-char TG limit.
 */
function truncateForTg(text: string, maxLen = TG_MAX_MSG_LEN): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 6) + '\\.\\.\\.'
}

// ---------------------------------------------------------------------------
// API client — pure HTTP to the EidolonOS Headless API.
// ---------------------------------------------------------------------------
async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      console.error(`GET ${path} → HTTP ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`GET ${path} failed:`, err)
    return null
  }
}

async function listPrimes(): Promise<Prime[]> {
  const data = await apiGet<{ success: boolean; primes: Prime[] }>(
    '/api/primes',
  )
  return data?.primes ?? []
}

async function listEidolons(): Promise<Eidolon[]> {
  const data = await apiGet<{ success: boolean; eidolons: Eidolon[] }>(
    '/api/eidolons',
  )
  return data?.eidolons ?? []
}

/**
 * Create-or-fetch a Prime by telegramId.
 *
 * POST /api/primes eagerly creates a Prime AND a default Eidolon bound
 * to the first idle Vessel. If the telegramId is already taken (unique
 * constraint), the call may fail; we fall back to GET /api/primes and
 * find by telegramId.
 */
async function ensurePrime(
  telegramId: string,
  displayName: string,
): Promise<Prime | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/primes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, telegramId }),
    })
    if (res.ok) {
      const json = (await res.json().catch(() => null)) as
        | { success: boolean; prime?: Prime; error?: string }
        | null
      if (json?.success && json.prime) return json.prime
    }
  } catch (err) {
    console.warn('POST /api/primes failed, falling back to list:', err)
  }
  // Fallback: list primes and find by telegramId.
  const primes = await listPrimes()
  return primes.find((p) => p.telegramId === telegramId) ?? null
}

// ---------------------------------------------------------------------------
// SSE stream consumer for /api/eidolons/[id]/converse.
// The EidolonOS SSE contract:
//   event: consciousness-stream
//   data: {"type":"memory","shards":N}
//   data: {"type":"token","content":"..."}
//   data: {"type":"done","tokensOut":N,"vesselId":"..."}
//   data: {"type":"error","message":"..."}
// ---------------------------------------------------------------------------
async function streamConsciousness(
  eidolonId: string,
  primeId: string,
  userMessage: string,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/eidolons/${encodeURIComponent(eidolonId)}/converse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        primeId,
        message: userMessage,
        channel: 'telegram',
      }),
    },
  )

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Vessel HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
    )
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const flushBuffer = () => {
    // SSE events are separated by a blank line (\n\n).
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const ev = parseSSEBlock(block)
      if (ev) onEvent(ev)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    flushBuffer()
  }
  // Flush trailing decoder bytes.
  buffer += decoder.decode()
  // Flush any remaining partial event.
  if (buffer.trim()) {
    const ev = parseSSEBlock(buffer)
    if (ev) onEvent(ev)
  }
}

function parseSSEBlock(block: string): SSEEvent | null {
  const lines = block.split('\n')
  let dataLine = ''
  for (const line of lines) {
    if (line.startsWith('data:')) {
      // data: can span multiple lines; concatenate per spec.
      dataLine += line.slice(5).replace(/^\s/, '')
    }
  }
  if (!dataLine) return null
  try {
    return JSON.parse(dataLine) as SSEEvent
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers — display formatting & safe TG edits.
// ---------------------------------------------------------------------------

/**
 * Extract a short title (≤ ~40 chars) from an Eidolon personaPrompt.
 * The seeded personas follow "You are NAME, the <short descriptor> of…",
 * so we capture that descriptor. Falls back to the first 4 words.
 */
function eidolonShortTitle(eidolon: Eidolon): string {
  const m = eidolon.personaPrompt.match(
    /^You are [^,]+,\s+(?:the\s+)?(.+?)(?:[.,]|$)/i,
  )
  if (m && m[1]) {
    const words = m[1].split(/\s+/).slice(0, 4).join(' ')
    return words.slice(0, 40)
  }
  const fallback = eidolon.personaPrompt.split(/\s+/).slice(0, 4).join(' ')
  return fallback.slice(0, 40) || 'Digital Twin'
}

/**
 * Inline keyboard button label for an Eidolon. Plain text (button
 * labels are NOT Markdown-parsed by Telegram, so no escaping).
 */
function eidolonButtonLabel(eidolon: Eidolon): string {
  const title = eidolonShortTitle(eidolon)
  const statusGlyph =
    eidolon.status === 'active'
      ? '◈'
      : eidolon.status === 'awakening'
        ? '◐'
        : '◯'
  return `${statusGlyph} ${eidolon.name} — ${title}`
}

/**
 * Wraps ctx.telegram.editMessageText in a safe call that swallows
 * the two expected transient errors:
 *   - "message is not modified" (TG rejects identical text)
 *   - 429 "Too Many Requests" (rate limit — typewriter backs off)
 */
async function safeEditMessage(
  ctx: Context,
  chatId: number,
  messageId: number,
  text: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const payload = text.length === 0 ? ' ' : text
  try {
    await ctx.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      payload,
      extra,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('not modified') || msg.includes('message is not modified')) {
      // Silent — text was identical to previous edit.
    } else if (msg.includes('429') || msg.toLowerCase().includes('too many')) {
      // Rate limit — back off silently; the periodic flush will retry.
    } else {
      console.warn('editMessageText failed:', msg)
    }
  }
}

// ---------------------------------------------------------------------------
// Ritual message templates (MarkdownV2 source).
// ---------------------------------------------------------------------------

/** /start greeting — exact form from design doc §7.3. */
function startMessageText(tgId: number): string {
  return (
    `*\\[ SYSTEM INITIALIZED \\]*\n\n` +
    `Welcome to the *Eidolon Matrix*\\.\n\n` +
    `You are currently recognized as a *\\[Prime\\]* \\(ID: ${tgId}\\)\\.\n\n` +
    `_Awaiting your first directive to awaken your digital twin\\._\n\n` +
    `Type /awaken to begin\\.`
  )
}

/** /help cheat sheet. */
const HELP_TEXT =
  `*Eidolon Matrix \\- Command Interface*\n\n` +
  `/start \\- Initialize system\n` +
  `/awaken \\- Register as Prime & select Eidolon\n` +
  `/help \\- Show this help\n` +
  `/clear \\- Reset Eidolon selection\n\n` +
  `_Or just type a message to converse with your digital twin\\._`

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

/**
 * /start — System Initiated ritual. Replies with the MarkdownV2
 * greeting and an inline "⚡ Awaken Eidolon" button.
 */
async function handleStart(ctx: Context): Promise<void> {
  const tgId = ctx.from?.id
  if (!tgId) return
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('⚡ Awaken Eidolon', 'awaken_twin')],
  ])
  await ctx.reply(startMessageText(tgId), {
    parse_mode: 'MarkdownV2',
    ...keyboard,
  })
}

/**
 * /awaken — Register the user as a Prime (create-or-fetch by telegramId),
 * then list available Eidolons as an inline keyboard.
 */
async function handleAwaken(ctx: Context): Promise<void> {
  const tgId = ctx.from?.id
  const tgUsername = ctx.from?.username
  if (!tgId) return

  const displayName = `TG-${tgUsername || String(tgId)}`
  const prime = await ensurePrime(String(tgId), displayName)

  if (!prime) {
    await ctx.reply(
      `⚠️ Vessel connection error: ${escapeMdV2('Could not register or fetch Prime from EidolonOS API.')}`,
      { parse_mode: 'MarkdownV2' },
    )
    return
  }

  const eidolons = await listEidolons()
  if (eidolons.length === 0) {
    await ctx.reply(
      `*Prime registered\\.*\n\n` +
        `⚠️ No Eidolons awakened yet\\. Ask an administrator to seed the matrix\\.`,
      { parse_mode: 'MarkdownV2' },
    )
    return
  }

  // Build inline keyboard — one Eidolon per row.
  const rows = eidolons.map((e) => [
    Markup.button.callback(eidolonButtonLabel(e), `eidolon_${e.id}`),
  ])
  const keyboard = Markup.inlineKeyboard(rows)

  const header =
    `*Prime registered\\.*\n\n` +
    `Prime: ${escapeMdV2(prime.displayName)} \\(ID: ${escapeMdV2(prime.id)}\\)\n\n` +
    `Select an Eidolon to converse with:`
  await ctx.reply(header, {
    parse_mode: 'MarkdownV2',
    ...keyboard,
  })
}

/** /help — show the command cheat sheet. */
async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(HELP_TEXT, { parse_mode: 'MarkdownV2' })
}

/** /clear — reset the user's Eidolon selection. */
async function handleClear(ctx: Context): Promise<void> {
  const tgId = ctx.from?.id
  if (!tgId) return
  const had = sessions.delete(tgId)
  const msg = had
    ? `*Eidolon selection cleared\\.*\n\nType /awaken to bind a new digital twin\\.`
    : `*No active Eidolon binding found\\.*\n\nType /awaken to begin\\.`
  await ctx.reply(msg, { parse_mode: 'MarkdownV2' })
}

// ---------------------------------------------------------------------------
// Callback query handlers
// ---------------------------------------------------------------------------

/** "⚡ Awaken Eidolon" button → run the awaken ritual. */
async function handleAwakenCallback(ctx: Context): Promise<void> {
  await ctx.answerCbQuery().catch(() => {})
  await handleAwaken(ctx)
}

/** Eidolon selection button → store session + confirm. */
async function handleEidolonCallback(ctx: Context): Promise<void> {
  await ctx.answerCbQuery().catch(() => {})
  const tgId = ctx.from?.id
  if (!tgId) return
  // Read the callback_data directly ("eidolon_<cuid>") — avoids relying
  // on the regex-matched `ctx.match` intersection type which isn't on
  // the base Context type. ctx.callbackQuery is a discriminated union;
  // only the "callback_query" variant carries a `data` string.
  const cb = ctx.callbackQuery
  const data = cb && 'data' in cb ? (cb as { data?: string }).data : undefined
  const eidolonId = data?.replace(/^eidolon_/, '')
  if (!eidolonId || eidolonId === data) {
    await ctx.reply(
      `⚠️ Vessel connection error: ${escapeMdV2('Malformed Eidolon selection.')}`,
      { parse_mode: 'MarkdownV2' },
    )
    return
  }

  // Re-fetch the Eidolon to confirm it still exists and to capture its name.
  const eidolons = await listEidolons()
  const eidolon = eidolons.find((e) => e.id === eidolonId)
  if (!eidolon) {
    await ctx.reply(
      `⚠️ Vessel connection error: ${escapeMdV2('Selected Eidolon no longer exists.')}`,
      { parse_mode: 'MarkdownV2' },
    )
    return
  }

  // Ensure the user has a Prime (they may have clicked a stale button
  // without running /awaken first).
  const displayName = `TG-${ctx.from?.username || String(tgId)}`
  const prime = await ensurePrime(String(tgId), displayName)
  if (!prime) {
    await ctx.reply(
      `⚠️ Vessel connection error: ${escapeMdV2('Prime registration failed.')}`,
      { parse_mode: 'MarkdownV2' },
    )
    return
  }

  sessions.set(tgId, {
    primeId: prime.id,
    eidolonId: eidolon.id,
    eidolonName: eidolon.name,
  })

  await ctx.reply(
    `*Eidolon ${escapeMdV2(eidolon.name)} bound to your consciousness\\.*\n\n` +
      `Type any message to begin the stream\\.`,
    { parse_mode: 'MarkdownV2' },
  )
}

// ---------------------------------------------------------------------------
// Text message handler — THE CORE: typewriter consciousness stream.
// ---------------------------------------------------------------------------

/**
 * When a user sends any text message (after selecting an Eidolon):
 *   1. Send a placeholder "⏳ Syncing consciousness with Vessel…"
 *   2. Open the SSE consciousness stream.
 *   3. Accumulate token deltas; throttle editMessageText to ≤1/sec,
 *      appending a `▌` cursor to simulate a typewriter.
 *   4. On `done`, send the final text without the cursor.
 *   5. On `error`, replace with "⚠️ Vessel connection error: …".
 */
async function handleText(ctx: Context): Promise<void> {
  const tgId = ctx.from?.id
  if (!tgId) return
  const text = (ctx.message as { text?: string } | undefined)?.text
  if (!text || text.startsWith('/')) return

  const session = sessions.get(tgId)
  if (!session) {
    await ctx.reply(
      `Please /awaken first to select your Eidolon\\.`,
      { parse_mode: 'MarkdownV2' },
    )
    return
  }

  // [1] Placeholder.
  const placeholder = await ctx.reply(
    escapeMdV2('⏳ Syncing consciousness with Vessel...'),
    { parse_mode: 'MarkdownV2' },
  )
  const chatId = placeholder.chat.id
  const messageId = placeholder.message_id

  // [2] Stream state.
  let accumulated = ''
  let memoryShards = 0
  let lastEditAt = 0
  let lastSentText = ''
  let dirty = false
  let streamError: string | null = null
  let streamDone = false

  /** Compose the typewriter display text (escaped MarkdownV2). */
  const composeDisplay = (withCursor: boolean): string => {
    if (streamError) {
      return `⚠️ Vessel connection error: ${escapeMdV2(streamError)}`
    }
    if (accumulated) {
      const body = truncateForTg(escapeMdV2(accumulated))
      const prefix =
        memoryShards > 0
          ? `🧠 ${memoryShards} shards recalled\n\n`
          : ''
      return prefix + body + (withCursor ? '▌' : '')
    }
    if (memoryShards > 0) {
      return (
        `🧠 ${memoryShards} memory shards recalled\\.\\nStreaming consciousness\\.\\.\\.`
      )
    }
    return escapeMdV2('⏳ Syncing consciousness with Vessel...')
  }

  /** Perform an edit if throttling allows; otherwise mark dirty. */
  const tryEdit = async (force: boolean) => {
    const now = Date.now()
    if (!force && now - lastEditAt < TYPEWRITER_MIN_INTERVAL_MS) {
      dirty = true
      return
    }
    const display = composeDisplay(!streamDone && !streamError)
    if (display === lastSentText) {
      dirty = false
      return
    }
    lastEditAt = now
    lastSentText = display
    dirty = false
    await safeEditMessage(ctx, chatId, messageId, display, {
      parse_mode: 'MarkdownV2',
    })
  }

  // Periodic flusher — when tokens arrive in bursts faster than the
  // 1s throttle, this ensures the user still sees ~1 update/sec.
  const flusher = setInterval(() => {
    if (!dirty || streamDone || streamError) return
    const now = Date.now()
    if (now - lastEditAt >= TYPEWRITER_MIN_INTERVAL_MS) {
      tryEdit(false).catch(() => {})
    }
  }, TYPEWRITER_FLUSH_INTERVAL_MS)

  // [3] Open the SSE stream.
  try {
    await streamConsciousness(
      session.eidolonId,
      session.primeId,
      text,
      (event) => {
        if (event.type === 'memory' && typeof event.shards === 'number') {
          memoryShards = event.shards
          tryEdit(true).catch(() => {})
        } else if (event.type === 'token' && event.content) {
          accumulated += event.content
          tryEdit(false).catch(() => {})
        } else if (event.type === 'error') {
          streamError = event.message || 'Unknown vessel error'
        } else if (event.type === 'done') {
          streamDone = true
        }
      },
    )
  } catch (err) {
    streamError = err instanceof Error ? err.message : 'Stream failed'
  }

  clearInterval(flusher)

  // [4] Final edit — no cursor.
  const finalDisplay = composeDisplay(false)
  // If the only thing we ever sent was the placeholder, force an edit
  // so the user sees the final state.
  await safeEditMessage(ctx, chatId, messageId, finalDisplay, {
    parse_mode: 'MarkdownV2',
  })

  // [5] If the response is very long and got truncated, send the
  // overflow as a follow-up message so no content is silently lost.
  if (!streamError && accumulated.length > TG_MAX_MSG_LEN) {
    const overflow = accumulated.slice(TG_MAX_MSG_LEN - 6)
    if (overflow.trim()) {
      await ctx.reply(truncateForTg(escapeMdV2(overflow), TG_MAX_MSG_LEN), {
        parse_mode: 'MarkdownV2',
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Bot wiring
// ---------------------------------------------------------------------------
const bot = new Telegraf(TG_BOT_TOKEN)

bot.start(handleStart)
bot.command('awaken', handleAwaken)
bot.command('help', handleHelp)
bot.command('clear', handleClear)
bot.action('awaken_twin', handleAwakenCallback)
bot.action(/^eidolon_(.+)$/, handleEidolonCallback)
bot.on(message('text'), handleText)

// Global error guard — never let one handler crash the bot.
bot.catch((err) => {
  console.error('⟢ Telegraf handler error:', err)
})

// ---------------------------------------------------------------------------
// Optional health-check HTTP server (long polling is used for TG
// updates, so this is purely for liveness probes).
// ---------------------------------------------------------------------------
const healthServer = createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    if (req.url?.startsWith('/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: true,
          service: 'eidolonos-telegram-bot',
          apiBaseUrl: API_BASE_URL,
          activeSessions: sessions.size,
          uptime: process.uptime(),
        }),
      )
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('eidolonos-telegram-bot OK\n')
  },
)

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------
async function main() {
  // Pre-flight 1: probe the EidolonOS API so we fail fast if it's down.
  try {
    const probe = await fetch(`${API_BASE_URL}/api/dashboard`, {
      headers: { Accept: 'application/json' },
    })
    if (probe.ok) {
      console.log(`✓ EidolonOS API reachable at ${API_BASE_URL}`)
    } else {
      console.warn(
        `⚠ EidolonOS API returned HTTP ${probe.status} — bot will still start, but conversations may fail.`,
      )
    }
  } catch (err) {
    console.warn(
      `⚠ Cannot reach EidolonOS API at ${API_BASE_URL}:`,
      err instanceof Error ? err.message : err,
    )
    console.warn('  Bot will still start — ensure the Next.js app is running.')
  }

  // Pre-flight 2: validate the TG token via getMe(). This ALSO caches
  // botInfo so that bot.launch() skips its own getMe call below.
  let botUsername = 'EidolonOS_Bot'
  try {
    const me = await bot.telegram.getMe()
    botUsername = me.username
    console.log(`✓ Telegram token valid — @${me.username} (id: ${me.id})`)
  } catch (err) {
    console.error(
      '❌ Telegram getMe failed (bad token or network):',
      err instanceof Error ? err.message : err,
    )
    process.exit(1)
  }

  // Drop pending updates so a restart doesn't replay old messages.
  await bot.telegram
    .deleteWebhook({ drop_pending_updates: true })
    .catch(() => {})

  // Launch the bot. CRITICAL: do NOT await bot.launch() — internally it
  // awaits startPolling() whose `for await` loop runs forever. Awaiting
  // would block the rest of main() (health server, shutdown handlers).
  // We fire-and-forget; .catch() handles any startup errors.
  bot.launch().catch((err) => {
    console.error('❌ Bot launch error:', err)
    process.exit(1)
  })
  console.log(`✓ @${botUsername} launched (long polling)`)

  healthServer.listen(BOT_PORT, () => {
    console.log(`✓ Health check on http://localhost:${BOT_PORT}/health`)
  })

  // Graceful shutdown.
  const shutdown = (signal: string) => {
    console.log(`\n⟢ ${signal} received — stopping bot…`)
    bot.stop(signal)
    healthServer.close(() => process.exit(0))
    // Force-exit after 5s if graceful close hangs.
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('❌ Fatal boot error:', err)
  process.exit(1)
})
