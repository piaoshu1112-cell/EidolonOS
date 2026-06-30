# eidolonos.xyz → Vercel 域名配置指南

> **目标**：将 `eidolonos.xyz` 托管在 Cloudflare，指向 Vercel 部署。
> **Vercel 项目**：`my-project`（已部署，已添加域名）
> **状态**：Vercel 端已就绪 ✅，等待你在 Cloudflare 配置 DNS

---

## 方法 A：CNAME 方式（推荐，保留 Cloudflare CDN）

### 步骤

1. **登录 Cloudflare** → 添加站点 `eidolonos.xyz`（如果还没添加）
2. Cloudflare 会要求你把域名的 **Nameservers** 改为 Cloudflare 的（如 `ns1.cloudflare.com`）——在域名注册商处修改
3. 等 DNS 生效后（通常 10 分钟-2 小时），进入 Cloudflare 的 **DNS** 管理页

4. **添加以下 DNS 记录**：

   | 类型 | 名称 | 内容 | 代理状态 | TTL |
   |------|------|------|----------|-----|
   | **CNAME** | `@` | `cname.vercel-dns.com` | 🟠 已代理 | 自动 |
   | **CNAME** | `www` | `cname.vercel-dns.com` | 🟠 已代理 | 自动 |

   > ⚠️ Cloudflare 的 CNAME Flattening 会自动把 `@` 的 CNAME 当 A 记录处理，所以根域名用 CNAME 也可以。

5. **关键：关闭 Cloudflare 代理（可选但推荐）** 
   
   如果遇到 SSL 证书问题，把代理状态从 🟠「已代理」改为 **⚪「仅 DNS」**。Vercel 会自动签发 Let's Encrypt 证书。
   
   - 如果你想用 Cloudflare CDN：保持 🟠 已代理，但需要在 Cloudflare SSL 设置里选 **"Full"** 或 **"Full (strict)"** 模式（不能用 "Flexible"，会无限重定向）

6. **回到 Vercel** → 项目设置 → Domains，确认 `eidolonos.xyz` 和 `www.eidolonos.xyz` 显示 ✅ 已验证

---

## 方法 B：A 记录方式（最简单，不经过 Cloudflare CDN）

如果你不想用 Cloudflare 代理，直接用 Vercel IP：

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| **A** | `@` | `76.76.21.21` | ⚪ 仅 DNS |
| **CNAME** | `www` | `cname.vercel-dns.com` | ⚪ 仅 DNS |

> Vercel 官方推荐用 CNAME（方法 A），因为 A 记录 IP 可能变更。但 A 记录配置更快生效。

---

## 方法 C：完全托管到 Vercel（放弃 Cloudflare）

如果你想完全交给 Vercel 管理 DNS：

1. 在域名注册商处，把 Nameservers 改为：
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
2. Vercel 会自动处理所有 DNS 和 SSL

**但这样你就失去了 Cloudflare 的 CDN 和安全防护。不推荐。**

---

## 推荐方案：方法 A + Cloudflare 代理

```
用户 → Cloudflare CDN (DDoS防护/CDN加速) → Vercel Serverless (应用)
         ↓                                    ↓
    eidolonos.xyz                      my-project-nine-nu-52.vercel.app
```

### Cloudflare SSL 设置（重要！）

进入 Cloudflare → SSL/TLS → Overview：
- 模式选 **"Full"**（不能用 Flexible，否则无限重定向）
- 边缘证书 → 启用 "Always Use HTTPS"
- 边缘证书 → 启用 "Automatic HTTPS Rewrites"

---

## 验证配置是否成功

配置完 DNS 后，等待 5-30 分钟，然后：

```bash
# 1. 检查 DNS 是否生效
dig eidolonos.xyz
# 应返回 76.76.21.21 或 Cloudflare 的 IP

# 2. 检查网站是否可访问
curl -I https://eidolonos.xyz
# 应返回 HTTP 200 + Vercel 的 server header

# 3. 检查 SSL 证书
curl -vI https://eidolonos.xyz 2>&1 | grep "subject\|issuer"
# 应显示 Vercel 或 Let's Encrypt 的证书

# 4. 检查控制台
curl -I https://eidolonos.xyz/console
# 应返回 HTTP 200

# 5. 检查 SEO 路由
curl https://eidolonos.xyz/sitemap.xml | head -5
curl https://eidolonos.xyz/llms.txt | head -5
curl https://eidolonos.xyz/.well-known/agent.json
```

---

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| `ERR_TOO_MANY_REDIRECTS` | Cloudflare SSL 模式设为 "Flexible" → 改为 "Full" |
| SSL 证书未签发 | DNS 未生效 → 等 30 分钟，或在 Vercel 手动 "Renew Certificate" |
| `www` 跳不到主域 | 确认 Vercel 项目设置里 `www.eidolonos.xyz` 已添加 |
| Cloudflare 代理导致 SSE 断流 | 关闭 Cloudflare 代理（改为仅 DNS），或配置 Cloudflare 不缓存 `/api/*` |

---

## Vercel 域名管理界面

访问：https://vercel.com/piaoshuweb3-9227s-projects/my-project/settings/domains

确认以下域名已添加且状态为 ✅：
- `eidolonos.xyz`（主域名）
- `www.eidolonos.xyz`（子域名，已添加 ✅）

DNS 配置完成后，Vercel 会自动签发 SSL 证书（Let's Encrypt），通常 5-10 分钟。
