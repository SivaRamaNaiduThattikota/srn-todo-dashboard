"use client";

import { useState, useMemo, useEffect } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { addTodo, updateTodo, deleteTodo, type TodoStatus, type TodoPriority, type TodoCategory, type ResourceLink } from "@/lib/supabase";
import { TodoCard } from "@/components/TodoCard";
import { StatsBar } from "@/components/StatsBar";
import { AddTodoModal } from "@/components/AddTodoModal";
import { EventLog } from "@/components/EventLog";

const STATUS_FILTERS: (TodoStatus | "all")[] = ["all", "pending", "in_progress", "done", "blocked"];
const FILTER_LABELS: Record<string, string> = { all: "All", pending: "Pending", in_progress: "In Progress", done: "Done", blocked: "Blocked" };

type SortBy = "updated" | "priority" | "due_date" | "title";
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due date" },
  { value: "title", label: "Title A-Z" },
];

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function DashboardPage() {
  const { todos, loading, error, lastEvent } = useRealtimeTodos();
  const [filter, setFilter] = useState<TodoStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleNewTask = () => setShowAdd(true);
    const handleEscape = () => { setShowAdd(false); setSelected(new Set()); };
    window.addEventListener("srn:new-task", handleNewTask);
    window.addEventListener("srn:escape", handleEscape);
    return () => { window.removeEventListener("srn:new-task", handleNewTask); window.removeEventListener("srn:escape", handleEscape); };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: todos.length };
    STATUS_FILTERS.forEach((s) => { if (s !== "all") c[s] = todos.filter((t) => t.status === s).length; });
    return c;
  }, [todos]);

  const filtered = useMemo(() => {
    let result = todos.filter((t) => {
      const matchStatus = filter === "all" || t.status === filter;
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.assigned_agent.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
    result.sort((a, b) => {
      switch (sortBy) {
        case "priority": return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        case "due_date":
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case "title": return a.title.localeCompare(b.title);
        default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    return result;
  }, [todos, filter, search, sortBy]);

  const handleStatusChange = async (id: string, status: TodoStatus) => { await updateTodo(id, { status }); };
  const handleDelete = async (id: string) => { await deleteTodo(id); setSelected((s) => { const n = new Set(s); n.delete(id); return n; }); };

  /* ── Updated: accepts full v8 payload ── */
  const handleAdd = async (data: {
    title: string;
    description: string;
    priority: TodoPriority;
    assigned_agent: string;
    due_date: string | null;
    category: TodoCategory;
    tags: string[];
    resource_links: ResourceLink[];
    estimated_mins: number | null;
  }) => {
    await addTodo({ ...data, status: "pending" });
    setShowAdd(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const bulkMarkDone = async () => {
    await Promise.all(Array.from(selected).map((id) => updateTodo(id, { status: "done" })));
    setSelected(new Set());
  };
  const bulkDelete = async () => {
    await Promise.all(Array.from(selected).map((id) => deleteTodo(id)));
    setSelected(new Set());
  };

  const exportCSV = () => {
    const headers = "id,title,status,priority,assigned_agent,due_date,tags,estimated_mins,created_at,updated_at\n";
    const rows = todos.map((t) =>
      `${t.id},"${t.title}",${t.status},${t.priority},${t.assigned_agent},${t.due_date || ""},"${(t.tags || []).join("|")}",${t.estimated_mins || ""},${t.created_at},${t.updated_at}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `srn-tasks-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `srn-tasks-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 sm:py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-5 sm:mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}>Tasks</h1>
            <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ color: "var(--accent)", background: "var(--accent-muted)", border: "0.5px solid var(--accent-dim)" }}>
              <span className="live-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--accent)" }} />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={exportCSV} className="cc-btn px-3 py-1.5 text-[10px] font-mono">
                <span style={{ position: "relative", zIndex: 3 }}>CSV</span>
              </button>
              <button onClick={exportJSON} className="cc-btn px-3 py-1.5 text-[10px] font-mono">
                <span style={{ position: "relative", zIndex: 3 }}>JSON</span>
              </button>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="cc-btn cc-btn-accent px-4 py-2 text-[12px]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ position: "relative", zIndex: 3 }}>
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span style={{ position: "relative", zIndex: 3 }}>New Task</span>
            </button>
          </div>
        </div>
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Real-time task tracking</p>
      </header>

      <StatsBar todos={todos} />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="glass rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between animate-fade-in-up">
          <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{selected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={bulkMarkDone} className="cc-chip px-3 py-1 text-xs font-mono" style={{ color: "#5ecf95", borderColor: "rgba(94,207,149,0.35)" }}>
              <span style={{ position: "relative", zIndex: 2 }}>Mark done</span>
            </button>
            <button onClick={bulkDelete} className="cc-chip px-3 py-1 text-xs font-mono" style={{ color: "#ff6b6b", borderColor: "rgba(255,107,107,0.35)" }}>
              <span style={{ position: "relative", zIndex: 2 }}>Delete</span>
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Clear</button>
          </div>
        </div>
      )}

      {/* Filters + Sort + Search */}
      <div className="flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex gap-0.5 sm:gap-1 glass rounded-xl p-1 overflow-x-auto">
            {STATUS_FILTERS.map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap flex items-center gap-1"
                style={{
                  background: filter === s ? "var(--glass-fill-hover)" : "transparent",
                  color: filter === s ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: filter === s ? "var(--shadow-sm)" : "none",
                  border: filter === s ? "0.5px solid var(--glass-border)" : "0.5px solid transparent",
                }}>
                {FILTER_LABELS[s]}
                <span className="text-[9px] font-mono px-1 rounded" style={{ color: "var(--text-muted)" }}>{counts[s]}</span>
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="glass rounded-xl px-3 py-2 text-xs font-mono focus:outline-none cursor-pointer"
            style={{ color: "var(--text-secondary)", minWidth: "140px" }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" placeholder="Search tasks or agents..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full glass rounded-xl pl-10 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm font-mono focus:outline-none"
            style={{ color: "var(--text-primary)" }} />
        </div>
      </div>

      <EventLog lastEvent={lastEvent} />

      {loading ? (
        <div className="flex items-center justify-center py-16 sm:py-20">
          <div className="glass-heavy rounded-2xl px-6 py-5 flex items-center gap-3 animate-float-in">
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--glass-border)" }} />
              <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "var(--accent)" }} />
            </div>
            <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>Connecting...</span>
          </div>
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-4 animate-fade-in-up" style={{ borderColor: "rgba(255,107,107,0.2)" }}>
          <span className="text-xs font-mono" style={{ color: "#ff6b6b" }}>Connection error: {error}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 sm:py-20 animate-fade-in">
          <div className="glass-heavy rounded-2xl inline-block px-8 sm:px-12 py-8 sm:py-10">
            <div className="text-4xl mb-3 opacity-20">{todos.length === 0 ? "📋" : "🔍"}</div>
            <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              {todos.length === 0 ? "No tasks yet" : "No tasks match your filter"}
            </h3>
            <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>
              {todos.length === 0 ? "Create your first task to get started" : "Try a different filter or search term"}
            </p>
            {todos.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="cc-btn cc-btn-accent px-5 py-2.5 text-xs">
                <span style={{ position: "relative", zIndex: 3 }}>Create first task</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:gap-3">
          {filtered.map((todo, i) => (
            <TodoCard key={todo.id} todo={todo} index={i} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <div className="mt-5 sm:mt-6 text-[10px] sm:text-xs font-mono text-center" style={{ color: "var(--text-muted)" }}>
        {filtered.length} of {todos.length} tasks
      </div>

      {showAdd && <AddTodoModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
