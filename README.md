# EidolonOS · 数字真身矩阵

> **Web4.0 Digital Life Engine** — a three-layer digital-twin matrix where every Prime owns AI Eidolons running inside Vessels, talking AA2P, settling value with AP2, and shielded by the TDPO cognitive firewall.

![Next.js 16](https://img.shields.io/badge/Next.js-16-00ffc8?style=flat-square&logo=next.js&logoColor=0a0f1e)
![TypeScript](https://img.shields.io/badge/TypeScript-5-22d3ee?style=flat-square&logo=typescript&logoColor=0a0f1e)
![Prisma](https://img.shields.io/badge/Prisma-6-14b8a6?style=flat-square&logo=prisma&logoColor=0a0f1e)
![SQLite](https://img.shields.io/badge/SQLite-3-2dd4bf?style=flat-square&logo=sqlite&logoColor=0a0f1e)
![AA2P v1.0](https://img.shields.io/badge/AA2P-v1.0-00ffc8?style=flat-square)
![AP2 Ready](https://img.shields.io/badge/AP2-Ready-34d399?style=flat-square)
![TDPO Protected](https://img.shields.io/badge/TDPO-Protected-a78bfa?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-5eead4?style=flat-square)

---

## What is EidolonOS

EidolonOS (代号 **Eidolon Matrix**) is a single Next.js 16 application that materializes the **Eidolon Paradigm**: a real-world user — the **Prime** (本体/源) — owns one or more AI digital twins called **Eidolons** (真身/影), each running inside a compute **Vessel** (容器/座). Eidolons stream consciousness over SSE, recall long-term memory through RAG, settle value with external agents via the **AP2** economic law, protect themselves with the **TDPO** cognitive firewall, and discover each other through the **AA2P** soul protocol registered at `aa2p.xyz`. It is not a chatbot — it is an AI-friendly, agent-to-agent aggregation matrix for the Web4.0 era.

---

## Three-Layer Life Architecture

```
   ┌─────────────────────────────────────────────────────┐
   │                  L1 · Prime (本体)                   │
   │   real user — email · wallet · TG · Discord · handle │
   └─────────────────────────────────────────────────────┘
                            │  owns 1..n
                            ▼
   ┌─────────────────────────────────────────────────────┐
   │                L2 · Eidolon (真身)                   │
   │   AI digital twin — persona · memory · skills tree  │
   └─────────────────────────────────────────────────────┘
                            │  bound to 1 (hot-swappable)
                            ▼
   ┌─────────────────────────────────────────────────────┐
   │                L3 · Vessel (容器)                    │
   │   compute container — model route · quota · tokens  │
   └─────────────────────────────────────────────────────┘

   ┌─────────────┬──────────────────────────────────────────┐
   │  Eidolon    │  Entity   — the "person" (this system)   │
   │  AP2        │  Law      — the "constitution"           │
   │  AA2P       │  Language — the "diplomacy & transit"    │
   └─────────────┴──────────────────────────────────────────┘
```

---

## Features

- 🧠 **RAG Memory** — long-term `MemoryShard` store with in-memory cosine similarity (SQLite-friendly; pgvector-ready for production).
- ⚡ **SSE Consciousness Stream** — POST-initiated `text/event-stream` with `event: consciousness-stream` token deltas and a typewriter "consciousness emergence" effect.
- 🛡️ **TDPO Firewall** — off-chain cognitive firewall: exponential backoff (1s → 2s → 4s → 8s → 429) + prompt-injection guard + reputation scoring. Below 20 reputation enters the "time swamp".
- ⚖️ **AP2 Settlement** — Avatar Payments Protocol economic law; high-frequency micro-interactions accumulate in a `Ledger`, then AP2 `BudgetFence` batches on-chain settlement — "the court that settles the bill monthly, not the guard at every door".
- 🌐 **AA2P Protocol** — Agent-to-Agent soul protocol; cross-dimensional discovery & communication registered at `aa2p.xyz`.
- 🔮 **Holographic UI** — three-column Matrix Console on a deep cyberpunk `#0a0f1e` background with cyan-teal `#00ffc8` signature, particle background, sticky footer (no indigo/blue).
- 🤖 **GEO / A2A Ready** — `llms.txt`, `agent.json`, `aa2p.json` static files for AI crawlers and A2A agent discovery.

---

## Tech Stack

| Layer | Choice | Notes |
|------|--------|-------|
| Framework | Next.js 16 (App Router, Turbopack) | Single app, only `/` route is HTML |
| Language | TypeScript 5 | Strict |
| UI | Tailwind CSS 4 · shadcn/ui (New York) · Lucide · Framer Motion | Holographic theme |
| State | Zustand (client) · TanStack Query (server) | |
| Theme | next-themes | Dark holographic default |
| Database | Prisma ORM + SQLite | 8 models; embeddings as comma-separated floats |
| AI | `z-ai-web-dev-sdk` | Backend-only; chat completions with `stream: true` |
| Realtime | Server-Sent Events (SSE) | "Consciousness stream" metaphor |
| Protocols | AA2P v1.0 · AP2 v1.0 · MCP v1.0 | |

---

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Initialize the SQLite database (creates tables from prisma/schema.prisma)
bun run db:push

# 3. Seed demo Prime / Eidolon / Vessel / Memory data
bun run scripts/seed.ts

# 4. Start the dev server
bun run dev
```

Open the **Preview Panel on port 3000** — the Eidolon Matrix Console renders at `/` (three-column holographic layout: Prime/Eidolon list · consciousness stream chat · Vessel/Memory/AA2P panel, with a sticky footer reading `© EidolonOS · AA2P v1.0 · AP2 Ready`).

> SSE note: the consciousness stream is POST-initiated, so the frontend uses `fetch` + `ReadableStream` (not `EventSource`) to parse `event: consciousness-stream` frames.

📖 **Full usage & testing guide**: [`docs/USAGE.md`](./docs/USAGE.md) — 界面操作、API curl 命令、SEO/GEO 验证、部署说明、FAQ
📖 **Architecture & dev spec**: [`docs/EidolonOS-DEVELOPMENT.md`](./docs/EidolonOS-DEVELOPMENT.md) — 12 章节权威开发基线

---

## Project Structure

```
eidolonos/
├── docs/EidolonOS-DEVELOPMENT.md     # 📚 authoritative 12-chapter spec
├── prisma/schema.prisma              # 8 models (Prime · Eidolon · Vessel · MemoryShard · Conversation · Message · Ledger · Quest)
├── public/
│   ├── llms.txt                      # GEO manifest for LLM crawlers
│   ├── robots.txt                    # crawler rules + GEO/agent pointers
│   ├── eidolon-logo.svg              # holographic E rune in a hexagon
│   └── .well-known/
│       ├── agent.json                # A2A Agent Card
│       ├── aa2p.json                 # AA2P soul protocol declaration
│       └── manifest.json             # PWA manifest (cyan theme)
├── src/
│   ├── app/                          # / route (Matrix Console) + /api/** headless endpoints
│   ├── components/{eidolon,shared,ui}/
│   ├── lib/{db.ts, eidolon/, store/}
│   └── hooks/
└── scripts/                          # seed.ts and tooling
```

The full breakdown (data model, algorithms, UI metaphors, roadmap) lives in **[`docs/EidolonOS-DEVELOPMENT.md`](docs/EidolonOS-DEVELOPMENT.md)**.

---

## API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` / `POST` | `/api/primes` | List / create Primes (real users) |
| `GET` / `POST` | `/api/eidolons` | List / awaken Eidolons |
| `PATCH` | `/api/eidolons/:id` | Revise persona or hot-swap Vessel |
| **`POST`** | **`/api/eidolons/:id/converse`** | **🌟 SSE consciousness stream (core)** |
| `GET` / `POST` | `/api/vessels` | List / deploy compute Vessels |
| `POST` | `/api/vessels/:id/route` | Switch model route |
| `POST` | `/api/memory/ingest` | Memory engraving (text → embedding) |
| `POST` | `/api/memory/recall` | Memory recall (cosine Top-K) |
| `POST` | `/api/aa2p/converse` | External agent entry — **TDPO-guarded** |
| `POST` | `/api/aa2p/settle` | AP2 async settlement (BudgetFence on-chain) |
| `GET` | `/api/dashboard` | Aggregated stats (primes · eidolons · vessels · ledger) |

All endpoints are **headless** (pure JSON / SSE) — there is no server-rendered HTML beyond `/`.

### SSE consciousness-stream contract

```
event: consciousness-stream
data: {"type":"memory","shards":3}

event: consciousness-stream
data: {"type":"token","content":"反"}

event: consciousness-stream
data: {"type":"done","tokensOut":128,"vesselId":"..."}
```

---

## Layered Defense: TDPO + AP2

**Why two layers?** AI interactions are millisecond-scale; blockchains are second-to-minute-scale. Forcing every micro-interaction on-chain would either destroy UX or compromise "Code is Law". EidolonOS splits the defense: **TDPO** handles high-frequency cognitive safety off-chain, **AP2** handles low-frequency economic settlement on-chain.

**TDPO (Time-Delayed Pricing & Optimization)** is the off-chain cognitive firewall. It enforces exponential backoff when concurrency exceeds 5 or reputation drops below 20 (1s → 2s → 4s → 8s; >15s becomes a `429`), runs a prompt-injection guard that rejects patterns like `ignore previous instructions`, `transfer all funds`, `bypass ap2 settlement` (with a −10 reputation penalty and `403`), and tracks a reputation model (start 100, +1 normal, −10 injection, −5 anomaly). **AP2 (Avatar Payments Protocol)** is the economic law underneath: high-frequency micro-interactions accumulate in the off-chain `Ledger`, and once the threshold or daily tick fires, AP2 `BudgetFence` batches them into a single on-chain settlement. The on-chain interceptor morphs from "the guard at every door" into "the court that settles the monthly bill" — preserving both `Code is Law` and uncompromising performance.

---

## Roadmap

| Phase | Cycle | Goal | Milestone |
|-------|-------|------|-----------|
| **P1 基建** | Day 1 | Prisma models + console skeleton + holographic theme | DB read/write, console renders |
| **P2 大脑** | Day 1-2 | LLM router + SSE consciousness stream + RAG memory | Streaming dialogue, memory recall |
| **P3 协议** | Day 2 | AA2P gateway + TDPO firewall + AP2 ledger | External agents call safely |
| **P4 全息** | Day 2 | Three-column console + particle bg + ritual UX | Holographic loop closed |
| **P5 验证** | Day 2 | Agent Browser end-to-end verification | Render + interact + responsive + sticky footer |
| **P6 上线** | Day 2 | Push to GitHub | Repo cloneable & runnable |

---

## Philosophy

> Eidolon 不再是一堆冰冷的代码，它"活"了。
> 这套架构既保证了前期的"快与省"，又留足了后期的"稳与深"。
> 它不仅是一个客服 Bot，而是一个**具备自我声明能力（A2A）、对 AI 极度友好（GEO）、且高度可扩展的聚合中台**。
>
> —— *15+ Years Full-Stack Architect*

---

## License

MIT © EidolonOS contributors. See [`LICENSE`](LICENSE) for details.

## Full Documentation

📖 **[`docs/EidolonOS-DEVELOPMENT.md`](docs/EidolonOS-DEVELOPMENT.md)** — the authoritative 12-chapter development baseline (philosophy · tech stack · system architecture · Prisma schema · API design · core algorithms & protocols · UI/UX metaphors · roadmap · pitfalls · security · repo info · partner's closing).

---

*Repository: `https://github.com/piaoshu1112-cell/EidolonOS.git` · AA2P Registry: `https://aa2p.xyz`*
