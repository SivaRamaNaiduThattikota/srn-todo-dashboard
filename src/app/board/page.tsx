"use client";

import { useState } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { updateTodo, type TodoStatus } from "@/lib/supabase";

const COLUMNS: { status: TodoStatus; label: string; color: string; glow: string }[] = [
  { status: "pending", label: "Pending", color: "text-status-pending", glow: "border-status-pending/20" },
  { status: "in_progress", label: "In Progress", color: "text-status-in_progress", glow: "border-status-in_progress/20" },
  { status: "done", label: "Done", color: "text-status-done", glow: "border-status-done/20" },
  { status: "blocked", label: "Blocked", color: "text-status-blocked", glow: "border-status-blocked/20" },
];

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-priority-critical",
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
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
    if (dragging) {
      await updateTodo(dragging, { status });
    }
    setDragging(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Kanban Board</h1>
        <p className="text-sm text-text-muted font-mono mt-1">Drag tasks between columns to change status</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="glass-heavy rounded-2xl px-8 py-6 flex items-center gap-4 animate-float-in">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            </div>
            <span className="text-sm font-mono text-text-secondary">Loading board...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTodos = todos.filter((t) => t.status === col.status);
            const isDragTarget = dragOver === col.status;
            return (
              <div
                key={col.status}
                className={`glass rounded-2xl p-4 min-h-[400px] transition-all duration-300 ${
                  isDragTarget ? `ring-2 ring-white/20 scale-[1.01] ${col.glow}` : ""
                }`}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.status)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${col.color}`}>{col.label}</span>
                  </div>
                  <span className="glass text-[10px] font-mono px-2 py-0.5 rounded-lg text-text-muted">
                    {colTodos.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {colTodos.map((todo, i) => (
                    <div
                      key={todo.id}
                      draggable
                      onDragStart={() => handleDragStart(todo.id)}
                      onDragEnd={handleDragEnd}
                      className={`liquid-glass rounded-xl px-4 py-3 cursor-grab active:cursor-grabbing hover-lift animate-fade-in-up ${
                        dragging === todo.id ? "opacity-40 scale-95" : ""
                      }`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[todo.priority]}`} />
                        <span className={`text-xs font-medium ${
                          todo.status === "done" ? "line-through text-text-muted/50" : "text-white"
                        }`}>
                          {todo.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-3.5">
                        <span className="text-[10px] font-mono text-text-muted">@{todo.assigned_agent}</span>
                        {todo.due_date && (
                          <span className="text-[10px] font-mono text-text-muted">
                            {new Date(todo.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {colTodos.length === 0 && (
                    <div className="text-center py-8 text-text-muted/40 text-xs font-mono">
                      Drop tasks here
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
