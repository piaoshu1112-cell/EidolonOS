import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "EidolonOS · 数字真身矩阵 — Web4.0 Digital Life Engine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * opengraph-image — dynamically generated OG card.
 * Renders the EidolonOS holographic brand for social previews
 * (Twitter / Open Graph / Discord / WeChat).
 */
export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 40%, #0a1f2e 0%, #050810 70%, #000 100%)",
          color: "#e0f7fa",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* hex rune */}
        <div
          style={{
            fontSize: 180,
            color: "#00ffc8",
            textShadow: "0 0 40px #00ffc8",
            marginBottom: 20,
            fontWeight: 800,
          }}
        >
          ⟁
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#00ffc8",
            textShadow: "0 0 20px rgba(0,255,200,0.6)",
            letterSpacing: 12,
            marginBottom: 12,
          }}
        >
          EIDOLONOS
        </div>
        <div style={{ fontSize: 30, color: "#9ad9d0", letterSpacing: 6 }}>
          数字真身矩阵 · Digital Life Engine
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 22,
            color: "#7fa9a0",
            letterSpacing: 2,
            display: "flex",
            gap: 16,
          }}
        >
          <span>Prime → Eidolon → Vessel</span>
          <span style={{ color: "#00ffc8" }}>·</span>
          <span>AA2P</span>
          <span style={{ color: "#00ffc8" }}>·</span>
          <span>AP2</span>
          <span style={{ color: "#00ffc8" }}>·</span>
          <span>TDPO</span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 30,
            fontSize: 16,
            color: "#5a8a82",
            letterSpacing: 4,
          }}
        >
          WEB 4.0 · HOLOGRAPHIC · OPEN-SOURCE
        </div>
      </div>
    ),
    { ...size }
  );
}
