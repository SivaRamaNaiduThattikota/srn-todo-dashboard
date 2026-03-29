"use client";

import { useState, useEffect } from "react";
import {
  fetchDeletedTodos,   hardDeleteTodo,   restoreTodo,
  fetchDeletedNotes,   hardDeleteNote,   restoreNote,
  fetchDeletedProjects, hardDeleteProject, restoreProject,
  fetchDeletedDecisions, hardDeleteDecision, restoreDecision,
  fetchDeletedLearningPhases, hardDeleteLearningPhase, restoreLearningPhase,
  emptyRecycleBin,
  type Todo, type Note, type Project, type Decision, type LearningPhase,
} from "@/lib/supabase";

export type BinTable = "todos" | "notes" | "projects" | "decisions" | "learning_phases";

const BIN_CONFIG: Record<BinTable, { label: string; icon: string; color: string }> = {
  todos:            { label: "Tasks",          icon: "☑",  color: "#6ee7b7" },
  notes:            { label: "Notes",          icon: "📝", color: "#60a5fa" },
  projects:         { label: "Projects",       icon: "🚀", color: "#a78bfa" },
  decisions:        { label: "Decisions",      icon: "⚖️", color: "#f59e0b" },
  learning_phases:  { label: "Learning Phases", icon: "📚", color: "#f87171" },
};

type AnyItem = { id: string | number; deleted_at: string | null; [key: string]: any };

async function fetchDeleted(table: BinTable): Promise<AnyItem[]> {
  switch (table) {
    case "todos":           return fetchDeletedTodos();
    case "notes":           return fetchDeletedNotes();
    case "projects":        return fetchDeletedProjects();
    case "decisions":       return fetchDeletedDecisions();
    case "learning_phases": return fetchDeletedLearningPhases();
  }
}
async function hardDelete(table: BinTable, id: string | number): Promise<void> {
  switch (table) {
    case "todos":           return hardDeleteTodo(id as string);
    case "notes":           return hardDeleteNote(id as string);
    case "projects":        return hardDeleteProject(id as string);
    case "decisions":       return hardDeleteDecision(id as string);
    case "learning_phases": return hardDeleteLearningPhase(id as number);
  }
}
async function restore(table: BinTable, id: string | number): Promise<void> {
  switch (table) {
    case "todos":           return restoreTodo(id as string);
    case "notes":           return restoreNote(id as string);
    case "projects":        return restoreProject(id as string);
    case "decisions":       return restoreDecision(id as string);
    case "learning_phases": return restoreLearningPhase(id as number);
  }
}
function getLabel(table: BinTable, item: AnyItem): string {
  switch (table) {
    case "todos":           return (item as Todo).title;
    case "notes":           return (item as Note).title;
    case "projects":        return (item as Project).title;
    case "decisions":       return (item as Decision).decision;
    case "learning_phases": return (item as LearningPhase).title;
  }
}
function getSubtitle(table: BinTable, item: AnyItem): string {
  switch (table) {
    case "todos":     return `${(item as Todo).priority} · @${(item as Todo).assigned_agent}`;
    case "notes":     return (item as Note).tags?.slice(0,3).join(", ") || "";
    case "projects":  return (item as Project).category || "";
    case "decisions": return (item as Decision).category;
    case "learning_phases": return (item as LearningPhase).duration || "";
  }
}

interface Props {
  table: BinTable;
  onClose: () => void;
  onRestored?: () => void;
}

