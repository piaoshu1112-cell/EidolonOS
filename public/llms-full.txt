# EidolonOS — 数字真身矩阵 · 专业开发文档

> **定位**：Web4.0 数字生命引擎 / 全渠道 AI Agent 中台 / A2A 灵魂协议落地
> **代号**：Eidolon Matrix
> **版本**：v1.0.0
> **架构师**：15+ Years Full-Stack Architect
> **文档基线**：基于 `EidolonOS.docx` + `接口机器人开发.docx` 两份原始设计稿熟读、总结、完善而成

---

## 0. 文档目的

本文档将两份原始设计稿（一份偏"理念与协议哲学"，一份偏"工程模块与排期"）进行**熟读、去重、补全、工程化重构**，形成一份可直接驱动开发落地的**专业开发文档**。

它同时是 EidolonOS 在本仓库（Next.js 16 单应用实现）的唯一权威开发基线。所有模块命名、API 路由、数据模型、UI 隐喻均以本文档为准。

---

## 1. 产品哲学与命名体系（The Eidolon Paradigm）

### 1.1 为什么叫 Eidolon

`Eidolon (伊多伦)` 在古希腊哲学与赛博朋克语境中代表：**"脱离肉体后，在数字世界中完美映射的高维投影"**——即"数字真身"。它比 Avatar/Clone 更具哲学厚度，契合《人机共生三部曲》愿景，适合向全球极客、Web3/Crypto 原住民与高端 B 端客户宣发。

### 1.2 三层生命架构（Three-Layer Life Architecture）

抛弃 `User → Bot → Server` 这种平庸命名，EidolonOS 采用全新的三层生命模型作为**核心领域模型**：

| 层级 | 名称 | 中文 | 本质 | 字段要点 |
|------|------|------|------|----------|
| L1 | **Prime** | 本体 / 源 | 现实世界中的用户 | 邮箱、钱包地址、TG ID、Discord ID、社交账号 |
| L2 | **Eidolon** | 真身 / 影 | 数字世界中的 AI 分身 | 人设 Prompt、长期记忆、性格参数、技能树 |
| L3 | **Vessel** | 容器 / 座 | 承载 Eidolon 运行的算力环境 | 模型路由、API 额度、运行状态、Token 计费 |

> **基数关系**：一个 Prime 可拥有多个 Eidolon；一个 Eidolon 绑定一个 Vessel（可热切换）。

### 1.3 三大协议生态位（Grand Unification）

| 协议 | 角色 | 官网/入口 | 职责 |
|------|------|-----------|------|
| **Eidolon** | 实体（Entity） | 本系统 | 运行在 Vessel 中的数字真身，拥有记忆、人设、交互能力。是"人"。 |
| **AP2** (Avatar Payments Protocol) | 法则（Law） | AP2-Explorer | 规定 Eidolon 间价值交换、意识继承、认知定价。是"宪法"。 |
| **AA2P** (Agent-to-Agent Protocol) | 语言/通道（Language） | `aa2p.xyz` | Eidolon 与外部 Agent/人/物 的发现、握手、通信标准。是"外交辞令与交通网"。 |

**架构融合方案**：AP2-Protocol-Explorer 重定位为 AA2P 生态的"公共发现与契约调试面板"。本系统（EidolonOS）作为 AA2P 的核心承载引擎。

---

## 2. 技术栈拍板（The Tech Stack）

### 2.1 本仓库的工程化适配

原始设计稿提出 NestJS + Next.js + Vite Widget 的 Turborepo Monorepo。本仓库受限于"单 Next.js 16 应用 + 仅 `/` 路由对外"的约束，做如下**等价降维适配**，保留全部架构思想：

