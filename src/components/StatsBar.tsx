"use client";

import type { Todo } from "@/lib/supabase";
import { useTilt } from "@/lib/useTilt";

interface Props {
  todos: Todo[];
}

const STATS = [
  {
    key: "total",
    label: "Total",
    color: "var(--text-primary)",
    dotColor: null,
    glowClass: "",
  },
  {
    key: "pending",
    label: "Pending",
    color: "#f5a623",
    dotColor: "#f5a623",
    glowClass: "status-glow-pending",
    bg: "rgba(245,166,35,0.08)",
    border: "rgba(245,166,35,0.18)",
  },
  {
    key: "in_progress",
    label: "Active",
    color: "#4da6ff",
    dotColor: "#4da6ff",
    glowClass: "status-glow-in_progress",
    bg: "rgba(77,166,255,0.08)",
    border: "rgba(77,166,255,0.18)",
  },
  {
    key: "done",
    label: "Done",
    color: "#5ecf95",
    dotColor: "#5ecf95",
    glowClass: "status-glow-done",
    bg: "rgba(94,207,149,0.08)",
    border: "rgba(94,207,149,0.18)",
  },
  {
    key: "blocked",
    label: "Blocked",
    color: "#ff6b6b",
    dotColor: "#ff6b6b",
    glowClass: "status-glow-blocked",
    bg: "rgba(255,107,107,0.08)",
    border: "rgba(255,107,107,0.18)",
  },
] as const;

function StatCard({
  stat,
  count,
  index,
}: {
  stat: (typeof STATS)[number];
  count: number;
  index: number;
}) {
  const tilt = useTilt(8);
  const hasColor = "bg" in stat;

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className={`liquid-glass hover-lift tilt-card animate-fade-in-up rounded-[18px] px-4 py-3.5 sm:py-4 relative overflow-hidden ${stat.glowClass}`}
      style={{
        animationDelay: `${index * 55}ms`,
        transition: "transform 0.15s ease-out, box-shadow 0.28s ease, border-color 0.28s ease",
        ...(hasColor && {
          background: stat.bg,
          borderColor: stat.border,
        }),
      }}
    >
      {/* Colored indicator bar */}
      {stat.dotColor && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${stat.dotColor}, transparent)`,
            opacity: 0.6,
          }}
        />
      )}

      {/* Count */}
      <div
        className="text-[22px] sm:text-2xl font-semibold font-mono leading-none tracking-tight"
        style={{
          color: stat.color,
          fontFamily: "-apple-system, SF Pro Display, sans-serif",
          letterSpacing: "-0.03em",
          ...(stat.dotColor && { textShadow: `0 0 20px ${stat.dotColor}55` }),
        }}
      >
        {count}
      </div>

      {/* Label */}
      <div
        className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] font-mono mt-1.5"
        style={{ color: "var(--text-muted)" }}
      >
        {stat.label}
      </div>
    </div>
  );
}

export function StatsBar({ todos }: Props) {
  const counts: Record<string, number> = {
    total:       todos.length,
    pending:     todos.filter((t) => t.status === "pending").length,
    in_progress: todos.filter((t) => t.status === "in_progress").length,
    done:        todos.filter((t) => t.status === "done").length,
    blocked:     todos.filter((t) => t.status === "blocked").length,
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-6 sm:mb-8">
      {STATS.map((s, i) => (
        <StatCard key={s.key} stat={s} count={counts[s.key]} index={i} />
      ))}
    </div>
  );
}
