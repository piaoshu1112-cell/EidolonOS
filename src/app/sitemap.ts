import type { MetadataRoute } from "next";

/**
 * sitemap.ts — GEO/SEO core.
 * Declares all indexable routes for search engines and AI crawlers.
 * The /api/** surface is intentionally excluded (headless, not for indexing).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://eidolonos.app";
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/llms.txt`,
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
