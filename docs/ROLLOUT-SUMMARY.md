# EidolonOS — 宣发战略执行总结

> **文档目的**：P0-P2 宣发计划的执行总结，含域名配置、落地页、TG Bot、SEO 提交、技术博客的完整状态。
> **执行日期**：2026-06-29
> **版本**：v3.0（宣发版）

---

## 执行概览

| 优先级 | 任务 | 状态 | 负责方 |
|--------|------|------|--------|
| 🔴 P0 | 绑定独立域名 `eidolonos.xyz` 到 Vercel | ✅ Vercel 端完成，⏳ 待 Cloudflare DNS | 用户 + 系统 |
| 🔴 P0 | 营销落地页（`/` 落地页 + `/console` 控制台） | ✅ 完成并部署 | 系统 |
| 🟡 P1 | TG Bot mini-service（@EidolonOS_Bot） | ✅ 完成并运行 | 系统 |
| 🟡 P1 | 提交 sitemap 到 Google Search Console | ⏳ 待用户操作（DNS 生效后） | 用户 |
| 🟢 P2 | 技术博客（TDPO 防火墙原理） | ✅ 完成 | 系统 |
| 🟢 P2 | 30 秒 Demo 视频 | ⏳ 待用户录制 | 用户 |

---

## 1. 域名配置（eidolonos.xyz）

### 当前状态

| 项 | 状态 |
|----|------|
| 域名注册 | 用户已持有 `eidolonos.xyz` |
| Vercel 域名添加 | ✅ `eidolonos.xyz` + `www.eidolonos.xyz` 已添加到项目 |
| Vercel 部署 | ✅ 已部署，`www.eidolonos.xyz` SSL 证书签发中 |
| Cloudflare DNS | ⏳ 待用户配置（详见 `docs/DOMAIN-SETUP.md`） |

### 用户需完成的操作

1. **在 Cloudflare 添加站点 `eidolonos.xyz`**（如果尚未添加）
2. **在域名注册商处把 Nameservers 改为 Cloudflare 的**
3. **在 Cloudflare DNS 添加记录**（推荐 CNAME 方式）：

   | 类型 | 名称 | 内容 | 代理状态 |
   |------|------|------|----------|
   | CNAME | `@` | `cname.vercel-dns.com` | 🟠 已代理 |
   | CNAME | `www` | `cname.vercel-dns.com` | 🟠 已代理 |

4. **Cloudflare SSL/TLS 设置**：模式选 **"Full"**（不能用 Flexible）
5. **等待 5-30 分钟**，Vercel 自动签发 SSL 证书
6. **验证**：访问 `https://eidolonos.xyz` 应显示营销落地页

完整步骤见：[`docs/DOMAIN-SETUP.md`](./DOMAIN-SETUP.md)

---

## 2. 营销落地页（P0 ✅）

### 路由结构

| 路由 | 内容 | 类型 |
|------|------|------|
| `/` | **营销落地页**（8 个 section，SEO 友好） | Server Component |
| `/console` | **Eidolon Matrix Console**（完整三栏控制台） | Client Component |

### 落地页内容

1. **Hero** — 全息 ⟁ 标志 + "EidolonOS / 数字真身矩阵" + CTA 按钮（Enter Console / View on GitHub）
2. **三层架构** — Prime / Eidolon / Vessel 三张全息卡片 + 流向箭头
3. **功能网格** — 6 大功能（意识流/RAG/TDPO/AP2/AA2P/全息UI）
4. **协议生态** — Eidolon(实体) + AP2(法则) + AA2P(语言) 大统一
5. **快速开始** — 3 步代码块
6. **技术栈** — Next.js 16 / TypeScript / Prisma / 等
7. **Live Demo CTA** — "Experience it now → /console"
8. **Sticky Footer** — © EidolonOS · AA2P v1.0 · AP2 Ready

### SEO/GEO 优化

