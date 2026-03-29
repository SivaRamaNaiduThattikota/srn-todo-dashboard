"use client";

import { useState } from "react";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import type { Todo, TodoStatus, TodoPriority, TodoCategory } from "@/lib/supabase";
import { updateTodo } from "@/lib/supabase";
import { useTilt } from "@/lib/useTilt";
import { fireConfetti } from "@/lib/confetti";

const STATUS_CONFIG: Record<TodoStatus, { dot: string; bg: string; text: string; border: string; label: string }> = {
  pending:     { dot: "#f5a623", bg: "rgba(245,166,35,0.10)",  text: "#f5a623", border: "rgba(245,166,35,0.22)",  label: "Pending"     },
  in_progress: { dot: "#4da6ff", bg: "rgba(77,166,255,0.10)",  text: "#4da6ff", border: "rgba(77,166,255,0.22)",  label: "In Progress" },
  done:        { dot: "#5ecf95", bg: "rgba(94,207,149,0.10)",  text: "#5ecf95", border: "rgba(94,207,149,0.22)",  label: "Done"        },
  blocked:     { dot: "#ff6b6b", bg: "rgba(255,107,107,0.10)", text: "#ff6b6b", border: "rgba(255,107,107,0.22)", label: "Blocked"     },
};

const PRIORITY_CONFIG: Record<TodoPriority, { color: string; bg: string; border: string }> = {
  critical: { color: "#ff6b6b", bg: "rgba(255,107,107,0.10)", border: "rgba(255,107,107,0.20)" },
  high:     { color: "#ff9500", bg: "rgba(255,149,0,0.10)",   border: "rgba(255,149,0,0.20)"   },
  medium:   { color: "#f5a623", bg: "rgba(245,166,35,0.10)",  border: "rgba(245,166,35,0.20)"  },
  low:      { color: "#8e8e93", bg: "rgba(142,142,147,0.10)", border: "rgba(142,142,147,0.20)" },
};

const PRIORITY_OPTIONS: TodoPriority[] = ["critical", "high", "medium", "low"];
const STATUS_OPTIONS: TodoStatus[] = ["pending", "in_progress", "done", "blocked"];
const CATEGORY_OPTIONS: { value: TodoCategory; label: string; icon: string }[] = [
  { value: "learning",       label: "Learning",  icon: "📚" },
  { value: "project",        label: "Project",   icon: "🚀" },
  { value: "interview-prep", label: "Interview", icon: "🎯" },
  { value: "work",           label: "Work",      icon: "💼" },
  { value: "personal",       label: "Personal",  icon: "🌱" },
  { value: "general",        label: "General",   icon: "📋" },
];