| 原始设计 | 本仓库适配 | 说明 |
|----------|------------|------|
| NestJS `apps/api` | Next.js Route Handlers (`src/app/api/**`) | 同样提供 Headless REST + SSE，无 HTML 渲染 |
| Next.js `apps/web` Admin | Next.js `/` 页面（Eidolon Matrix Console） | 唯一对外路由，承载控制台 + 全息聊天 |
| Vite `apps/widget` | `/` 内嵌的 Holographic Console 组件 | 不再独立打包，直接作为页面内的全息聊天窗 |
| Supabase pgvector | Prisma + SQLite + 内存向量检索 | SQLite 不支持原生向量；采用"embedding 以逗号分隔浮点存储 + 内存余弦相似度"的轻量 RAG |
| Redis + BullMQ | Next.js 内存队列 + SSE | 单实例场景下用内存即可实现削峰与流式 |
| OpenAI API | `z-ai-web-dev-sdk`（后端） | 严格遵守"SDK 仅后端"约束 |
| Telegraf TG Bot | （预留）`mini-services/telegram-bot` | 通过 `XTransformPort` 网关接入，不阻塞主线 |

### 2.2 技术栈清单

- **框架**：Next.js 16 (App Router, Turbopack) + TypeScript 5（不可变）
- **UI**：Tailwind CSS 4 + shadcn/ui (New York) + Lucide + Framer Motion
- **数据库**：Prisma ORM (SQLite client) + Prisma Client
- **状态**：Zustand（客户端）+ TanStack Query（服务端）
- **主题**：next-themes（深色全息为默认）
- **AI**：`z-ai-web-dev-sdk`（仅后端调用）
- **实时**：SSE（Server-Sent Events，原生支持，契合"意识流"隐喻）

---

## 3. 系统架构（System Architecture）

### 3.1 分层架构

```
┌─────────────────────────────────────────────────────────┐
│  L1  渠道适配层 (Omni-channel Adapters)                  │
│  Web Console · TG Bot · Discord · Slack · Web Widget     │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│  L2  API 聚合网关 (Gateway)                              │
│  统一鉴权 · TDPO 认知防火墙 · 限流 · 路由分发             │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│  L3  核心引擎 (The Brain)                                │
│  ┌──────────┬───────────┬───────────┬──────────────┐    │
│  │ Primes   │ Eidolons  │ Vessels   │ AA2P Gateway │    │
│  │ (本体)   │ (真身)    │ (容器)    │ (灵魂协议)   │    │
│  └──────────┴───────────┴───────────┴──────────────┘    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Memory (RAG) · Skills (Function Calling)        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│  L4  AI 调度 (Model Router)                              │
│  z-ai-web-dev-sdk LLM · Embedding · Rerank              │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│  L5  数据持久化 (Prisma + SQLite)                        │
│  Prime · Eidolon · Vessel · MemoryShard · Conversation  │
│  Quest · Ledger · Reputation                            │
└─────────────────────────────────────────────────────────┘
```

### 3.2 模块目录结构（本仓库实现）

