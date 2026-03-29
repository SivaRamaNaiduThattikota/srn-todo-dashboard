"use client";

import { useState, useMemo, useEffect } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import {
  addTodo, updateTodo, deleteTodo,
  fetchDeletedTodos, restoreTodo, hardDeleteTodo, emptyRecycleBin,
  type TodoStatus, type TodoPriority, type TodoCategory, type ResourceLink, type Todo,
} from "@/lib/supabase";
import { TodoCard } from "@/components/TodoCard";
import { StatsBar } from "@/components/StatsBar";
import { AddTodoModal } from "@/components/AddTodoModal";
import { EventLog } from "@/components/EventLog";

const STATUS_FILTERS: (TodoStatus | "all")[] = ["all", "pending", "in_progress", "done", "blocked"];
const FILTER_LABELS: Record<string, string> = { all: "All", pending: "Pending", in_progress: "In Progress", done: "Done", blocked: "Blocked" };

type SortBy = "updated" | "priority" | "due_date" | "title";
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "updated",  label: "Recently updated" },
  { value: "priority", label: "Priority"          },
  { value: "due_date", label: "Due date"           },
  { value: "title",    label: "Title A-Z"          },
];
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/* ─── Recycle Bin Modal ─────────────────────────────────────────────── */
function RecycleBinModal({ onClose }: { onClose: () => void }) {
  const [items, setItems]               = useState<Todo[]>([]);
  const [loading, setLoading]           = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // id to hard-delete
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await fetchDeletedTodos()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (id: string) => {
    await restoreTodo(id);
    await load();
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Task restored", type: "success" } }));
  };

  const handleHardDelete = async (id: string) => {
    await hardDeleteTodo(id);
    setConfirmDelete(null);
    await load();
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Permanently deleted", type: "success" } }));
  };

  const handleEmptyBin = async () => {
    await emptyRecycleBin();
    setConfirmEmpty(false);
    setItems([]);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Recycle bin emptied", type: "success" } }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {/* Scrim */}
      <div className="absolute inset-0 animate-fade-in" style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(8px)" }} onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg sm:mx-4 animate-slide-up flex flex-col"
        style={{
          background: "var(--cc-glass-base)",
          backdropFilter: "blur(48px) saturate(2.2)",
          border: "0.5px solid var(--cc-tile-border)",
          borderRadius: "28px 28px 0 0",
          maxHeight: "calc(100dvh - 80px)",
        }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-0 sm:hidden flex-shrink-0">
          <div style={{ width: "36px", height: "4px", borderRadius: "100px", background: "var(--cc-text-muted)", opacity: 0.35 }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"
          style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <span>🗑</span> Recycle Bin
            </h2>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
              {items.length} deleted task{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button onClick={() => setConfirmEmpty(true)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-mono"
                style={{ background: "rgba(255,107,107,0.10)", color: "#ff6b6b", border: "0.5px solid rgba(255,107,107,0.25)" }}>
                Empty bin
              </button>
            )}
            <button onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)", color: "var(--text-muted)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Confirm empty bin */}
        {confirmEmpty && (
          <div className="mx-5 mt-3 p-3 rounded-[14px] animate-fade-in"
            style={{ background: "rgba(255,107,107,0.08)", border: "0.5px solid rgba(255,107,107,0.25)" }}>
            <p className="text-xs font-mono mb-2" style={{ color: "#f87171" }}>
              Permanently delete all {items.length} items? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={handleEmptyBin}
                className="flex-1 py-2 text-xs font-medium rounded-[10px]"
                style={{ background: "rgba(248,65,65,0.18)", color: "#f87171" }}>
                Yes, empty
              </button>
              <button onClick={() => setConfirmEmpty(false)}
                className="flex-1 py-2 text-xs rounded-[10px]"
                style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent-dim)" }} />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-25">🗑</div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Recycle bin is empty</p>
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Deleted tasks appear here</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id}>
                {/* Confirm hard delete for this item */}
                {confirmDelete === item.id && (
                  <div className="mb-1 p-3 rounded-[14px] animate-fade-in"
                    style={{ background: "rgba(255,107,107,0.08)", border: "0.5px solid rgba(255,107,107,0.25)" }}>
                    <p className="text-xs font-mono mb-2" style={{ color: "#f87171" }}>
                      Permanently delete "{item.title}"? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => handleHardDelete(item.id)}
                        className="flex-1 py-2 text-xs font-medium rounded-[10px]"
                        style={{ background: "rgba(248,65,65,0.18)", color: "#f87171" }}>
                        Delete forever
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-2 text-xs rounded-[10px]"
                        style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="glass rounded-[16px] px-4 py-3 flex items-center gap-3"
                  style={{ opacity: confirmDelete === item.id ? 0.5 : 1 }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)", textDecoration: "line-through", opacity: 0.7 }}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[6px]"
                        style={{ background: "rgba(255,149,0,0.12)", color: "#ff9500" }}>
                        {item.priority}
                      </span>
                      {item.due_date && (
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                          due {new Date(item.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      )}
                      <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                        deleted {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Restore */}
                    <button onClick={() => handleRestore(item.id)}
                      className="px-2.5 py-1.5 rounded-[10px] text-[10px] font-mono transition-all"
                      style={{ background: "rgba(94,207,149,0.12)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.28)" }}>
                      Restore
                    </button>
                    {/* Delete forever */}
                    <button onClick={() => setConfirmDelete(confirmDelete === item.id ? null : item.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-[10px] transition-all"
                      style={{ background: confirmDelete === item.id ? "rgba(255,107,107,0.18)" : "transparent", color: "#ff6b6b", border: "0.5px solid rgba(255,107,107,0.25)" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer padding for mobile safe area */}
        <div className="flex-shrink-0" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }} />
      </div>
    </div>
  );
}

/* ─── Main Tasks Page ────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { todos, loading, error, lastEvent } = useRealtimeTodos();
  const [filter, setFilter]   = useState<TodoStatus | "all">("all");
  const [search, setSearch]   = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBin, setShowBin] = useState(false);
  const [sortBy, setSortBy]   = useState<SortBy>("updated");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleNewTask = () => setShowAdd(true);
    const handleEscape  = () => { setShowAdd(false); setShowBin(false); setSelected(new Set()); };
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
          if (!a.due_date) return 1; if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case "title": return a.title.localeCompare(b.title);
        default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    return result;
  }, [todos, filter, search, sortBy]);

  const handleStatusChange = async (id: string, status: TodoStatus) => { await updateTodo(id, { status }); };
  const handleDelete = async (id: string) => { await deleteTodo(id); setSelected((s) => { const n = new Set(s); n.delete(id); return n; }); };

  const handleAdd = async (data: {
    title: string; description: string; priority: TodoPriority; assigned_agent: string;
    due_date: string | null; start_date: string | null; category: TodoCategory;
    tags: string[]; resource_links: ResourceLink[]; estimated_mins: number | null;
  }) => { await addTodo({ ...data, status: "pending" }); setShowAdd(false); };

  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const bulkMarkDone = async () => { await Promise.all(Array.from(selected).map((id) => updateTodo(id, { status: "done" }))); setSelected(new Set()); };
  const bulkDelete   = async () => { await Promise.all(Array.from(selected).map((id) => deleteTodo(id))); setSelected(new Set()); };

  const exportCSV = () => {
    const headers = "id,title,status,priority,assigned_agent,start_date,due_date,tags,estimated_mins,created_at,updated_at\n";
    const rows = todos.map((t) =>
      `${t.id},"${t.title}",${t.status},${t.priority},${t.assigned_agent},${t.start_date||""},${t.due_date||""},"${(t.tags||[]).join("|")}",${t.estimated_mins||""},${t.created_at},${t.updated_at}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `srn-tasks-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `srn-tasks-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 sm:py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-5 sm:mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight"
              style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}>
              Tasks
            </h1>
            <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ color: "var(--accent)", background: "var(--accent-muted)", border: "0.5px solid var(--accent-dim)" }}>
              <span className="live-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--accent)" }} />
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Recycle bin button */}
            <button onClick={() => setShowBin(true)}
              className="cc-btn px-3 py-1.5 text-[11px] flex items-center gap-1.5"
              title="Recycle bin">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "relative", zIndex: 3 }}>
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              <span style={{ position: "relative", zIndex: 3 }} className="hidden sm:inline">Bin</span>
            </button>

            <div className="hidden sm:flex items-center gap-1">
              <button onClick={exportCSV} className="cc-btn px-3 py-1.5 text-[10px] font-mono"><span style={{ position: "relative", zIndex: 3 }}>CSV</span></button>
              <button onClick={exportJSON} className="cc-btn px-3 py-1.5 text-[10px] font-mono"><span style={{ position: "relative", zIndex: 3 }}>JSON</span></button>
            </div>

            <button onClick={() => setShowAdd(true)} className="cc-btn cc-btn-accent px-4 py-2 text-[12px]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ position: "relative", zIndex: 3 }}><path d="M12 5v14M5 12h14"/></svg>
              <span style={{ position: "relative", zIndex: 3 }}>New Task</span>
            </button>
          </div>
        </div>
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Real-time task tracking · deleted tasks go to recycle bin</p>
      </header>

      <StatsBar todos={todos} />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="glass rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between animate-fade-in-up">
          <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{selected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={bulkMarkDone} className="cc-chip px-3 py-1 text-xs font-mono" style={{ color: "#5ecf95", borderColor: "rgba(94,207,149,0.35)" }}><span style={{ position: "relative", zIndex: 2 }}>Mark done</span></button>
            <button onClick={bulkDelete} className="cc-chip px-3 py-1 text-xs font-mono" style={{ color: "#ff6b6b", borderColor: "rgba(255,107,107,0.35)" }}><span style={{ position: "relative", zIndex: 2 }}>Delete</span></button>
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
                style={{ background: filter===s?"var(--glass-fill-hover)":"transparent", color: filter===s?"var(--text-primary)":"var(--text-muted)", boxShadow: filter===s?"var(--shadow-sm)":"none", border: filter===s?"0.5px solid var(--glass-border)":"0.5px solid transparent" }}>
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
        {filtered.length} of {todos.length} tasks · <button onClick={() => setShowBin(true)} style={{ color: "var(--text-muted)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", fontFamily: "monospace" }}>recycle bin</button>
      </div>

      {showAdd && <AddTodoModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
      {showBin  && <RecycleBinModal onClose={() => setShowBin(false)} />}
    </div>
  );
}
