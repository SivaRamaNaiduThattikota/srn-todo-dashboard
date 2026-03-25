"use client";

import type { Todo } from "@/lib/supabase";

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

export function StatsBar({ todos }: Props) {
  const counts: Record<string, number> = {
    total: todos.length,
    pending: todos.filter((t) => t.status === "pending").length,
    in_progress: todos.filter((t) => t.status === "in_progress").length,
    done: todos.filter((t) => t.status === "done").length,
    blocked: todos.filter((t) => t.status === "blocked").length,
  };

  return (
    <div className="grid grid-cols-5 gap-3 mb-8">
      {STATS.map((s, i) => (
        <div
          key={s.key}
          className={`liquid-glass rounded-2xl px-4 py-4 hover-lift ${s.glow}`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className={`text-2xl font-semibold font-mono ${s.color} tracking-tight`}>
            {counts[s.key]}
          </div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-mono mt-1">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