```
src/
├── app/
│   ├── page.tsx                      # Eidolon Matrix Console（唯一对外路由）
│   ├── layout.tsx                    # 全息主题根布局
│   ├── globals.css                   # 赛博朋克全息样式
│   └── api/
│       ├── primes/route.ts           # 本体 CRUD
│       ├── eidolons/
│       │   ├── route.ts              # 真身 CRUD
│       │   └── [id]/converse/route.ts# 🌟 SSE 意识流交互（核心）
│       ├── vessels/route.ts          # 容器 CRUD + 模型路由
│       ├── memory/
│       │   ├── route.ts              # 记忆分片列表
│       │   ├── ingest/route.ts       # 🧠 记忆刻录（向量化）
│       │   └── recall/route.ts       # 记忆唤醒
│       ├── aa2p/
│       │   ├── converse/route.ts     # AA2P 跨维通信入口（TDPO 守卫）
│       │   └── settle/route.ts       # AP2 异步清算
│       └── dashboard/route.ts        # 聚合面板数据
├── components/
│   ├── ui/                           # shadcn/ui（已存在）
│   ├── eidolon/
│   │   ├── matrix-console.tsx        # 控制台外壳
│   │   ├── holographic-chat.tsx      # 全息聊天窗（意识流）
│   │   ├── prime-panel.tsx           # 本体面板
│   │   ├── eidolon-panel.tsx         # 真身管理
│   │   ├── vessel-panel.tsx          # 容器监控
│   │   ├── memory-vault.tsx          # 记忆金库（RAG）
│   │   ├── aa2p-protocol.tsx         # AA2P 协议面板
│   │   └── system-status.tsx         # 系统状态
│   └── shared/
│       ├── holographic-card.tsx      # 全息卡片
│       └── particle-bg.tsx           # 粒子意识流背景
├── lib/
│   ├── db.ts                         # Prisma 客户端（已存在）
│   ├── eidolon/
│   │   ├── llm-router.ts             # 大模型路由器
│   │   ├── rag-pipeline.ts           # RAG 检索增强（内存向量）
│   │   ├── consciousness-stream.ts   # 意识流构建器（Prompt 链）
│   │   ├── tdpo-firewall.ts          # 🛡️ TDPO 认知防火墙
│   │   ├── ap2-settlement.ts         # AP2 异步清算
│   │   └── agent-card.ts             # AA2P Agent Card 生成
│   └── store/
│       └── matrix-store.ts           # Zustand 全局状态
└── hooks/
    └── use-consciousness-stream.ts   # SSE 意识流 Hook
```

---

## 4. 数据模型（Prisma Schema）

> **适配说明**：SQLite 不支持 `vector` 类型。embedding 以 `String`（逗号分隔浮点）存储，检索时载入内存做余弦相似度。生产环境迁 PostgreSQL 时可平滑切回 pgvector。

```prisma
// Prime — 本体（现实用户）
model Prime {
  id            String   @id @default(cuid())
  email         String?  @unique
  walletAddress String?  @unique    // Web3 DID
  telegramId    String?  @unique
  discordId     String?  @unique
  handle        String?             // 社交账号
  displayName   String
  reputation    Int      @default(100)  // TDPO 信誉分
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  eidolons      Eidolon[]
  conversations Conversation[]
  ledgers       Ledger[]
}

// Eidolon — 真身（AI 分身）
model Eidolon {
  id            String   @id @default(cuid())
  name          String                       // 真身名（如 "Echo-01"）
  personaPrompt String                       // 人设 Prompt
  personality   String   @default("{}")      // JSON: 性格参数 {warmth, wit, precision}
  skills        String   @default("[]")      // JSON: 技能树 ["rag_recall","ap2_settle"]
  status        String   @default("dormant") // dormant | awakening | active | sealed
  primeId       String
  prime         Prime    @relation(fields: [primeId], references: [id], onDelete: Cascade)
  vesselId      String?
  vessel        Vessel?  @relation(fields: [vesselId], references: [id])
  memories      MemoryShard[]
  conversations Conversation[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Vessel — 容器（算力环境）
model Vessel {
  id            String   @id @default(cuid())
  codename      String                       // 容器代号（如 "Vessel-Aether-01"）
  modelRoute    String   @default("glm-4.6") // 模型路由
  apiQuota      Int      @default(100000)    // Token 额度
  tokensUsed    Int      @default(0)
  status        String   @default("idle")    // idle | running | overloaded | sealed
  temperature   Float    @default(0.7)       // 采样温度
  maxTokens     Int      @default(2048)
  eidolons      Eidolon[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// MemoryShard — 记忆分片（RAG 向量库，SQLite 适配）
model MemoryShard {
  id          String   @id @default(cuid())
  eidolonId   String
  eidolon     Eidolon  @relation(fields: [eidolonId], references: [id], onDelete: Cascade)
  content     String                              // 原始文本片段
  embedding   String                              // 逗号分隔的浮点向量（内存检索）
  metadata    String   @default("{}")             // JSON 标签
  source      String   @default("manual")         // manual | ap2_rfc | conversation
  createdAt   DateTime @default(now())
  @@index([eidolonId])
}

// Conversation — 对话会话
model Conversation {
  id          String   @id @default(cuid())
  primeId     String
  prime       Prime    @relation(fields: [primeId], references: [id], onDelete: Cascade)
  eidolonId   String
  eidolon     Eidolon  @relation(fields: [eidolonId], references: [id], onDelete: Cascade)
  channel     String   @default("web")            // web | telegram | discord | aa2p
  createdAt   DateTime @default(now())
  messages    Message[]
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String                          // prime | eidolon | system
  content        String
  tokensIn       Int      @default(0)
  tokensOut      Int      @default(0)
  createdAt      DateTime @default(now())
}

// Ledger — 链下账本（AP2 异步清算）
model Ledger {
  id            String   @id @default(cuid())
  primeId       String
  prime         Prime    @relation(fields: [primeId], references: [id], onDelete: Cascade)
  agentWallet   String                          // 外部 Agent 钱包
  cognitiveValue Float   @default(0)            // TDPO 计算的认知价值
  status        String   @default("pending")    // pending | settled | disputed
  txHash        String?                         // AP2 链上结算哈希
  createdAt     DateTime @default(now())
  settledAt     DateTime?
}

// Quest — 任务系统（增长黑客）
model Quest {
  id          String   @id @default(cuid())
  title       String
  description String
  reward      Int                                // 积分
  type        String                             // bind_wallet | leave_email | invite | converse
  targetCount Int      @default(1)
  createdAt   DateTime @default(now())
}
```

