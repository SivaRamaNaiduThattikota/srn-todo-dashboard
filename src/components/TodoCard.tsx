"use client";

import { formatDistanceToNow } from "date-fns";
import type { Todo, TodoStatus } from "@/lib/supabase";

const STATUS_STYLES: Record<TodoStatus, { dot: string; bg: string; text: string; glow: string }> = {
  pending: { dot: "bg-status-pending", bg: "bg-status-pending/10", text: "text-status-pending", glow: "status-glow-pending" },
  in_progress: { dot: "bg-status-in_progress", bg: "bg-status-in_progress/10", text: "text-status-in_progress", glow: "status-glow-in_progress" },
  done: { dot: "bg-status-done", bg: "bg-status-done/10", text: "text-status-done", glow: "status-glow-done" },
  blocked: { dot: "bg-status-blocked", bg: "bg-status-blocked/10", text: "text-status-blocked", glow: "status-glow-blocked" },
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-priority-critical/10 text-priority-critical border-priority-critical/20",
  high: "bg-priority-high/10 text-priority-high border-priority-high/20",
  medium: "bg-priority-medium/10 text-priority-medium border-priority-medium/20",
  low: "bg-priority-low/10 text-priority-low border-priority-low/20",
};

const STATUS_OPTIONS: { value: TodoStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

interface Props {
  todo: Todo;
  index: number;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onDelete: (id: string) => void;
}

export function TodoCard({ todo, index, onStatusChange, onDelete }: Props) {
  const s = STATUS_STYLES[todo.status];
  const timeAgo = formatDistanceToNow(new Date(todo.updated_at), { addSuffix: true });

  return (
    <div
      className={`group liquid-glass rounded-2xl px-5 py-4 hover-lift animate-fade-in-up`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2.5">
            {/* Animated status dot */}
            <div className="relative flex-shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot} block`} />
              <span className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${s.dot} animate-ping opacity-30`} />
            </div>
            <h3 className={`text-sm font-medium tracking-tight ${
              todo.status === "done"
                ? "line-through text-text-muted/60"
                : "text-white"
            }`}>
              {todo.title}
            </h3>
          </div>

          <div className="flex items-center gap-3 ml-5.5 flex-wrap">
            {/* Priority badge with glass effect */}
            <span className={`text-[10px] font-mono font-medium uppercase tracking-widest px-2.5 py-1 rounded-lg border backdrop-blur-sm ${PRIORITY_STYLES[todo.priority]}`}>
              {todo.priority}
            </span>

            {/* Agent badge */}
            <span className="text-xs text-text-muted font-mono flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-50">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {todo.assigned_agent}
            </span>

            {/* Time */}
            <span className="text-xs text-text-muted/60 font-mono hidden sm:inline">
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Right: Status dropdown + delete */}
        <div className="flex items-center gap-2">
          <select
            value={todo.status}
            onChange={(e) => onStatusChange(todo.id, e.target.value as TodoStatus)}
            className={`text-xs font-mono font-medium px-3 py-1.5 rounded-xl border-none cursor-pointer focus:outline-none skeuo-raised ${s.bg} ${s.text}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => onDelete(todo.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
            title="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