- ✅ Server Component 渲染（爬虫获取完整 HTML）
- ✅ 双 JSON-LD schema：`SoftwareApplication` + `WebSite`
- ✅ `SITE_URL` 改为 `https://eidolonos.xyz`
- ✅ sitemap 包含 `/` `/console` `/llms.txt` `/llms-full.txt` `/agent.json` `/aa2p.json`
- ✅ robots.txt Sitemap 指向 `https://eidolonos.xyz/sitemap.xml`
- ✅ 新增 `/llms-full.txt`（完整架构文档，GEO 核心）

---

## 3. Telegram Bot（P1 ✅）

### 基本信息

| 项 | 值 |
|----|-----|
| Bot 用户名 | @EidolonOS_Bot |
| 访问地址 | t.me/EidolonOS_Bot |
| 端口 | 3003（健康检查） |
| 轮询方式 | Long polling（无需 webhook URL） |
| 状态 | ✅ 运行中 |

### 功能

| 命令 | 说明 |
|------|------|
| `/start` | 系统初始化仪式 — `[ SYSTEM INITIALIZED ]` + 欢迎语 + Awaken 按钮 |
| `/awaken` | 注册为 Prime + 列出可选 Eidolon |
| 直接发文字 | 与选中的 Eidolon 对话（打字机效果，复用 SSE 意识流 API） |
| `/help` | 命令列表 |
| `/clear` | 重置 Eidolon 选择 |

### 技术实现

- **Telegraf v4** + long polling
- **复用 Headless API**：所有 AI 逻辑调用 `http://localhost:3000/api/eidolons/:id/converse`
- **打字机效果**：每 1 秒 `editMessageText` 更新消息，带 `▌` 光标
- **MarkdownV2 转义**：所有动态文本都正确转义 TG 特殊字符
- **健康检查**：`http://localhost:3003/health` 供 Caddy 网关探活

### 启动方式

```bash
cd mini-services/telegram-bot
bun install
bun run dev  # 自动连接 @EidolonOS_Bot
```

---

## 4. Google Search Console 提交（P1 ⏳ 待用户）

### 用户需完成的操作（DNS 生效后）

