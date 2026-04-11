/**
 * NoteCard.tsx — SRN Command Center v12.1
 * Inspired by Evernote reference UI (Images 2 & 3)
 * Replaces or enhances the note items in /notes page.
 * Usage: import NoteCard from "@/components/NoteCard";
 */

"use client";

interface NoteCardProps {
  emoji: string;
  title: string;
  snippet: string;
  date: string;
  tags: { label: string; variant: "priority" | "productive" | "ml" | "default" }[];
  tint?: "purple" | "teal" | "amber" | "none";
  onClick?: () => void;
}

const TINT_STYLES: Record<string, { bg: string; border: string }> = {
  purple: { bg: "rgba(124,111,253,0.07)", border: "rgba(124,111,253,0.18)" },
  teal:   { bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.16)" },
  amber:  { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.16)" },
  none:   { bg: "var(--glass-fill)",      border: "var(--glass-border)" },
};

const TAG_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  priority:  { bg: "rgba(239,68,68,0.15)",   color: "#fca5a5", border: "rgba(239,68,68,0.25)" },
  productive:{ bg: "rgba(16,185,129,0.15)",  color: "#6ee7b7", border: "rgba(16,185,129,0.25)" },
  ml:        { bg: "rgba(245,158,11,0.15)",  color: "#fcd34d", border: "rgba(245,158,11,0.25)" },
  default:   { bg: "rgba(124,111,253,0.15)", color: "#c4bcff", border: "rgba(124,111,253,0.25)" },
};

export default function NoteCard({
  emoji,
  title,
  snippet,
  date,
  tags,
  tint = "none",
  onClick,
}: NoteCardProps) {
  const tintStyle = TINT_STYLES[tint];

  return (
    <div
      onClick={onClick}
      style={{
        background: tintStyle.bg,
        border: `0.5px solid ${tintStyle.border}`,
        borderRadius: "16px",
        padding: "16px",
        marginBottom: "10px",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background =
          tint === "none" ? "var(--glass-fill-hover)" : tintStyle.bg.replace("0.0", "0.12");
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = tintStyle.bg;
      }}
    >
      {/* Top specular line */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "1px",
          background: "var(--specular-top)",
          borderRadius: "16px 16px 0 0",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      {/* Title */}
      <div
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: "5px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span style={{ fontSize: "16px" }}>{emoji}</span>
        {title}
      </div>

      {/* Snippet */}
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-secondary)",
          marginBottom: "10px",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {snippet}
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {/* Date chip */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 10px",
            borderRadius: "99px",
            fontSize: "11px",
            fontWeight: 500,
            background: "rgba(124,111,253,0.15)",
            color: "#c4bcff",
            border: "0.5px solid rgba(124,111,253,0.25)",
          }}
        >
          📅 {date}
        </span>

        {/* Tags */}
        {tags.map((tag) => {
          const s = TAG_STYLES[tag.variant] ?? TAG_STYLES.default;
          return (
            <span
              key={tag.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: "99px",
                fontSize: "11px",
                fontWeight: 500,
                background: s.bg,
                color: s.color,
                border: `0.5px solid ${s.border}`,
              }}
            >
              {tag.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
