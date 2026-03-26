"use client";

import { useState } from "react";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import type { Todo, TodoStatus, TodoPriority } from "@/lib/supabase";
import { updateTodo } from "@/lib/supabase";
import { useTilt } from "@/lib/useTilt";
import { fireConfetti } from "@/lib/confetti";

/* ─── Status config ─── */
const STATUS_CONFIG: Record<
  TodoStatus,
  { dot: string; bg: string; text: string; border: string; label: string }
> = {
  pending:     { dot: "#f5a623", bg: "rgba(245,166,35,0.10)",  text: "#f5a623", border: "rgba(245,166,35,0.22)",  label: "Pending"     },
  in_progress: { dot: "#4da6ff", bg: "rgba(77,166,255,0.10)",  text: "#4da6ff", border: "rgba(77,166,255,0.22)",  label: "In Progress" },
  done:        { dot: "#5ecf95", bg: "rgba(94,207,149,0.10)",  text: "#5ecf95", border: "rgba(94,207,149,0.22)",  label: "Done"        },
  blocked:     { dot: "#ff6b6b", bg: "rgba(255,107,107,0.10)", text: "#ff6b6b", border: "rgba(255,107,107,0.22)", label: "Blocked"     },
};

/* ─── Priority config ─── */
const PRIORITY_CONFIG: Record<TodoPriority, { color: string; bg: string; border: string }> = {
  critical: { color: "#ff6b6b", bg: "rgba(255,107,107,0.10)", border: "rgba(255,107,107,0.20)" },
  high:     { color: "#ff9500", bg: "rgba(255,149,0,0.10)",   border: "rgba(255,149,0,0.20)"   },
  medium:   { color: "#f5a623", bg: "rgba(245,166,35,0.10)",  border: "rgba(245,166,35,0.20)"  },
  low:      { color: "#8e8e93", bg: "rgba(142,142,147,0.10)", border: "rgba(142,142,147,0.20)" },
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
  const tilt = useTilt(4);

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
      className="group liquid-glass-sweep hover-lift tilt-card rounded-[18px] animate-fade-in-up"
      style={{
        animationDelay: `${index * 45}ms`,
        transition: "transform 0.15s ease-out, box-shadow 0.28s ease, border-color 0.28s ease, background 0.2s ease",
      }}
    >
      {editing ? (
        /* ── Edit Mode ── */
        <div className="p-4 sm:p-5 space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-[14px] px-3.5 py-2.5 text-[13px] font-medium focus:outline-none"
            style={{
              background: "rgba(0,0,0,0.15)",
              border: "0.5px solid var(--glass-border-hover)",
              color: "var(--text-primary)",
              fontFamily: "-apple-system, sans-serif",
              boxShadow: "inset 0 1px 4px rgba(0,0,0,0.15)",
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") handleCancelEdit();
            }}
          />
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Add description…"
            rows={2}
            className="w-full rounded-[14px] px-3.5 py-2.5 text-xs font-mono focus:outline-none resize-none"
            style={{
              background: "rgba(0,0,0,0.12)",
              border: "0.5px solid var(--glass-border)",
              color: "var(--text-secondary)",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.12)",
            }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancelEdit}
              className="btn-glass px-3 py-1.5 text-xs rounded-xl"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="btn-accent px-4 py-1.5 text-xs rounded-xl"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        /* ── View Mode ── */
        <div className="flex items-start justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4">
          {/* Left: content */}
          <div
            className="flex-1 min-w-0"
            onDoubleClick={() => setEditing(true)}
            title="Double-click to edit"
          >
            {/* Title row */}
            <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5">
              {/* Status dot */}
              <div className="relative flex-shrink-0 mt-[1px]">
                <span
                  className="w-[7px] h-[7px] sm:w-2 sm:h-2 rounded-full block"
                  style={{ backgroundColor: sc.dot, boxShadow: `0 0 6px ${sc.dot}66` }}
                />
                {todo.status === "in_progress" && (
                  <span
                    className="absolute inset-0 w-[7px] h-[7px] sm:w-2 sm:h-2 rounded-full animate-ping opacity-25"
                    style={{ backgroundColor: sc.dot }}
                  />
                )}
              </div>

              {/* Title */}
              <h3
                className="text-[13px] sm:text-sm font-medium tracking-tight leading-snug"
                style={{
                  color: todo.status === "done" ? "var(--text-muted)" : "var(--text-primary)",
                  textDecoration: todo.status === "done" ? "line-through" : "none",
                  fontFamily: "-apple-system, SF Pro Display, sans-serif",
                  letterSpacing: "-0.01em",
                  textDecorationColor: "var(--text-muted)",
                }}
              >
                {todo.title}
              </h3>
            </div>

            {/* Description */}
            {todo.description && (
              <p
                className="text-[11px] sm:text-xs ml-[19px] sm:ml-[22px] mb-2 line-clamp-1 font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                {todo.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 sm:gap-2.5 ml-[19px] sm:ml-[22px] flex-wrap">
              {/* Priority pill */}
              <span
                className="text-[9px] sm:text-[10px] font-mono font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-[7px]"
                style={{
                  background: pc.bg,
                  color: pc.color,
                  border: `0.5px solid ${pc.border}`,
                }}
              >
                {todo.priority}
              </span>

              {/* Agent */}
              <span
                className="text-[10px] sm:text-[11px] font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                @{todo.assigned_agent}
              </span>

              {/* Due date */}
              {todo.due_date && (
                <span
                  className="text-[10px] sm:text-[11px] font-mono flex items-center gap-1"
                  style={{
                    color: isOverdue ? "#ff6b6b" : isDueToday ? "#f5a623" : "var(--text-muted)",
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2.5"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  {new Date(todo.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  {isOverdue && <span style={{ color: "#ff6b6b" }}> · overdue</span>}
                  {isDueToday && <span style={{ color: "#f5a623" }}> · today</span>}
                </span>
              )}

              {/* Updated time */}
              <span
                className="text-[9px] font-mono hidden sm:inline"
                style={{ color: "var(--text-tertiary)" }}
              >
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Edit button */}
            <button
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-[10px] transition-all duration-200 btn-glass"
              style={{ color: "var(--text-muted)", padding: "6px" }}
              title="Edit"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>

            {/* Status select */}
            <select
              value={todo.status}
              onChange={(e) => handleStatusChange(todo.id, e.target.value as TodoStatus)}
              className="text-[10px] sm:text-[11px] font-mono font-semibold px-2.5 sm:px-3 py-1.5 rounded-[11px] cursor-pointer focus:outline-none"
              style={{
                background: sc.bg,
                color: sc.text,
                border: `0.5px solid ${sc.border}`,
                backdropFilter: "blur(8px)",
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>

            {/* Delete button */}
            <button
              onClick={() => onDelete(todo.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-[10px] transition-all duration-200"
              style={{
                color: "var(--text-muted)",
                padding: "6px",
                background: "transparent",
                border: "0.5px solid transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,107,107,0.10)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,107,107,0.25)";
                (e.currentTarget as HTMLElement).style.color = "#ff6b6b";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              }}
              title="Delete"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
