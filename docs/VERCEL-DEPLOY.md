# EidolonOS — Vercel 部署指南

> **状态**：项目已 100% 准备好 Vercel 部署（所有兼容性问题已修复）
> **仓库**：https://github.com/piaoshu1112-cell/EidolonOS.git

---

## 已完成的 Vercel 兼容性改造

| 问题 | 解决方案 | 文件 |
|------|----------|------|
| z-ai SDK 读配置文件而非环境变量 | `zai-bootstrap.ts` 运行时从 env 合成配置文件 | `src/lib/eidolon/zai-bootstrap.ts` |
| Vercel 文件系统临时性（SQLite 重置） | `db-init.ts` 冷启动自动建表+种子数据 | `src/lib/eidolon/db-init.ts` |
| SQLite 路径不可写 | 自动重定向到 `/tmp/eidolonos.db` | `src/lib/db.ts` |
| Prisma Client 未在构建时生成 | `postinstall` + `build` 脚本自动 `prisma generate` | `package.json` |
| SSE 长连接超时 | `vercel.json` 设置 `maxDuration: 60` | `vercel.json` |

---

## 方式 A：Vercel Dashboard 导入（推荐，最简单）

### 步骤

1. **访问 Vercel**：打开 [vercel.com/new](https://vercel.com/new)

2. **导入 GitHub 仓库**：
   - 点击 "Import Git Repository"
   - 选择 `piaoshu1112-cell/EidolonOS`
   - 如果看不到，点 "Adjust GitHub App Permissions" 授权

3. **配置项目**（Vercel 会自动检测 Next.js）：
   - Framework Preset: **Next.js** ✅（自动）
   - Build Command: `bun run build`（或留空用默认）
   - Install Command: `bun install`（或留空用默认）

4. **设置环境变量**（关键！复制以下全部）：

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | `file:/tmp/eidolonos.db` |
   | `ZAI_BASE_URL` | `https://internal-api.z.ai/v1` |
   | `ZAI_API_KEY` | `Z.ai` |
   | `ZAI_TOKEN` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGFjNTc0OGItNDEyYi00ZDhiLWFjY2EtMDY1ZjFhOTc5MTkzIiwiY2hhdF9pZCI6ImNoYXQtNWY5NTJmMzMtOWVkMS00ZTcxLWI2ZGEtZTczY2IyOTZiOGFmIiwicGxhdGZvcm0iOiJ6YWkifQ.dqzh6JKn_DV5L25fCoqoPcgnzYTddAW4ZDSjSwrXin0` |
   | `ZAI_CHAT_ID` | `chat-5f952f33-9ed1-4e71-b6da-e73cb296b8af` |
   | `ZAI_USER_ID` | `dac5748b-412b-4d8b-acca-065f1a979193` |
   | `NEXT_PUBLIC_SITE_URL` | `https://你的域名.vercel.app`（部署后更新） |

5. **点击 Deploy** — 等待 2-3 分钟构建完成

6. **部署成功后**：
   - 访问 `https://eidolon-os-xxx.vercel.app`
   - 系统会自动建表 + 注入种子数据（1 Vessel, 1 Prime, 1 Eidolon, 1 Memory Shard）
   - 可立即与数字真身对话

---

## 方式 B：CLI 部署（需要 Vercel Token）

### 1. 创建 Vercel Token

1. 登录 [vercel.com](https://vercel.com)
2. 进入 Settings → Tokens → Create Token
3. 复制 token（格式：`vercel_xxx`）

### 2. 提供给我或自行执行

```bash
# 设置环境变量
export VERCEL_TOKEN="你的vercel_token"

# 部署到生产环境
vercel deploy --prod --token=$VERCEL_TOKEN --yes

# 部署完成后设置环境变量（替换为你的域名）
vercel env add DATABASE_URL production --token=$VERCEL_TOKEN <<< "file:/tmp/eidolonos.db"
vercel env add ZAI_BASE_URL production --token=$VERCEL_TOKEN <<< "https://internal-api.z.ai/v1"
vercel env add ZAI_API_KEY production --token=$VERCEL_TOKEN <<< "Z.ai"
vercel env add ZAI_TOKEN production --token=$VERCEL_TOKEN <<< "eyJhbGci...（完整JWT）"
vercel env add ZAI_CHAT_ID production --token=$VERCEL_TOKEN <<< "chat-5f952f33-9ed1-4e71-b6da-e73cb296b8af"
vercel env add ZAI_USER_ID production --token=$VERCEL_TOKEN <<< "dac5748b-412b-4d8b-acca-065f1a979193"

# 重新部署使环境变量生效
vercel deploy --prod --token=$VERCEL_TOKEN --yes
```

---

## 部署后验证

部署成功后，访问你的 Vercel 域名，执行以下检查：

```bash
# 替换 YOUR_DOMAIN 为你的 Vercel 域名
DOMAIN="https://eidolon-os-xxx.vercel.app"

# 1. 首页渲染
curl -s -o /dev/null -w "Homepage: HTTP %{http_code}\n" $DOMAIN/

# 2. Dashboard API（自动建表+种子）
curl -s $DOMAIN/api/dashboard | python3 -m json.tool

# 3. SEO/GEO 路由
curl -s -o /dev/null -w "sitemap: HTTP %{http_code}\n" $DOMAIN/sitemap.xml
curl -s -o /dev/null -w "robots: HTTP %{http_code}\n" $DOMAIN/robots.txt
curl -s -o /dev/null -w "llms.txt: HTTP %{http_code}\n" $DOMAIN/llms.txt
curl -s -o /dev/null -w "agent.json: HTTP %{http_code}\n" $DOMAIN/.well-known/agent.json

# 4. SSE 意识流（需要从 dashboard 获取 eidolonId 和 primeId）
EIDOLON_ID=$(curl -s $DOMAIN/api/eidolons | python3 -c "import json,sys; print(json.load(sys.stdin)['eidolons'][0]['id'])")
PRIME_ID=$(curl -s $DOMAIN/api/primes | python3 -c "import json,sys; print(json.load(sys.stdin)['primes'][0]['id'])")

curl -N -X POST "$DOMAIN/api/eidolons/$EIDOLON_ID/converse" \
  -H "Content-Type: application/json" \
  -d "{\"primeId\":\"$PRIME_ID\",\"message\":\"Hello Eidolon\",\"channel\":\"web\"}"
```

---

## 注意事项

### SQLite 临时性
Vercel Serverless 文件系统是临时的——每次冷启动数据库会重置。`db-init.ts` 会自动重建表和注入种子数据，所以应用始终可用，但你创建的 Prime/Eidolon/对话历史在冷启动后会丢失。

**生产环境持久化方案**：
- **Turso**（推荐）：SQLite at edge，免费额度，修改 `prisma/schema.prisma` 的 `provider` 为 `"libsql"`
- **Vercel Postgres**：完整 PostgreSQL + pgvector，修改 `provider` 为 `"postgresql"`

### SSE 超时
Vercel 免费版 Serverless Function 超时 10s，Pro 版 60s。`vercel.json` 已配置 60s。如果你的意识流对话经常超时，考虑：
- 升级 Vercel Pro
- 或减小 Vessel 的 `maxTokens`（降低生成长度）

### 自定义域名
部署成功后，在 Vercel Dashboard → Settings → Domains 添加自定义域名（如 `eidolonos.app`），然后更新环境变量 `NEXT_PUBLIC_SITE_URL` 为该域名。
