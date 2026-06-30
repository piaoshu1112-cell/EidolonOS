import type { MetadataRoute } from "next";

/**
 * manifest.ts — PWA manifest (Next.js App Router convention).
 * Generates /manifest.webmanifest at build time. This supplements the static
 * /.well-known/manifest.json with the canonical path browsers expect.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EidolonOS · 数字真身矩阵",
    short_name: "EidolonOS",
    description:
      "Web4.0 Digital Life Engine — Prime → Eidolon → Vessel. Holographic cyberpunk AI agent platform with consciousness streaming, RAG memory, AA2P protocol and TDPO cognitive firewall.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f1e",
    theme_color: "#00ffc8",
    orientation: "any",
    icons: [
      {
        src: "/eidolon-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["developer", "productivity", "ai"],
    lang: "en",
  };
}