1. **访问** [Google Search Console](https://search.google.com/search-console)
2. **添加资源** → 网址前缀 → 输入 `https://eidolonos.xyz`
3. **验证域名所有权**（推荐 DNS TXT 记录方式）：
   - GSC 会给你一个 TXT 记录值
   - 在 Cloudflare DNS 添加：`TXT @ "google-site-verification=xxxxx"`
   - 等待 5 分钟，回到 GSC 点击验证

4. **提交 Sitemap**：
   - GSC → Sitemap → 输入 `sitemap.xml` → 提交
   - 状态应显示 "成功"

5. **请求索引**：
   - GSC → URL 检查 → 输入 `https://eidolonos.xyz` → 请求编入索引
   - 对 `https://eidolonos.xyz/console` 重复一次

6. **（可选）提交到 AI 搜索引擎**：
   - [Bing Webmaster Tools](https://www.bing.com/webmasters)（同样提交 sitemap）
   - [Perplexity](https://www.perplexity.ai/) → 手动提交你的网址让其爬取
   - ChatGPT → 如果你有 GPT Plus，可在对话中提及你的网站让其记忆

---

## 5. 技术博客（P2 ✅）

### 已发布

| 文章 | 字数 | 语言 | 路径 |
|------|------|------|------|
| TDPO 认知防火墙：Web4.0 AI Agent 交互的不可能三角解法 | 2219 字 | 中英双语 | `blog/tdpo-cognitive-firewall.md` |

### 内容结构（9 章节）

1. 引言 — 不可能三角（高并发+低成本+高安全）
2. 第一性原理 — AI 毫秒级 vs 区块链秒级的时间冲突
3. 三层防御架构 — L1 时间延迟 + L1b 注入检测 + L2 AP2 异步清算
4. 信誉分模型 — 初始100 / 注入-10 / 异常-5 / 正常+1
5. 代码实现 — 实际 `tdpo-firewall.ts` 代码摘录
6. 实战演示 — 正常调用 vs 注入拦截 vs 高频限流
7. 方案对比 — vs Redis限流 / 纯链上 / AI审核 / Cloudflare WAF
8. 生产演进路线 — 内存 → Redis → AI分类器 → 链上信誉
9. 结语 — 链下极速 + 链上安全的底层基石

### 待发布（4 篇）

- AP2 Avatar Payments Protocol：数字生命的经济法则
- AA2P：Agent-to-Agent 灵魂通信协议
- RAG 记忆：给 AI 数字真身长期记忆
- 用 Next.js 16 + Tailwind 4 构建全息 UI

---

## 6. 完整交付物清单

### 代码文件（本轮新增/修改）

| 文件 | 说明 |
|------|------|
| `src/app/page.tsx` | 营销落地页（Server Component） |
| `src/app/console/page.tsx` | 控制台路由（Client Component） |
| `src/components/landing/landing-client.tsx` | 落地页客户端组件（粒子+动画） |
| `public/llms-full.txt` | 完整架构文档（GEO） |
| `src/app/layout.tsx` | 更新 SITE_URL + 双 JSON-LD |
| `src/app/sitemap.ts` | 添加 /console + /llms-full.txt |
| `public/robots.txt` | 更新 Sitemap 域名 |
| `mini-services/telegram-bot/` | TG Bot 完整服务（7 文件） |
| `blog/tdpo-cognitive-firewall.md` | 技术博客（2219 字，双语） |
| `blog/README.md` | 博客索引 |
| `docs/DOMAIN-SETUP.md` | 域名配置指南 |
| `docs/ROLLOUT-SUMMARY.md` | 本文档 |

### 在线资源

| 资源 | 地址 | 状态 |
|------|------|------|
| Vercel 部署 | https://my-project-nine-nu-52.vercel.app | ✅ 运行中 |
| 自定义域名 | https://eidolonos.xyz | ⏳ 待 DNS |
| GitHub 仓库 | https://github.com/piaoshu1112-cell/EidolonOS | ✅ 已推送 |
| TG Bot | t.me/EidolonOS_Bot | ✅ 运行中 |
| 技术博客 | `blog/tdpo-cognitive-firewall.md` | ✅ 已发布 |

---

## 7. 下一步行动清单

### 用户需完成（DNS 生效后）

- [ ] 在 Cloudflare 配置 `eidolonos.xyz` DNS（见 `docs/DOMAIN-SETUP.md`）
- [ ] 等 5-30 分钟，验证 `https://eidolonos.xyz` 可访问
- [ ] 提交到 Google Search Console（验证 + sitemap + 请求索引）
- [ ] 录制 30 秒 Demo 视频（全息对话演示）

### 系统后续可做

- [ ] VPS 独立部署（用户提供 VPS 后，迁移 SQLite → PostgreSQL + 持久化）
- [ ] 继续写技术博客（AP2 / AA2P / RAG / 全息 UI）
- [ ] TG Bot 上线到 VPS（当前在沙箱运行，需 24/7 在线）
- [ ] 开发 Discord / Slack 适配器
- [ ] 接入 Web3 钱包（viem + RainbowKit）
- [ ] 提交 agent.json 到 AA2P 注册中心（aa2p.xyz）

---

## 8. 架构图（最终状态）

```
                        ┌─────────────────────┐
                        │  Cloudflare CDN     │
                        │  eidolonos.xyz      │
                        │  (DNS + DDoS防护)   │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Vercel Serverless  │
                        │  Next.js 16 App     │
                        │  ├─ /  落地页 (SSR)  │
                        │  ├─ /console 控制台  │
                        │  ├─ /api/* Headless │
                        │  └─ SEO/GEO 全套    │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
   ┌──────────▼─────┐   ┌─────────▼──────┐   ┌────────▼───────┐
   │  Web Console   │   │  Telegram Bot  │   │  AI Crawlers   │
   │  (浏览器)       │   │  @EidolonOS_Bot│   │  GPTBot/Claude │
   │  /console      │   │  (port 3003)   │   │  PerplexityBot │
   └────────────────┘   └────────────────┘   └────────────────┘
                                            发现 llms.txt + agent.json
```

---

*文档版本：v3.0 · 执行人：15+ Years Full-Stack Architect · 日期：2026-06-29*
