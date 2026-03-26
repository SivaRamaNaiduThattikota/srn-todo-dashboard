"use client";

import { useState } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { updateTodo, type TodoStatus } from "@/lib/supabase";

/* Status config with explicit CSS values — no Tailwind color classes */
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

/* Dark mode status text — used via inline style based on data-mode */
const STATUS_TEXT_DARK: Record<TodoStatus, string> = {
  pending:     "#f5a623",
  in_progress: "#4da6ff",
  done:        "#5ecf95",
  blocked:     "#ff6b6b",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ff6b6b",
  high:     "#ff9500",
  medium:   "#f5a623",
  low:      "#8e8e93",
};

export default function BoardPage() {
  const { todos, loading } = useRealtimeTodos();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TodoStatus | null>(null);

  const handleDragStart = (id: string) => setDragging(id);

  const handleDragOver = (e: React.DragEvent, status: TodoStatus) => {
    e.preventDefault();
    setDragOver(status);
  };

  const handleDrop = async (status: TodoStatus) => {
    if (dragging) await updateTodo(dragging, { status });
    setDragging(null);
    setDragOver(null);
  };

  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <header className="mb-8 animate-fade-in-up">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}
        >
          Kanban Board
        </h1>
        <p className="text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          Drag tasks between columns to change status
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="glass-heavy rounded-2xl px-8 py-6 flex items-center gap-4 animate-float-in">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--glass-border)" }} />
              <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "var(--accent)" }} />
            </div>
            <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>Loading board...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTodos = todos.filter((t) => t.status === col.status);
            const isDragTarget = dragOver === col.status;

            return (
              <div
                key={col.status}
                className="liquid-glass rounded-[22px] p-4 min-h-[400px] transition-all duration-300"
                style={{
                  outline: isDragTarget ? `2px solid ${col.ringColor}` : "none",
                  outlineOffset: "2px",
                  transform: isDragTarget ? "scale(1.01)" : "scale(1)",
                }}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.status)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: col.textColor,
                      fontFamily: "-apple-system, sans-serif",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {col.label}
                  </span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-[8px]"
                    style={{
                      background: "var(--glass-fill)",
                      border: "0.5px solid var(--glass-border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {colTodos.length}
                  </span>
                </div>

                {/* Task cards */}
                <div className="space-y-2">
                  {colTodos.map((todo, i) => (
                    <div
                      key={todo.id}
                      draggable
                      onDragStart={() => handleDragStart(todo.id)}
                      onDragEnd={handleDragEnd}
                      className="liquid-glass-sweep rounded-[16px] px-4 py-3 cursor-grab active:cursor-grabbing hover-lift animate-fade-in-up"
                      style={{
                        animationDelay: `${i * 40}ms`,
                        opacity: dragging === todo.id ? 0.4 : 1,
                        transform: dragging === todo.id ? "scale(0.96)" : undefined,
                      }}
                    >
                      {/* Title row */}
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{
                            background: PRIORITY_COLORS[todo.priority],
                            boxShadow: `0 0 4px ${PRIORITY_COLORS[todo.priority]}66`,
                          }}
                        />
                        <span
                          className="text-[12px] sm:text-xs font-medium leading-snug"
                          style={{
                            color: todo.status === "done"
                              ? "var(--text-muted)"
                              : "var(--text-primary)",
                            textDecoration: todo.status === "done" ? "line-through" : "none",
                            textDecorationColor: "var(--text-muted)",
                            fontFamily: "-apple-system, sans-serif",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {todo.title}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 ml-3.5 flex-wrap">
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: "var(--text-muted)" }}
                        >
                          @{todo.assigned_agent}
                        </span>
                        {todo.due_date && (
                          <span
                            className="text-[10px] font-mono"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {new Date(todo.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {/* Priority pill */}
                        <span
                          className="text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[6px]"
                          style={{
                            background: `${PRIORITY_COLORS[todo.priority]}18`,
                            color: PRIORITY_COLORS[todo.priority],
                            border: `0.5px solid ${PRIORITY_COLORS[todo.priority]}30`,
                          }}
                        >
                          {todo.priority}
                        </span>
                      </div>
                    </div>
                  ))}

                  {colTodos.length === 0 && (
                    <div
                      className="text-center py-10 text-xs font-mono rounded-[14px]"
                      style={{
                        color: "var(--text-muted)",
                        border: `1.5px dashed var(--glass-border)`,
                        opacity: isDragTarget ? 0.8 : 0.4,
                        background: isDragTarget ? "var(--glass-fill)" : "transparent",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isDragTarget ? "Drop here" : "Empty"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
