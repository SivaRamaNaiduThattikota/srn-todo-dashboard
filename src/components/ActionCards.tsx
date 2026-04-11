/**
 * ActionCards.tsx — SRN Command Center v12.3
 * Uses CSS variables to respect accent theme from settings.
 */
"use client";

import Link from "next/link";

interface ActionCard {
  href: string;
  label: string;
  sublabel: string;
  icon: string;
  bgVar: string;   // CSS variable or inline gradient
  glowVar: string;
}

const CARDS: ActionCard[] = [
  {
    href: "/notes",
    label: "New Note",
    sublabel: "Create",
    icon: "✏️",
    bgVar: "linear-gradient(135deg, hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) - 4%)) 0%, hsl(var(--accent-h), calc(var(--accent-s) - 10%), calc(var(--accent-l) + 12%)) 100%)",
    glowVar: "hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.35)",
  },
  {
    href: "/",
    label: "New Task",
    sublabel: "Create",
    icon: "✓",
    bgVar: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
    glowVar: "rgba(245,158,11,0.35)",
  },
  {
    href: "/focus",
    label: "Focus Timer",
    sublabel: "Start",
    icon: "⏱",
    bgVar: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
    glowVar: "rgba(16,185,129,0.35)",
  },
  {
    href: "/learning",
    label: "Learning",
    sublabel: "Continue",
    icon: "📖",
    bgVar: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
    glowVar: "rgba(236,72,153,0.35)",
  },
];

export default function ActionCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
      {CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          style={{
            textDecoration: "none",
            borderRadius: "20px",
            padding: "18px",
            background: card.bgVar,
            boxShadow: `0 8px 28px ${card.glowVar}`,
            minHeight: "100px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
            transition: "transform 0.15s, box-shadow 0.15s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.025)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 14px 40px ${card.glowVar}`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 8px 28px ${card.glowVar}`;
          }}
        >
          {/* Icon top-right */}
          <div style={{ position: "absolute", top: "12px", right: "12px", width: "26px", height: "26px", background: "rgba(255,255,255,0.22)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff", fontWeight: "600" }}>
            {card.icon}
          </div>
          {/* Text */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.82)", marginBottom: "2px" }}>{card.sublabel}</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>{card.label}</div>
          </div>
          {/* Deco circle */}
          <div style={{ position: "absolute", bottom: "-12px", right: "-12px", width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", pointerEvents: "none" }} />
        </Link>
      ))}
    </div>
  );
}