const PRESET_TAGS = ["python","sql","ml","deep-learning","nlp","interview","system-design","dsa","cloud","aws","power-bi","urgent","research","reading","practice"];

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

  const [editing, setEditing]         = useState(false);
  const [editTitle, setEditTitle]     = useState(todo.title);
  const [editDesc, setEditDesc]       = useState(todo.description || "");
  const [editPriority, setEditPriority] = useState<TodoPriority>(todo.priority);
  const [editStatus, setEditStatus]   = useState<TodoStatus>(todo.status);
  const [editDueDate, setEditDueDate] = useState(todo.due_date || "");
  const [editStartDate, setEditStartDate] = useState(todo.start_date || "");
  const [editAgent, setEditAgent]     = useState(todo.assigned_agent || "");
  const [editCategory, setEditCategory] = useState<TodoCategory>(todo.category || "general");
  const [editTags, setEditTags]       = useState<string[]>(todo.tags || []);
  const [editTagInput, setEditTagInput] = useState("");

  const timeAgo  = formatDistanceToNow(new Date(todo.updated_at), { addSuffix: true });
  const isOverdue = todo.due_date && isPast(new Date(todo.due_date)) && todo.status !== "done";
  const isDueToday = todo.due_date && isToday(new Date(todo.due_date));

  const handleStatusChange = (id: string, status: TodoStatus) => {
    if (status === "done" && todo.status !== "done") fireConfetti();
    onStatusChange(id, status);
  };

  const openEdit = () => {
    setEditTitle(todo.title);
    setEditDesc(todo.description || "");
    setEditPriority(todo.priority);
    setEditStatus(todo.status);
    setEditDueDate(todo.due_date || "");
    setEditStartDate(todo.start_date || "");
    setEditAgent(todo.assigned_agent || "");
    setEditCategory(todo.category || "general");
    setEditTags(todo.tags || []);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    await updateTodo(todo.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      priority: editPriority,
      status: editStatus,
      due_date: editDueDate || null,
      start_date: editStartDate || null,
      assigned_agent: editAgent.trim() || "unassigned",
      category: editCategory,
      tags: editTags,
    });
    if (editStatus === "done" && todo.status !== "done") fireConfetti();
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const toggleEditTag = (t: string) => setEditTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
  const addEditTag = () => {
    const t = editTagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !editTags.includes(t)) setEditTags((p) => [...p, t]);
    setEditTagInput("");
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.15)", border: "0.5px solid var(--glass-border-hover)",
    borderRadius: "12px", padding: "9px 12px", fontSize: "12px",
    color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif",
    boxShadow: "inset 0 1px 4px rgba(0,0,0,0.12)", width: "100%",
  };

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="group liquid-glass-sweep hover-lift tilt-card rounded-[18px] animate-fade-in-up"
      style={{ animationDelay: `${index * 45}ms`, transition: "transform 0.15s ease-out, box-shadow 0.28s ease, border-color 0.28s ease" }}
    >
      {editing ? (
        /* ── Full Edit Mode ── */
        <div className="p-4 space-y-3">
          {/* Title */}
          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Task title…" className="w-full focus:outline-none font-medium"
            style={{ ...inputStyle, fontSize: "13px" }}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Escape") handleCancelEdit(); }} />

          {/* Description */}
          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)…" rows={2}
            className="w-full focus:outline-none resize-none"
            style={{ ...inputStyle, fontSize: "12px", fontFamily: "monospace" }} />

          {/* Start date + Due date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Start date</label>
              <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full focus:outline-none" style={{ ...inputStyle, colorScheme: "dark", fontSize: "12px" }} />
            </div>
            <div>
              <label className="text-[9px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Due date</label>
              <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full focus:outline-none" style={{ ...inputStyle, colorScheme: "dark", fontSize: "12px" }} />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[9px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Priority</label>
            <div className="flex gap-1.5">
              {PRIORITY_OPTIONS.map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button key={p} type="button" onClick={() => setEditPriority(p)}
                    className="flex-1 py-1.5 rounded-[10px] text-[10px] font-semibold capitalize transition-all"
                    style={{ background: editPriority===p?cfg.bg:"rgba(0,0,0,0.12)", color: editPriority===p?cfg.color:"var(--text-muted)", border: `0.5px solid ${editPriority===p?cfg.border:"transparent"}` }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-[9px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Status</label>
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button key={s} type="button" onClick={() => setEditStatus(s)}
                    className="flex-1 py-1.5 rounded-[10px] text-[9px] font-semibold transition-all"
                    style={{ background: editStatus===s?cfg.bg:"rgba(0,0,0,0.12)", color: editStatus===s?cfg.text:"var(--text-muted)", border: `0.5px solid ${editStatus===s?cfg.border:"transparent"}` }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agent + Category */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Assigned to</label>
              <input type="text" value={editAgent} onChange={(e) => setEditAgent(e.target.value)}
                placeholder="yourself…" className="w-full focus:outline-none"
                style={{ ...inputStyle, fontSize: "12px" }} />
            </div>
            <div>
              <label className="text-[9px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Category</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as TodoCategory)}
                className="w-full focus:outline-none" style={{ ...inputStyle, fontSize: "12px" }}>
                {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[9px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_TAGS.map((t) => {
                const active = editTags.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleEditTag(t)}
                    className="px-2 py-0.5 rounded-[7px] text-[9px] font-mono transition-all"
                    style={{ background: active?"var(--accent-muted)":"rgba(0,0,0,0.12)", color: active?"var(--accent)":"var(--text-muted)", border: `0.5px solid ${active?"var(--accent-dim)":"transparent"}` }}>
                    {active?"✓ ":""}{t}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input type="text" value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditTag(); } }}
                placeholder="Add custom tag…" className="flex-1 focus:outline-none"
                style={{ ...inputStyle, fontSize: "11px", padding: "7px 10px" }} />
              <button type="button" onClick={addEditTag} disabled={!editTagInput.trim()}
                className="px-3 py-1 text-[10px] rounded-[10px] disabled:opacity-30"
                style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid var(--accent)" }}>
                +
              </button>
            </div>
            {editTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {editTags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[7px] text-[9px] font-mono"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
                    {t}
                    <button type="button" onClick={() => toggleEditTag(t)} style={{ color: "var(--accent)", opacity: 0.6 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleCancelEdit}
              className="flex-1 py-2.5 rounded-[12px] text-xs font-medium transition-all"
              style={{ background: "rgba(0,0,0,0.15)", color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>
              Cancel
            </button>
            <button onClick={handleSaveEdit}
              className="flex-1 py-2.5 rounded-[12px] text-xs font-semibold transition-all"
              style={{ background: "var(--accent)", color: "#fff" }}>
              Save changes
            </button>
          </div>
        </div>
      ) : (
        /* ── View Mode ── */
        <div className="flex items-start justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4">
          <div className="flex-1 min-w-0" onDoubleClick={openEdit} title="Double-click to edit">
            {/* Title row */}
            <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5">
              <div className="relative flex-shrink-0 mt-[1px]">
                <span className="w-[7px] h-[7px] sm:w-2 sm:h-2 rounded-full block"
                  style={{ backgroundColor: sc.dot, boxShadow: `0 0 6px ${sc.dot}66` }} />
                {todo.status === "in_progress" && (
                  <span className="absolute inset-0 w-[7px] h-[7px] sm:w-2 sm:h-2 rounded-full animate-ping opacity-25"
                    style={{ backgroundColor: sc.dot }} />
                )}
              </div>
              <h3 className="text-[13px] sm:text-sm font-medium tracking-tight leading-snug"
                style={{ color: todo.status==="done"?"var(--text-muted)":"var(--text-primary)", textDecoration: todo.status==="done"?"line-through":"none", fontFamily: "-apple-system, SF Pro Display, sans-serif", letterSpacing: "-0.01em" }}>
                {todo.title}
              </h3>
            </div>

            {todo.description && (
              <p className="text-[11px] sm:text-xs ml-[19px] sm:ml-[22px] mb-2 line-clamp-1 font-mono" style={{ color: "var(--text-muted)" }}>
                {todo.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 sm:gap-2.5 ml-[19px] sm:ml-[22px] flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-mono font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-[7px]"
                style={{ background: pc.bg, color: pc.color, border: `0.5px solid ${pc.border}` }}>
                {todo.priority}
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                @{todo.assigned_agent}
              </span>
              {todo.start_date && (
                <span className="text-[10px] sm:text-[11px] font-mono flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
                  </svg>
                  {new Date(todo.start_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                </span>
              )}
              {todo.due_date && (
                <span className="text-[10px] sm:text-[11px] font-mono flex items-center gap-1"
                  style={{ color: isOverdue?"#ff6b6b":isDueToday?"#f5a623":"var(--text-muted)" }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  {new Date(todo.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  {isOverdue && <span style={{ color: "#ff6b6b" }}> · overdue</span>}
                  {isDueToday && <span style={{ color: "#f5a623" }}> · today</span>}
                </span>
              )}
              <span className="text-[9px] font-mono hidden sm:inline" style={{ color: "var(--text-tertiary)" }}>{timeAgo}</span>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button onClick={openEdit}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-[10px] transition-all duration-200 btn-glass"
              style={{ color: "var(--text-muted)", padding: "6px" }} title="Edit">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>

            <select value={todo.status} onChange={(e) => handleStatusChange(todo.id, e.target.value as TodoStatus)}
              className="text-[10px] sm:text-[11px] font-mono font-semibold px-2.5 sm:px-3 py-1.5 rounded-[11px] cursor-pointer focus:outline-none"
              style={{ background: sc.bg, color: sc.text, border: `0.5px solid ${sc.border}`, backdropFilter: "blur(8px)" }}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>

            <button onClick={() => onDelete(todo.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-[10px] transition-all duration-200"
              style={{ color: "var(--text-muted)", padding: "6px", background: "transparent", border: "0.5px solid transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,107,107,0.10)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,107,107,0.25)"; (e.currentTarget as HTMLElement).style.color = "#ff6b6b"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              title="Delete (moves to Recycle Bin)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
