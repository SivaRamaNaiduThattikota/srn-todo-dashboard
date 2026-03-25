"use client";

import { useState, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { addTodo, updateTodo, deleteTodo, type TodoStatus, type TodoPriority } from "@/lib/supabase";
import { TodoCard } from "@/components/TodoCard";
import { StatsBar } from "@/components/StatsBar";
import { AddTodoModal } from "@/components/AddTodoModal";
import { EventLog } from "@/components/EventLog";

const STATUS_FILTERS: (TodoStatus | "all")[] = ["all", "pending", "in_progress", "done", "blocked"];

const FILTER_LABELS: Record<string, string> = {
  all: "All",
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

export default function DashboardPage() {
  const { todos, loading, error, lastEvent } = useRealtimeTodos();
  const [filter, setFilter] = useState<TodoStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    return todos.filter((t) => {
      const matchStatus = filter === "all" || t.status === filter;
      const matchSearch =
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.assigned_agent.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [todos, filter, search]);

  const handleStatusChange = async (id: string, status: TodoStatus) => {
    await updateTodo(id, { status });
  };

  const handleDelete = async (id: string) => {
    await deleteTodo(id);
  };

  const handleAdd = async (data: {
    title: string;
    priority: TodoPriority;
    assigned_agent: string;
  }) => {
    await addTodo({ ...data, status: "pending" });
    setShowAdd(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <header className="mb-10 animate-fade-in-up">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              SRN Command Center
            </h1>
            <span className="flex items-center gap-2 text-xs font-mono text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full skeuo-raised">
              <span className="live-dot w-2 h-2 rounded-full bg-accent inline-block" />
              LIVE
            </span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="group px-5 py-2.5 text-sm font-medium liquid-glass text-accent rounded-xl hover-lift cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Task
            </span>
          </button>
        </div>
        <p className="text-sm text-text-muted font-mono tracking-wide">
          Real-time task tracking &middot; Supabase WebSocket
        </p>
      </header>

      {/* ── Stats ── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <StatsBar todos={todos} />
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        <div className="flex gap-1 glass rounded-xl p-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
                filter === s
                  ? "bg-white/10 text-white shadow-lg skeuo-raised backdrop-blur-sm"
                  : "text-text-secondary hover:text-white hover:bg-white/5"
              }`}
            >
              {FILTER_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search tasks or agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent/30 font-mono transition-all duration-300 focus:shadow-[0_0_20px_rgba(110,231,183,0.08)]"
          />
        </div>
      </div>

      {/* ── Event Log ── */}
      <EventLog lastEvent={lastEvent} />

      {/* ── Todo Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="glass-heavy rounded-2xl px-8 py-6 flex items-center gap-4 animate-float-in">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            </div>
            <span className="text-sm font-mono text-text-secondary">Connecting to Supabase...</span>
          </div>
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-5 border-red-500/20 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <span className="text-sm font-mono text-red-400">Connection error: {error}</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 animate-fade-in">
          <div className="glass-heavy rounded-2xl inline-block px-8 py-6">
            <div className="text-2xl mb-2 opacity-30">∅</div>
            <span className="text-sm font-mono text-text-muted">No tasks match your filter</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((todo, i) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              index={i}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Count ── */}
      <div className="mt-8 text-xs text-text-muted font-mono text-center animate-fade-in" style={{ animationDelay: "300ms" }}>
        {filtered.length} of {todos.length} tasks shown
      </div>

      {/* ── Add Modal ── */}
      {showAdd && (
        <AddTodoModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}
