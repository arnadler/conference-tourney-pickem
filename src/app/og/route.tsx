import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background circles for depth */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(249,115,22,0.08)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 350, height: 350, borderRadius: "50%", background: "rgba(249,115,22,0.06)", display: "flex" }} />

        {/* Basketball emoji */}
        <div style={{ fontSize: 120, marginBottom: 24, display: "flex" }}>🏀</div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2px",
            textAlign: "center",
            lineHeight: 1.1,
            display: "flex",
          }}
        >
          Conference Tourney
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#f97316",
            letterSpacing: "-2px",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: 32,
            display: "flex",
          }}
        >
          Pick&apos;Em
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            textAlign: "center",
            display: "flex",
          }}
        >
          Pick winners. Climb the standings. Brag to your friends.
        </div>

        {/* URL pill */}
        <div
          style={{
            marginTop: 40,
            padding: "10px 28px",
            borderRadius: 999,
            border: "2px solid rgba(249,115,22,0.4)",
            color: "#f97316",
            fontSize: 22,
            display: "flex",
          }}
        >
          conftourneypickem.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
