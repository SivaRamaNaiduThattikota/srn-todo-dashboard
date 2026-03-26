"use client";

import { useState } from "react";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import type { Todo, TodoStatus, TodoPriority } from "@/lib/supabase";
import { updateTodo } from "@/lib/supabase";
import { useTilt } from "@/lib/useTilt";
import { fireConfetti } from "@/lib/confetti";

const STATUS_CONFIG: Record<TodoStatus, { dot: string; bg: string; text: string; label: string }> = {
  pending: { dot: "#fbbf24", bg: "rgba(251,191,36,0.1)", text: "#fbbf24", label: "Pending" },
  in_progress: { dot: "#60a5fa", bg: "rgba(96,165,250,0.1)", text: "#60a5fa", label: "In Progress" },
  done: { dot: "#6ee7b7", bg: "rgba(110,231,183,0.1)", text: "#6ee7b7", label: "Done" },
  blocked: { dot: "#f87171", bg: "rgba(248,113,113,0.1)", text: "#f87171", label: "Blocked" },
};

const PRIORITY_CONFIG: Record<TodoPriority, { color: string; bg: string }> = {
  critical: { color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  high: { color: "#fb923c", bg: "rgba(251,146,60,0.1)" },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  low: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

const STATUS_OPTIONS: TodoStatus[] = ["pending", "in_progress", "done", "blocked"];

interface Props {
  todo: Todo;
  index: number;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onDelete: (id: string) => void;
}

export function TodoCard({ todo, index, onStatusChange, onDelete }: Props) {
  const sc = STATUS_CONFIG[todo.status];
  const pc = PRIORITY_CONFIG[todo.priority];
  const tilt = useTilt(5);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description || "");

  const timeAgo = formatDistanceToNow(new Date(todo.updated_at), { addSuffix: true });
  const isOverdue = todo.due_date && isPast(new Date(todo.due_date)) && todo.status !== "done";
  const isDueToday = todo.due_date && isToday(new Date(todo.due_date));

  const handleStatusChange = (id: string, status: TodoStatus) => {
    if (status === "done" && todo.status !== "done") fireConfetti();
    onStatusChange(id, status);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    await updateTodo(todo.id, { title: editTitle.trim(), description: editDesc.trim() });
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(todo.title);
    setEditDesc(todo.description || "");
    setEditing(false);
  };

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="group liquid-glass rounded-2xl px-4 sm:px-5 py-3 sm:py-4 hover-lift animate-fade-in-up tilt-card"
      style={{ animationDelay: `${index * 50}ms`, transition: "transform 0.15s ease-out" }}
    >
      {editing ? (
        /* ─── Edit Mode ─── */
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") handleCancelEdit(); }}
          />
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Add description..."
            rows={2}
            className="w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none resize-none"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs rounded-lg" style={{ color: "var(--text-muted)" }}>Cancel</button>
            <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs rounded-lg font-medium" style={{ background: "var(--accent)", color: "#0a0a0b" }}>Save</button>
          </div>
        </div>
      ) : (
        /* ─── View Mode ─── */
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0" onDoubleClick={() => setEditing(true)} title="Double-click to edit">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              {/* Status dot with ping */}
              <div className="relative flex-shrink-0">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full block" style={{ backgroundColor: sc.dot }} />
                {todo.status === "in_progress" && (
                  <span className="absolute inset-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-ping opacity-30" style={{ backgroundColor: sc.dot }} />
                )}
              </div>
              {/* Title */}
              <h3 className="text-xs sm:text-sm font-medium tracking-tight cursor-pointer"
                style={{ color: todo.status === "done" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: todo.status === "done" ? "line-through" : "none" }}>
                {todo.title}
              </h3>
            </div>

            {/* Description preview */}
            {todo.description && (
              <p className="text-[10px] sm:text-xs ml-4 sm:ml-5 mb-1.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>
                {todo.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 sm:gap-3 ml-4 sm:ml-5 flex-wrap">
              {/* Priority */}
              <span className="text-[9px] sm:text-[10px] font-mono font-medium uppercase tracking-widest px-2 py-0.5 rounded-lg"
                style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.color}20` }}>
                {todo.priority}
              </span>

              {/* Agent */}
              <span className="text-[10px] sm:text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                @{todo.assigned_agent}
              </span>

              {/* Due date */}
              {todo.due_date && (
                <span className="text-[10px] sm:text-xs font-mono flex items-center gap-1"
                  style={{ color: isOverdue ? "#f87171" : isDueToday ? "#fbbf24" : "var(--text-muted)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  {new Date(todo.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  {isOverdue && " (overdue)"}
                  {isDueToday && " (today)"}
                </span>
              )}

              {/* Updated time */}
              <span className="text-[10px] font-mono hidden sm:inline" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Edit button */}
            <button onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 p-1 sm:p-1.5 rounded-lg transition-all duration-200"
              style={{ color: "var(--text-muted)" }} title="Edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>

            {/* Status dropdown */}
            <select
              value={todo.status}
              onChange={(e) => handleStatusChange(todo.id, e.target.value as TodoStatus)}
              className="text-[10px] sm:text-xs font-mono font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border-none cursor-pointer focus:outline-none"
              style={{ background: sc.bg, color: sc.text }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>

            {/* Delete */}
            <button onClick={() => onDelete(todo.id)}
              className="opacity-0 group-hover:opacity-100 p-1 sm:p-1.5 rounded-lg transition-all duration-200 hover:bg-red-500/10"
              style={{ color: "var(--text-muted)" }} title="Delete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
