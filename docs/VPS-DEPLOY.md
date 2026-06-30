# EidolonOS — VPS 部署指南

> **为什么需要 VPS**：Z.ai 沙箱是临时开发环境，会话结束后进程会中断（TG Bot 就是典型例子）。Vercel 适合托管 Web 应用，但 TG Bot 等 mini-service 需要 7×24 运行的进程，必须用 VPS。
> **目标**：在自有 VPS 上部署 EidolonOS 全套服务，实现 7×24 稳定运行。

---

## 一、VPS 配置推荐

### 最低配置（MVP，单机部署）

| 资源 | 规格 | 月费 | 说明 |
|------|------|------|------|
| CPU | 2 核 | — | Next.js + TG Bot + Prisma |
| 内存 | 4 GB | — | Node.js + SQLite 够用 |
| 硬盘 | 40 GB SSD | — | 系统 + 代码 + SQLite 数据库 |
| 带宽 | 1 TB/月 | — | SSE 流式 + API 调用 |
| 系统 | Ubuntu 22.04 LTS | — | 长期支持，生态成熟 |

**推荐 VPS 供应商**（按性价比）：

| 供应商 | 配置 | 月费 | 优势 |
|--------|------|------|------|
| **Hetzner** | CX22 (2核4G) | €4.5/月 | 欧洲最便宜，性能好 |
| **Vultr** | 2核4G | $24/月 | 全球节点，中文友好 |
| **DigitalOcean** | 2核4G | $24/月 | 文档好，一键 Docker |
| **腾讯云轻量** | 2核4G | ¥45/月 | 国内访问快 |
| **阿里云 ECS** | 2核4G | ¥60/月 | 国内主流 |

### 推荐配置（生产，含本地大模型）

| 资源 | 规格 | 说明 |
|------|------|------|
| CPU | 8 核 | 运行本地 LLM (Qwen/Llama) |
| 内存 | 16 GB | LLM 推理需要 |
| 硬盘 | 100 GB SSD | 模型文件 + 数据 |
| GPU | 可选 | 有 GPU 可跑 70B 模型 |

---

## 二、VPS 部署架构

```
                    ┌─────────────────────┐
                    │  Cloudflare CDN     │
                    │  eidolonos.xyz      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  你的 VPS            │
                    │  Ubuntu 22.04        │
                    │  ┌────────────────┐ │
                    │  │ Nginx (反向代理)│ │ ← 443端口, SSL
                    │  └───────┬────────┘ │
                    │          │           │
                    │  ┌───────▼────────┐ │
                    │  │ Next.js :3000  │ │ ← Web应用
                    │  └───────┬────────┘ │
                    │          │           │
                    │  ┌───────▼────────┐ │
                    │  │ TG Bot  :3003  │ │ ← Telegram Bot
                    │  └───────┬────────┘ │
                    │          │           │
                    │  ┌───────▼────────┐ │
                    │  │ SQLite /tmp    │ │ ← 数据库
                    │  └────────────────┘ │
                    └─────────────────────┘
```

---

## 三、一键部署脚本

在 VPS 上执行以下命令：

```bash
# 1. 安装系统依赖
sudo apt update && sudo apt install -y git nginx certbot python3-certbot-nginx

# 2. 安装 Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 3. 克隆 EidolonOS
cd /opt
git clone https://github.com/piaoshu1112-cell/EidolonOS.git
cd EidolonOS

# 4. 安装依赖 + 初始化数据库
bun install
bun run db:push
bun run scripts/seed.ts

# 5. 配置环境变量
cp .env.example .env
nano .env
# 设置:
#   DATABASE_URL=file:/opt/EidolonOS/db/eidolonos.db
#   OPENAI_API_KEY=gsk_你的Groq密钥
#   OPENAI_BASE_URL=https://api.groq.com/openai/v1
#   OPENAI_MODEL=llama-3.3-70b-versatile
#   NEXT_PUBLIC_SITE_URL=https://eidolonos.xyz

# 6. 构建 + 启动 Next.js
bun run build
```

---

## 四、Systemd 服务配置（7×24 运行）

### 1. Next.js 应用服务

```bash
sudo nano /etc/systemd/system/eidolonos-web.service
```

```ini
[Unit]
Description=EidolonOS Web Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/EidolonOS
EnvironmentFile=/opt/EidolonOS/.env
ExecStart=/root/.bun/bin/bun run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 2. TG Bot 服务

```bash
sudo nano /etc/systemd/system/eidolonos-tgbot.service
```

```ini
[Unit]
Description=EidolonOS Telegram Bot
After=network.target eidolonos-web.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/EidolonOS/mini-services/telegram-bot
EnvironmentFile=/opt/EidolonOS/mini-services/telegram-bot/.env
ExecStart=/root/.bun/bin/bun run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable eidolonos-web eidolonos-tgbot
sudo systemctl start eidolonos-web eidolonos-tgbot

