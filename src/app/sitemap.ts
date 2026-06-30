import type { MetadataRoute } from "next";

/**
 * sitemap.ts — GEO/SEO core.
 * Declares all indexable routes for search engines and AI crawlers.
 *
 * `/`          — marketing landing (Server Component, rich text for crawlers)
 * `/console`   — interactive Matrix Console (client-heavy, still indexable)
 * `/llms.txt`  + `/llms-full.txt` — LLM manifest (per llms.txt spec)
 * `/.well-known/agent.json` + `aa2p.json` — A2A discovery cards
 *
 * The `/api/**` surface is intentionally excluded (headless, not for indexing).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://eidolonos.xyz";
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/console`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/llms.txt`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/llms-full.txt`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/.well-known/agent.json`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/.well-known/aa2p.json`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
