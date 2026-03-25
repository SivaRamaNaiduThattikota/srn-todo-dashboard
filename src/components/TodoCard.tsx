"use client";

import { formatDistanceToNow } from "date-fns";
import type { Todo, TodoStatus } from "@/lib/supabase";

const STATUS_STYLES: Record<TodoStatus, { dot: string; bg: string; text: string }> = {
  pending: { dot: "bg-status-pending", bg: "bg-status-pending/10", text: "text-status-pending" },
  in_progress: { dot: "bg-status-in_progress", bg: "bg-status-in_progress/10", text: "text-status-in_progress" },
  done: { dot: "bg-status-done", bg: "bg-status-done/10", text: "text-status-done" },
  blocked: { dot: "bg-status-blocked", bg: "bg-status-blocked/10", text: "text-status-blocked" },
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-priority-critical/15 text-priority-critical border-priority-critical/30",
  high: "bg-priority-high/15 text-priority-high border-priority-high/30",
  medium: "bg-priority-medium/15 text-priority-medium border-priority-medium/30",
  low: "bg-priority-low/15 text-priority-low border-priority-low/30",
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
      className="group animate-fade-in bg-surface-1 border border-surface-3 rounded-xl px-5 py-4 hover:border-surface-4 transition-all"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
            <h3 className={`text-sm font-medium truncate ${
              todo.status === "done" ? "line-through text-text-muted" : "text-text-primary"
            }`}>
              {todo.title}
            </h3>
          </div>
          <div className="flex items-center gap-3 ml-4.5">
            <span className={`text-[10px] font-mono font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${PRIORITY_STYLES[todo.priority]}`}>
              {todo.priority}
            </span>
            <span className="text-xs text-text-muted font-mono">@{todo.assigned_agent}</span>
            <span className="text-xs text-text-muted font-mono hidden sm:inline">{timeAgo}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={todo.status}
            onChange={(e) => onStatusChange(todo.id, e.target.value as TodoStatus)}
            className={`text-xs font-mono font-medium px-2.5 py-1 rounded-md border-none cursor-pointer appearance-none focus:outline-none ${s.bg} ${s.text}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => onDelete(todo.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-400 transition-all"
            title="Delete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
