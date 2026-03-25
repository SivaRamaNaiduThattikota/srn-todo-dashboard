"use client";

import type { Todo } from "@/lib/supabase";

interface Props {
  todos: Todo[];
}

const STATS = [
  { key: "total", label: "Total", color: "text-text-primary", bg: "bg-surface-2" },
  { key: "pending", label: "Pending", color: "text-status-pending", bg: "bg-status-pending/10" },
  { key: "in_progress", label: "Active", color: "text-status-in_progress", bg: "bg-status-in_progress/10" },
  { key: "done", label: "Done", color: "text-status-done", bg: "bg-status-done/10" },
  { key: "blocked", label: "Blocked", color: "text-status-blocked", bg: "bg-status-blocked/10" },
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
    <div className="grid grid-cols-5 gap-2 mb-6">
      {STATS.map((s) => (
        <div key={s.key} className={`${s.bg} rounded-lg px-4 py-3 border border-surface-3`}>
          <div className={`text-xl font-semibold font-mono ${s.color}`}>{counts[s.key]}</div>
          <div className="text-[10px] uppercase tracking-wider text-text-muted font-mono mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