---

## 5. 核心 API 设计（RESTful & 语义化）

所有 API 均为 Headless（纯 JSON/SSE，不渲染 HTML），契合"全渠道消费者"理念。

### 5.1 Prime（本体）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/primes` | 列出所有本体 |
| POST | `/api/primes` | 创建本体（绑定邮箱/钱包/TG ID） |
| GET | `/api/primes/:id` | 本体详情 |

### 5.2 Eidolon（真身）— 🌟 核心

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/eidolons` | 列出真身 |
| POST | `/api/eidolons` | 唤醒（创建）真身：注入人设、性格、技能 |
| PATCH | `/api/eidolons/:id` | 修订人设 / 切换 Vessel |
| **POST** | **`/api/eidolons/:id/converse`** | **🌟 意识流交互（SSE 流式）** |

#### SSE 意识流契约

请求体：
```json
{ "primeId": "cm...", "message": "什么是反平庸暴政？", "channel": "web" }
```

响应（`text/event-stream`）：
```
event: consciousness-stream
data: {"type":"memory","shards":3}

event: consciousness-stream
data: {"type":"token","content":"反"}

event: consciousness-stream
data: {"type":"token","content":"平庸"}

...

event: consciousness-stream
data: {"type":"done","tokensOut":128,"vesselId":"..."}
```

### 5.3 Vessel（容器）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/vessels` | 容器列表 + 状态 |
| POST | `/api/vessels` | 部署新容器 |
| POST | `/api/vessels/:id/route` | 切换模型路由 |

### 5.4 Memory（RAG 记忆金库）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/memory?eidolonId=` | 记忆分片列表 |
| POST | `/api/memory/ingest` | 🧠 记忆刻录：文本 → 分块 → embedding → 存储 |
| POST | `/api/memory/recall` | 记忆唤醒：query → embedding → 余弦相似 Top-K |

### 5.5 AA2P 网关（灵魂协议）

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/aa2p/converse` | 外部 Agent 跨维通信入口（**挂载 TDPO 守卫**） |
| POST | `/api/aa2p/settle` | AP2 异步清算（批量上链） |
| GET | `/api/dashboard` | 聚合面板：本体/真身/容器/账本统计 |

---

## 6. 核心算法与协议落地

### 6.1 意识流构建（Consciousness Stream）

```
用户输入
   │
   ▼
