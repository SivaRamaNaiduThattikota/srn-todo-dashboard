"use client";

import { useState } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { updateTodo, type TodoStatus } from "@/lib/supabase";

const COLUMNS: {
  status: TodoStatus;
  label: string;
  textColor: string;
  ringColor: string;
  dotColor: string;
}[] = [
  { status: "pending",     label: "Pending",     textColor: "#d4850a", ringColor: "rgba(245,166,35,0.25)",  dotColor: "#f5a623" },
  { status: "in_progress", label: "In Progress", textColor: "#1a7fcc", ringColor: "rgba(77,166,255,0.25)",  dotColor: "#4da6ff" },
  { status: "done",        label: "Done",        textColor: "#1a9e60", ringColor: "rgba(94,207,149,0.25)",  dotColor: "#5ecf95" },
  { status: "blocked",     label: "Blocked",     textColor: "#cc2a2a", ringColor: "rgba(255,107,107,0.25)", dotColor: "#ff6b6b" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ff6b6b",
  high:     "#ff9500",
  medium:   "#f5a623",
  low:      "#8e8e93",
};

export default function BoardPage() {
  const { todos, loading } = useRealtimeTodos();

  /* Desktop drag-and-drop */
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TodoStatus | null>(null);

  /* Mobile tap-to-move */
  const [selected, setSelected] = useState<string | null>(null);

  const handleDragStart  = (id: string) => setDragging(id);
  const handleDragOver   = (e: React.DragEvent, status: TodoStatus) => { e.preventDefault(); setDragOver(status); };
  const handleDrop       = async (status: TodoStatus) => {
    if (dragging) await updateTodo(dragging, { status });
    setDragging(null); setDragOver(null);
  };
  const handleDragEnd    = () => { setDragging(null); setDragOver(null); };

  /* Tap a card → select it; tap a column header → move it */
  const handleCardTap    = (id: string) => setSelected((prev) => prev === id ? null : id);
  const handleColumnTap  = async (status: TodoStatus) => {
    if (!selected) return;
    const todo = todos.find((t) => t.id === selected);
    if (todo && todo.status !== status) await updateTodo(selected, { status });
    setSelected(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto pb-32 md:pb-10">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}>
          Kanban board
        </h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          {selected
            ? "Tap a column header to move the selected card"
            : "Drag cards (desktop) or tap a card then tap a column (mobile)"}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="glass-heavy rounded-2xl px-8 py-6 flex items-center gap-4 animate-float-in">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--glass-border)" }} />
              <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "var(--accent)" }} />
            </div>
            <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>Loading board…</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTodos    = todos.filter((t) => t.status === col.status);
            const isDragTarget = dragOver === col.status;
            const isTapTarget  = selected !== null;
            const selectedTodo = todos.find((t) => t.id === selected);
            const canMoveTo    = isTapTarget && selectedTodo?.status !== col.status;

            return (
              <div
                key={col.status}
                className="liquid-glass rounded-[22px] p-4 min-h-[300px] sm:min-h-[400px] transition-all duration-300"
                style={{
                  outline: isDragTarget
                    ? `2px solid ${col.ringColor}`
                    : canMoveTo
                    ? `2px dashed ${col.dotColor}55`
                    : "none",
                  outlineOffset: "2px",
                  transform: isDragTarget ? "scale(1.01)" : "scale(1)",
                }}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.status)}
              >
                {/* Column header — tappable when a card is selected */}
                <button
                  className="w-full flex items-center justify-between mb-4 px-1 text-left"
                  onClick={() => handleColumnTap(col.status)}
                  style={{ cursor: isTapTarget ? "pointer" : "default" }}
                >
                  <span className="text-[13px] font-semibold"
                    style={{ color: canMoveTo ? col.dotColor : col.textColor, fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.01em", transition: "color 0.2s" }}>
                    {col.label}
                    {canMoveTo && <span className="text-[10px] font-mono ml-1.5" style={{ color: col.dotColor }}>← move here</span>}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[8px]"
                    style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)", color: "var(--text-muted)" }}>
                    {colTodos.length}
                  </span>
                </button>

                {/* Task cards */}
                <div className="space-y-2">
                  {colTodos.map((todo, i) => {
                    const isSelected = selected === todo.id;
                    return (
                      <div
                        key={todo.id}
                        draggable
                        onDragStart={() => handleDragStart(todo.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleCardTap(todo.id)}
                        className="liquid-glass-sweep rounded-[16px] px-4 py-3 cursor-grab active:cursor-grabbing hover-lift animate-fade-in-up"
                        style={{
                          animationDelay:   `${i * 40}ms`,
                          opacity:          dragging === todo.id ? 0.4 : 1,
                          transform:        dragging === todo.id ? "scale(0.96)" : undefined,
                          outline:          isSelected ? `2px solid var(--accent)` : "none",
                          outlineOffset:    "2px",
                          background:       isSelected ? "var(--glass-fill-hover)" : undefined,
                        }}
                      >
                        {/* Title row */}
                        <div className="flex items-start gap-2 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                            style={{ background: PRIORITY_COLORS[todo.priority], boxShadow: `0 0 4px ${PRIORITY_COLORS[todo.priority]}66` }} />
                          <span className="text-[12px] sm:text-xs font-medium leading-snug"
                            style={{ color: todo.status === "done" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: todo.status === "done" ? "line-through" : "none", textDecorationColor: "var(--text-muted)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.01em" }}>
                            {todo.title}
                          </span>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-2 ml-3.5 flex-wrap">
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>@{todo.assigned_agent}</span>
                          {todo.due_date && (
                            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                              {new Date(todo.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                          )}
                          <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[6px]"
                            style={{ background: `${PRIORITY_COLORS[todo.priority]}18`, color: PRIORITY_COLORS[todo.priority], border: `0.5px solid ${PRIORITY_COLORS[todo.priority]}30` }}>
                            {todo.priority}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {colTodos.length === 0 && (
                    <div className="text-center py-10 text-xs font-mono rounded-[14px] transition-all"
                      style={{ color: "var(--text-muted)", border: "1.5px dashed var(--glass-border)", opacity: isDragTarget || canMoveTo ? 0.8 : 0.4, background: isDragTarget || canMoveTo ? "var(--glass-fill)" : "transparent" }}>
                      {isDragTarget ? "Drop here" : canMoveTo ? "Move here" : "Empty"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile selection hint */}
      {selected && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 liquid-glass rounded-2xl px-5 py-3 flex items-center gap-3 animate-slide-up z-40 md:hidden">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>
            "{todos.find((t) => t.id === selected)?.title?.slice(0, 24)}…" selected
          </span>
          <button onClick={() => setSelected(null)} className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
