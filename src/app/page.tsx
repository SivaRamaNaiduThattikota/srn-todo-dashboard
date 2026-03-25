"use client";

import { useState, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { addTodo, updateTodo, deleteTodo, type TodoStatus, type TodoPriority } from "@/lib/supabase";
import { TodoCard } from "@/components/TodoCard";
import { StatsBar } from "@/components/StatsBar";
import { AddTodoModal } from "@/components/AddTodoModal";
import { EventLog } from "@/components/EventLog";

const STATUS_FILTERS: (TodoStatus | "all")[] = ["all", "pending", "in_progress", "done", "blocked"];

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Command Center
            </h1>
            <span className="flex items-center gap-1.5 text-xs font-mono text-accent bg-accent-muted px-2 py-0.5 rounded-full">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-accent inline-block" />
              LIVE
            </span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 text-sm font-medium bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors"
          >
            + New Task
          </button>
        </div>
        <p className="text-sm text-text-muted font-mono">
          Real-time task tracking &middot; Supabase WebSocket
        </p>
      </header>

      <StatsBar todos={todos} />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1 bg-surface-1 p-1 rounded-lg border border-surface-3">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === s
                  ? "bg-surface-3 text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {s === "all"
                ? "All"
                : s === "in_progress"
                ? "In Progress"
                : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search tasks or agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-surface-1 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40 transition-colors font-mono"
        />
      </div>

      <EventLog lastEvent={lastEvent} />

      {/* Todo Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-text-secondary">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-mono">Connecting to Supabase...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
          Connection error: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-text-muted text-sm font-mono">
          No tasks match your filter.
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

      <div className="mt-6 text-xs text-text-muted font-mono text-center">
        {filtered.length} of {todos.length} tasks shown
      </div>

      {showAdd && (
        <AddTodoModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}