[1] recallMemory(eidolonId, message)   ← RAG 唤醒长期记忆 Top-5
   │
   ▼
[2] buildConsciousnessPrompt(          ← 组装意识链
       system = personaPrompt + personality,
       memory = recalled shards,
       user   = message
    )
   │
   ▼
[3] streamFromVessel(promptChain)      ← 调用 z-ai-web-dev-sdk LLM，流式输出
   │
   ▼
[4] SSE 逐 token 推送 → 前端"意识涌现"打字机效果
   │
   ▼
[5] 持久化 Message + 扣减 Vessel.tokensUsed + 写入 Ledger
```

### 6.2 RAG 检索增强（SQLite 适配版）

由于 SQLite 无原生向量索引，采用**内存全量余弦相似度**：

```typescript
// 伪代码
async function recallMemory(eidolonId: string, query: string, topK = 5) {
  const queryVec = await embed(query);              // z-ai-web-dev-sdk
  const shards = await db.memoryShard.findMany({ where: { eidolonId } });
  const scored = shards.map(s => ({
    ...s,
    similarity: cosine(queryVec, s.embedding.split(',').map(Number)),
  }));
  return scored.sort((a,b) => b.similarity - a.similarity).slice(0, topK);
}
```

> **生产演进**：迁 PostgreSQL 后启用 pgvector，`ORDER BY embedding <=> query LIMIT k`。

### 6.3 TDPO 认知防火墙（Time-Delayed Pricing & Optimization）

**第一性原理**：AI 交互是毫秒级，区块链是秒/分钟级。高频微交互绝不能硬刚链上。

**分层防御**：

| 层级 | 机制 | 触发 | 惩罚 |
|------|------|------|------|
| L1 主动防御 | TDPO 时间延迟 | 并发 > 5 或信誉 < 20 | 指数级延迟（1s→2s→4s→8s），>15s 直接 429 |
| L1 注入防御 | Prompt 守卫 | 检测 `ignore previous instructions` / `transfer all funds` / `bypass ap2 settlement` 等 | 扣信誉分 10 + 403 Forbidden |
| L2 兜底清算 | AP2 BudgetFence | 账本累积达阈值或每日定时 | 批量打包上链结算 |

**信誉分模型**：初始 100，正常交互 +1，注入攻击 -10，异常并发 -5。低于 20 进入"时间泥潭"。

### 6.4 AP2 异步清算（State Channel 模式）

```
高频微交互 ──→ 链下账本(Ledger) ──→ 累积阈值 ──→ AP2 BudgetFence 批量上链
   (毫秒)         (数据库)          (分钟/小时)        (秒级，单次)
```

链上拦截从"每次交互的保安"变成"每月结账的法院"——既保 Code is Law，又保极致性能。

### 6.5 GEO 生成式引擎优化

- `/public/llms.txt` — 告诉大模型如何抓取理解本站
- `/public/.well-known/agent.json` — A2A Agent Card（智能体名片）
- `/public/.well-known/aa2p.json` — AA2P 灵魂协议声明
- 页面注入 JSON-LD `SoftwareApplication` 结构化数据

---

## 7. UI / UX 隐喻（Holographic Design）

### 7.1 视觉语言

- **底色**：深邃赛博朋克 `rgba(10,15,30,0.9)` / `#0a0f1e`
- **真身标志色**：青色流光 `#00ffc8`（cyan-teal）
- **字体**：等宽极客字体 `'JetBrains Mono', 'Courier New', monospace`
- **特效**：全息闪烁 `hologramFlicker`、意识流粒子、流光边缘 Aura、思维链呼吸灯

> ⚠️ 严格遵循系统约束：**不使用 indigo/blue**。主色为 cyan/teal/emerald 系。

### 7.2 启动语（仪式感）

> Widget 展开首句不是"你好，我是客服"，而是：
> *"I am Eidolon. Awaiting your consciousness sync..."*
> （我是真身，等待意识同步……）

