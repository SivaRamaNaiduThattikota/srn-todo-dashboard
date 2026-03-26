"use client";

import type { Todo } from "@/lib/supabase";
import { useTilt } from "@/lib/useTilt";

interface Props {
  todos: Todo[];
}

const STATS = [
  { key: "total", label: "Total", color: "text-white", glow: "" },
  { key: "pending", label: "Pending", color: "text-status-pending", glow: "status-glow-pending" },
  { key: "in_progress", label: "Active", color: "text-status-in_progress", glow: "status-glow-in_progress" },
  { key: "done", label: "Done", color: "text-status-done", glow: "status-glow-done" },
  { key: "blocked", label: "Blocked", color: "text-status-blocked", glow: "status-glow-blocked" },
] as const;

function StatCard({ stat, count, index }: { stat: typeof STATS[number]; count: number; index: number }) {
  const tilt = useTilt(10);
  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className={`liquid-glass rounded-2xl px-3 sm:px-4 py-3 sm:py-4 tilt-card ${stat.glow}`}
      style={{ animationDelay: `${index * 60}ms`, transition: "transform 0.15s ease-out" }}
    >
      <div className={`text-xl sm:text-2xl font-semibold font-mono ${stat.color} tracking-tight`}>{count}</div>
      <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-text-muted font-mono mt-1">{stat.label}</div>
    </div>
  );
}

export function StatsBar({ todos }: Props) {
  const counts: Record<string, number> = {
    total: todos.length,
    pending: todos.filter((t) => t.status === "pending").length,
    in_progress: todos.filter((t) => t.status === "in_progress").length,
    done: todos.filter((t) => t.status === "done").length,
    blocked: todos.filter((t) => t.status === "blocked").length,
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-6 sm:mb-8">
      {STATS.map((s, i) => (
        <StatCard key={s.key} stat={s} count={counts[s.key]} index={i} />
      ))}
    </div>
  );
}
