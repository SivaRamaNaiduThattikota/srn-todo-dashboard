"use client";

import { formatDistanceToNow } from "date-fns";
import type { Todo, TodoStatus } from "@/lib/supabase";
import { useTilt } from "@/lib/useTilt";
import { fireConfetti } from "@/lib/confetti";

const STATUS_STYLES: Record<TodoStatus, { dot: string; bg: string; text: string }> = {
  pending: { dot: "bg-status-pending", bg: "bg-status-pending/10", text: "text-status-pending" },
  in_progress: { dot: "bg-status-in_progress", bg: "bg-status-in_progress/10", text: "text-status-in_progress" },
  done: { dot: "bg-status-done", bg: "bg-status-done/10", text: "text-status-done" },
  blocked: { dot: "bg-status-blocked", bg: "bg-status-blocked/10", text: "text-status-blocked" },
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
  const tilt = useTilt(6);
  const timeAgo = formatDistanceToNow(new Date(todo.updated_at), { addSuffix: true });

  const handleStatusChange = (id: string, status: TodoStatus) => {
    if (status === "done" && todo.status !== "done") {
      fireConfetti();
    }
    onStatusChange(id, status);
  };

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="group liquid-glass rounded-2xl px-4 sm:px-5 py-3 sm:py-4 animate-fade-in-up tilt-card"
      style={{ animationDelay: `${index * 60}ms`, transition: "transform 0.15s ease-out" }}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="relative flex-shrink-0">
              <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${s.dot} block`} />
              <span className={`absolute inset-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${s.dot} animate-ping opacity-30`} />
            </div>
            <h3 className={`text-xs sm:text-sm font-medium tracking-tight ${
              todo.status === "done" ? "line-through text-text-muted/60" : "text-white"
            }`}>
              {todo.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-4 sm:ml-5 flex-wrap">
            <span className={`text-[9px] sm:text-[10px] font-mono font-medium uppercase tracking-widest px-2 py-0.5 rounded-lg border backdrop-blur-sm ${PRIORITY_STYLES[todo.priority]}`}>
              {todo.priority}
            </span>
            <span className="text-[10px] sm:text-xs text-text-muted font-mono flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-50 hidden sm:inline">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              @{todo.assigned_agent}
            </span>
            <span className="text-[10px] text-text-muted/60 font-mono hidden sm:inline">{timeAgo}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <select
            value={todo.status}
            onChange={(e) => handleStatusChange(todo.id, e.target.value as TodoStatus)}
            className={`text-[10px] sm:text-xs font-mono font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border-none cursor-pointer focus:outline-none skeuo-raised ${s.bg} ${s.text}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => onDelete(todo.id)}
            className="opacity-0 group-hover:opacity-100 p-1 sm:p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
            title="Delete"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