# 查看状态
sudo systemctl status eidolonos-web
sudo systemctl status eidolonos-tgbot

# 查看日志
sudo journalctl -u eidolonos-web -f
sudo journalctl -u eidolonos-tgbot -f
```

**效果**：进程崩溃后 5-10 秒自动重启，开机自动启动。

---

## 五、Nginx 反向代理 + SSL

```bash
sudo nano /etc/nginx/sites-available/eidolonos.xyz
```

```nginx
server {
    listen 80;
    server_name eidolonos.xyz www.eidolonos.xyz;

    # 主应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE 意识流（关键：禁用缓冲）
    location /api/eidolons/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;          # 禁用缓冲，SSE 必需
        proxy_cache off;
        proxy_read_timeout 300s;      # 5分钟超时
        chunked_transfer_encoding on;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 静态文件（可选：让 Nginx 直接服务）
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/eidolonos.xyz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 申请 SSL 证书（Let's Encrypt）
sudo certbot --nginx -d eidolonos.xyz -d www.eidolonos.xyz
```

---

## 六、Cloudflare DNS 改向 VPS

把 Cloudflare DNS 从 Vercel 改向你的 VPS：

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| A | `@` | `你的VPS_IP` | 🟠 已代理 |
| A | `www` | `你的VPS_IP` | 🟠 已代理 |

**Cloudflare SSL 设置**：改为 **"Full (strict)"**（因为你 VPS 上有 Let's Encrypt 证书）

---

## 七、数据库持久化

VPS 上的 SQLite 是持久的（不会重置）。但建议定期备份：

```bash
# 创建备份脚本
sudo nano /opt/EidolonOS/scripts/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/EidolonOS/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
cp /opt/EidolonOS/db/eidolonos.db "$BACKUP_DIR/eidolonos_$DATE.db"
# 保留最近 30 天
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
echo "Backup created: eidolonos_$DATE.db"
```

```bash
sudo chmod +x /opt/EidolonOS/scripts/backup-db.sh

# 添加 cron 定时任务（每天 3 点备份）
sudo crontab -e
# 添加:
0 3 * * * /opt/EidolonOS/scripts/backup-db.sh
```

---

## 八、VPS vs Vercel 对比

| 特性 | Vercel（当前） | VPS（迁移后） |
|------|---------------|---------------|
| Web 应用 | ✅ 完美 | ✅ 完美 |
| TG Bot 7×24 | ❌ 不支持 | ✅ systemd 守护 |
| 数据库持久 | ❌ 临时重置 | ✅ 永久 |
| 自定义域名 | ✅ | ✅ |
| SSE 流式 | ✅（60s 限制） | ✅（无限制） |
| 成本 | 免费→$20/月 | $5-24/月 |
| 运维 | 零 | 需维护 |
| 扩展性 | 自动扩容 | 需手动 |

---

## 九、迁移步骤总结

1. **购买 VPS**（推荐 Hetzner CX22, €4.5/月）
2. **DNS 改向 VPS IP**（Cloudflare A 记录）
3. **执行部署脚本**（本文第三、四、五节）
4. **验证服务**：
   ```bash
   curl https://eidolonos.xyz/api/dashboard
   curl https://eidolonos.xyz/console
   sudo systemctl status eidolonos-tgbot
   ```
5. **测试 TG Bot**：发 `/start` 到 @EidolonOS_Bot
6. **（可选）配置本地 LLM**：安装 Ollama + Qwen2.5，改 `OPENAI_BASE_URL`

---

## 十、混合部署方案（推荐）

如果你不想完全放弃 Vercel：

| 组件 | 部署位置 | 原因 |
|------|----------|------|
| Web 应用 (`/` `/console` `/api`) | **Vercel** | 免费额度够用，自动扩容 |
| TG Bot | **VPS** | 需要 7×24 长轮询 |
| 数据库 | **Turso**（免费） | 持久化，Vercel+VPS 共享 |

TG Bot 在 VPS 上运行，调用 Vercel 的 API：
```
TG Bot (VPS) → https://eidolonos.xyz/api/eidolons/:id/converse → Vercel
```

这样：
- ✅ Vercel 继续托管 Web（免费）
- ✅ VPS 只跑 TG Bot（最便宜配置即可，€3/月）
- ✅ Turso 持久化数据（免费 9GB）

---

*文档版本：v1.0 · 最后更新：2026-06-30*