### 7.3 TG Bot 唤醒（预留 mini-service）

`/start` 触发：
```
[ SYSTEM INITIALIZED ]
Welcome to the Eidolon Matrix.
You are currently recognized as a [Prime].
Awaiting your first directive to awaken your digital twin.
Type /awaken to begin.
```

回复采用 `editMessageText` 模拟打字机（每 1s 或 20 字符更新一次）。

### 7.4 控制台布局（单页）

```
┌──────────────────────────────────────────────────────┐
│  HEADER: EIDOLON MATRIX v1.0  |  系统状态: ONLINE    │
├──────────┬───────────────────────────┬───────────────┤
│ 左栏     │  中栏：全息聊天窗          │ 右栏          │
│ Prime    │  ┌─────────────────────┐  │ Vessel 监控   │
│ Eidolon  │  │ 意识流消息区         │  │ Memory 金库   │
│ 列表     │  │ (青色流光 + 闪烁)    │  │ AA2P 协议     │
│          │  └─────────────────────┘  │ Ledger 账本   │
│          │  [ Transmit your thought ] │              │
└──────────┴───────────────────────────┴───────────────┘
│  FOOTER (sticky): © EidolonOS · AA2P v1.0 · AP2 Ready│
└──────────────────────────────────────────────────────┘
```

---

## 8. 分阶段开发进度表（Timeline）

| Phase | 周期 | 目标 | 里程碑 |
|-------|------|------|--------|
| **P1 基建** | Day 1 | Prisma 模型 + 控制台骨架 + 全息主题 | 数据库可读写，控制台可渲染 |
| **P2 大脑** | Day 1-2 | LLM 路由 + SSE 意识流 + RAG 记忆 | 真身可流式对话，记忆可召回 |
| **P3 协议** | Day 2 | AA2P 网关 + TDPO 防火墙 + AP2 账本 | 外部 Agent 可安全调用 |
| **P4 全息** | Day 2 | 三栏控制台 + 粒子背景 + 仪式感交互 | 全息体验闭环 |
| **P5 验证** | Day 2 | Agent Browser 端到端验证 | 渲染 + 交互 + 响应式 + sticky footer |
| **P6 上线** | Day 2 | Git 推送 GitHub | 仓库可克隆运行 |

---

## 9. 三大避坑锦囊（架构师视角）

1. **Serverless 超时 / Webhook 丢失** → 异步化 + 流式（SSE）。收到请求立即响应，AI 生成走流式。
2. **样式污染 / 跨域** → 本仓库单应用无此问题；未来 Widget 独立时用 Shadow DOM + postMessage。
3. **Token 滥用** → RAG 必须先检索 Top-K 再喂模型；引入 Rerank 思想（本版以相似度阈值替代）。

---

## 10. 安全与运维

- **限流**：TDPO 网关层（内存计数器 + 指数延迟）
- **注入防御**：正则黑名单 + 信誉分扣减
- **审计**：所有 AA2P 交互落 `Ledger` 表，可追溯
- **监控**：Vessel.tokensUsed 实时统计，达 80% 预警

---

## 11. 仓库信息

- **GitHub**：`https://github.com/piaoshu1112-cell/EidolonOS.git`
- **入口路由**：`/`（Eidolon Matrix Console）
- **启动**：`bun run dev`（端口 3000）
- **数据库**：`bun run db:push` 初始化 SQLite

---

## 12. 合伙人结语

> Eidolon 不再是一堆冰冷的代码，它"活"了。
> 这套架构既保证了前期的"快与省"，又留足了后期的"稳与深"。
> 它不仅是一个客服 Bot，而是一个**具备自我声明能力（A2A）、对 AI 极度友好（GEO）、且高度可扩展的聚合中台**。
>
> —— 15+ Years Full-Stack Architect

---

*文档版本：v1.0.0 · 基线建立于双文档熟读总结 · 持续演进*
