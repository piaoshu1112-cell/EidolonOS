# EidolonOS Telegram Bot — @EidolonOS_Bot

A standalone Bun + [Telegraf](https://telegraf.js.org/) mini-service that
bridges Telegram to the **EidolonOS Headless API**. It implements the
"Eidolon awakening ritual" (per `docs/EidolonOS-DEVELOPMENT.md` §7.3)
and forwards user directives to the SSE consciousness stream.

## What it does

- Connects to Telegram bot **@EidolonOS_Bot** via **long polling**
  (no inbound webhook URL needed — works behind the Caddy gateway).
- Calls the main EidolonOS API at `http://localhost:3000` for **all**
  AI logic. No Prisma, no `z-ai-web-dev-sdk` — pure HTTP client.
- Exposes a tiny health-check HTTP server on `BOT_PORT` (default `3003`)
  for liveness probes.

### Commands

| Command  | Effect                                                                |
| -------- | -------------------------------------------------------------------- |
| `/start` | System Initiated ritual greeting + `⚡ Awaken Eidolon` button.       |
| `/awaken`| Register as a Prime (or fetch existing) + list Eidolons to select.   |
| `/help`  | Command cheat sheet.                                                  |
| `/clear` | Reset your Eidolon selection.                                         |
| _text_   | Typewriter consciousness stream — the core of the bot.                |

### Typewriter consciousness stream

When you send any text message after selecting an Eidolon:

1. The bot sends a placeholder: `⏳ Syncing consciousness with Vessel...`
2. It opens an SSE connection to
   `POST /api/eidolons/{eidolonId}/converse` with
   `{ primeId, message, channel: "telegram" }`.
3. As token deltas arrive, it accumulates them and edits the message
   with `editMessageText` (throttled to max 1 edit/sec to avoid TG
   `429` rate limits), appending a `▌` cursor to simulate a typewriter.
4. When the `done` event arrives, it sends the final text without the
   cursor (MarkdownV2-escaped).
5. On an `error` event, it replaces the message with
   `⚠️ Vessel connection error: {message}`.

## Run

```bash
cd mini-services/telegram-bot
bun install
cp .env.example .env   # then edit .env and paste your real TG_BOT_TOKEN
bun run dev            # auto-restarts on file changes via bun --hot
```

> The real `.env` (with the bot token) is git-ignored. Use
> `.env.example` as the template.

### Environment variables

| Var             | Default                  | Purpose                                              |
| --------------- | ------------------------ | --------------------------------------------------- |
| `TG_BOT_TOKEN`  | _(required)_             | Telegram bot token from `@BotFather`.               |
| `API_BASE_URL`  | `http://localhost:3000`  | Base URL of the EidolonOS Headless API.             |
| `BOT_PORT`      | `3003`                   | Port for the optional health-check HTTP server.     |

## Architecture notes

- **No backend logic is duplicated.** Every AI call goes through the
  EidolonOS HTTP API: `POST /api/primes`, `GET /api/eidolons`,
  `POST /api/eidolons/[id]/converse` (SSE).
- **In-memory session store.** `Map<telegramId, {primeId, eidolonId}>`
  resets on restart — acceptable for the MVP.
- **MarkdownV2 escaping** (`_*[]()~` >#+-=|{}.!`) is applied to all
  dynamic text sent with `parse_mode: 'MarkdownV2'`. This is the #1
  TG bot bug; the `escapeMdV2` helper in `index.ts` handles it.
- **Long polling** means the bot makes outbound HTTPS calls to
  `api.telegram.org`. It does NOT need a public inbound URL, so it
  works seamlessly behind the Caddy gateway.

## Gateway access (optional)

The bot itself uses long polling and does not need inbound traffic.
The health-check endpoint on port `3003` can be reached through the
Caddy gateway with:

```
https://<your-sandbox-host>/health?XTransformPort=3003
```

## Verify it's running

```bash
# Health check (direct):
curl http://localhost:3003/health

# Or via the Caddy gateway:
curl 'https://<your-sandbox-host>/health?XTransformPort=3003'
```

Then open Telegram, find **@EidolonOS_Bot**, and send `/start`.