export function RecycleBinModal({ table, onClose, onRestored }: Props) {
  const [items, setItems]               = useState<AnyItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [confirmId, setConfirmId]       = useState<string | number | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const cfg = BIN_CONFIG[table];

  const load = async () => {
    setLoading(true);
    try { setItems(await fetchDeleted(table)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [table]);

  const handleRestore = async (id: string | number) => {
    await restore(table, id);
    await load();
    onRestored?.();
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Restored successfully", type: "success" } }));
  };

  const handleHardDelete = async (id: string | number) => {
    await hardDelete(table, id);
    setConfirmId(null);
    await load();
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Permanently deleted", type: "success" } }));
  };

  const handleEmptyBin = async () => {
    await emptyRecycleBin(table);
    setConfirmEmpty(false);
    setItems([]);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Bin emptied", type: "success" } }));
  };

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 z-[60] animate-fade-in"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
        onClick={onClose} />

      {/* Sheet */}
      <div className="fixed z-[61] left-0 right-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:px-4">
        <div className="relative w-full sm:max-w-lg flex flex-col animate-slide-up"
          style={{
            background: "var(--cc-glass-base)",
            backdropFilter: "blur(48px) saturate(2.2)",
            border: "0.5px solid var(--cc-tile-border)",
            borderRadius: "24px 24px 0 0",
            maxHeight: "calc(var(--dvh, 100dvh) - 64px - env(safe-area-inset-bottom, 0px))",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.30)",
          }}>

          {/* Drag handle */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div style={{ width: "36px", height: "4px", borderRadius: "100px", background: "var(--cc-text-muted)", opacity: 0.35 }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-3 flex-shrink-0"
            style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <span>{cfg.icon}</span> {cfg.label} Bin
              </h2>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                {items.length} deleted item{items.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && !confirmEmpty && (
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

          {/* Confirm empty */}
          {confirmEmpty && (
            <div className="mx-5 mt-3 p-3 rounded-[14px] flex-shrink-0 animate-fade-in"
              style={{ background: "rgba(255,107,107,0.08)", border: "0.5px solid rgba(255,107,107,0.25)" }}>
              <p className="text-xs font-mono mb-2" style={{ color: "#f87171" }}>
                Permanently delete all {items.length} items? Cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={handleEmptyBin}
                  className="flex-1 py-2.5 text-xs font-medium rounded-[10px]"
                  style={{ background: "rgba(248,65,65,0.18)", color: "#f87171" }}>
                  Yes, empty
                </button>
                <button onClick={() => setConfirmEmpty(false)}
                  className="flex-1 py-2.5 text-xs rounded-[10px]"
                  style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", minHeight: 0 }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: cfg.color }} />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 opacity-25">🗑</div>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Bin is empty</p>
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Deleted {cfg.label.toLowerCase()} appear here</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={String(item.id)}>
                  {/* Confirm hard delete */}
                  {confirmId === item.id && (
                    <div className="mb-2 p-3 rounded-[14px] animate-fade-in"
                      style={{ background: "rgba(255,107,107,0.08)", border: "0.5px solid rgba(255,107,107,0.25)" }}>
                      <p className="text-xs font-mono mb-2" style={{ color: "#f87171" }}>
                        Permanently delete "{getLabel(table, item)}"? Cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => handleHardDelete(item.id)}
                          className="flex-1 py-2.5 text-xs font-medium rounded-[10px]"
                          style={{ background: "rgba(248,65,65,0.18)", color: "#f87171" }}>
                          Delete forever
                        </button>
                        <button onClick={() => setConfirmId(null)}
                          className="flex-1 py-2.5 text-xs rounded-[10px]"
                          style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="glass rounded-[16px] px-4 py-3 flex items-center gap-3"
                    style={{ opacity: confirmId === item.id ? 0.45 : 1 }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate"
                        style={{ color: "var(--text-primary)", textDecoration: "line-through", opacity: 0.7 }}>
                        {getLabel(table, item)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {getSubtitle(table, item) && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[6px]"
                            style={{ background: `${cfg.color}15`, color: cfg.color }}>
                            {getSubtitle(table, item)}
                          </span>
                        )}
                        <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                          deleted {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleRestore(item.id)}
                        className="px-2.5 py-1.5 rounded-[10px] text-[10px] font-mono"
                        style={{ background: "rgba(94,207,149,0.12)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.28)" }}>
                        Restore
                      </button>
                      <button onClick={() => setConfirmId(confirmId === item.id ? null : item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-[10px]"
                        style={{ background: confirmId === item.id ? "rgba(255,107,107,0.18)" : "transparent", color: "#ff6b6b", border: "0.5px solid rgba(255,107,107,0.25)" }}>
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

          <div className="flex-shrink-0 sm:hidden" style={{ height: "8px" }} />
        </div>
      </div>
    </>
  );
}
