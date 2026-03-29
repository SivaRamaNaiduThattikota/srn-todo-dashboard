"use client";

import { useState, useCallback, useEffect } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import {
  addTodo, updateTodo, deleteTodo,
  fetchTemplates, createTodoFromTemplate,
  type Todo, type TodoStatus, type TodoPriority, type TodoCategory,
  type ResourceLink, type TaskTemplate,
} from "@/lib/supabase";

const STATUS_OPTIONS: { value: TodoStatus; label: string; color: string; icon: string }[] = [
  { value: "pending",     label: "Pending",     color: "#f5a623", icon: "○" },
  { value: "in_progress", label: "In Progress", color: "#4da6ff", icon: "◑" },
  { value: "done",        label: "Done",        color: "#5ecf95", icon: "●" },
  { value: "blocked",     label: "Blocked",     color: "#ff6b6b", icon: "✕" },
];
const PRIORITY_OPTIONS: { value: TodoPriority; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "#f87171" },
  { value: "high",     label: "High",     color: "#fb923c" },
  { value: "medium",   label: "Medium",   color: "#fbbf24" },
  { value: "low",      label: "Low",      color: "#94a3b8" },
];
const CATEGORY_OPTIONS: { value: TodoCategory; label: string }[] = [
  { value: "learning",       label: "Learning" },
  { value: "project",        label: "Project" },
  { value: "interview-prep", label: "Interview Prep" },
  { value: "work",           label: "Work" },
  { value: "personal",       label: "Personal" },
  { value: "general",        label: "General" },
];
const RESOURCE_TYPE_OPTIONS = ["article", "video", "github", "doc", "tool", "course", "other"] as const;
const TABS = ["basics", "details", "resources"] as const;
type TabId = typeof TABS[number];

function priorityColor(p: TodoPriority) { return PRIORITY_OPTIONS.find((o) => o.value === p)?.color ?? "#94a3b8"; }
function formatDate(d: string | null) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, color: "#f87171" };
  if (diff === 0) return { label: "Due today",                   color: "#f5a623" };
  if (diff <= 3)  return { label: `${diff}d left`,               color: "#f5a623" };
  return           { label: `${diff}d`,                          color: "#94a3b8" };
}

interface ModalProps {
  todo?: Todo | null;
  onSave: (data: Partial<Todo>) => Promise<void>;
  onClose: () => void;
}

function TodoModal({ todo, onSave, onClose }: ModalProps) {
  const isEdit = !!todo;
  const [saving, setSaving]       = useState(false);
  const [tabIdx, setTabIdx]       = useState(0);
  const tab: TabId                = TABS[tabIdx];

  const [title, setTitle]             = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [status, setStatus]           = useState<TodoStatus>(todo?.status ?? "pending");
  const [priority, setPriority]       = useState<TodoPriority>(todo?.priority ?? "medium");
  const [category, setCategory]       = useState<TodoCategory>(todo?.category ?? "general");
  const [agent, setAgent]             = useState(todo?.assigned_agent ?? "");
  const [dueDate, setDueDate]         = useState(todo?.due_date?.slice(0, 10) ?? "");
  const [startDate, setStartDate]     = useState(todo?.start_date?.slice(0, 10) ?? "");
  const [estimatedMins, setEstimatedMins] = useState(todo?.estimated_mins?.toString() ?? "");
  const [tags, setTags]               = useState(todo?.tags?.join(", ") ?? "");
  const [resources, setResources]     = useState<ResourceLink[]>(todo?.resource_links ?? []);
  const [newResTitle, setNewResTitle] = useState("");
  const [newResUrl, setNewResUrl]     = useState("");
  const [newResType, setNewResType]   = useState<ResourceLink["type"]>("article");

  const addResource = () => {
    if (!newResTitle.trim() || !newResUrl.trim()) return;
    setResources((p) => [...p, { title: newResTitle.trim(), url: newResUrl.trim(), type: newResType }]);
    setNewResTitle(""); setNewResUrl(""); setNewResType("article");
  };
  const removeResource = (i: number) => setResources((p) => p.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(), description: description.trim(),
        status, priority, category,
        assigned_agent: agent.trim() || "srn",
        due_date: dueDate || null, start_date: startDate || null,
        estimated_mins: estimatedMins ? parseInt(estimatedMins) : null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        resource_links: resources,
      });
      onClose();
    } catch { setSaving(false); }
  };

  const isLastTab  = tabIdx === TABS.length - 1;
  const isFirstTab = tabIdx === 0;
  const TAB_LABELS: Record<TabId, string> = { basics: "Basics", details: "Details", resources: "Resources" };
  const TAB_ICONS: Record<TabId, string>  = {
    basics:    "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM12 8v4M12 16h.01",
    details:   "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    resources: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[26px] flex flex-col animate-slide-up"
        style={{
          background: "rgba(12,12,22,0.82)",
          border: "0.5px solid rgba(255,255,255,0.18)",
          backdropFilter: "blur(64px) saturate(2.8) brightness(1.08)",
          WebkitBackdropFilter: "blur(64px) saturate(2.8) brightness(1.08)",
          boxShadow: "0 32px 96px rgba(0,0,0,0.80), 0 8px 24px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.18)",
          maxHeight: "calc(100dvh - 32px)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div className="flex justify-center pt-3 flex-shrink-0 sm:hidden">
          <div style={{ width: "36px", height: "4px", borderRadius: "100px", background: "rgba(255,255,255,0.25)", opacity: 0.5 }} />
        </div>
        <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: "0.5px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.40), transparent)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ height: "2px", background: "linear-gradient(90deg, var(--accent), transparent)", flexShrink: 0 }} />

        <div className="flex items-start justify-between px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.94)" }}>{isEdit ? "Edit task" : "New task"}</h3>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.42)" }}>Fill in the details below</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.55)", fontSize: "18px", background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.14)" }}>×</button>
        </div>

        <div className="flex gap-1 px-5 pt-3 pb-1 flex-shrink-0">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTabIdx(i)}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-xl transition-all"
              style={{ background: tab === t ? "var(--accent-muted)" : "rgba(255,255,255,0.06)", color: tab === t ? "var(--accent)" : "rgba(255,255,255,0.50)", border: `0.5px solid ${tab === t ? "var(--accent-dim)" : "rgba(255,255,255,0.10)"}` }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={TAB_ICONS[t]}/></svg>
              {TAB_LABELS[t]}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-auto">
            {TABS.map((_, i) => (
              <div key={i} style={{ width: i === tabIdx ? "16px" : "6px", height: "6px", borderRadius: "100px", background: i === tabIdx ? "var(--accent)" : i < tabIdx ? "var(--accent-dim)" : "rgba(255,255,255,0.15)", transition: "all 0.22s ease" }} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4" style={{ WebkitOverflowScrolling: "touch", minHeight: 0 }}>
          {tab === "basics" && (
            <>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setTabIdx(1); } }}
                placeholder="Task title *" className="w-full rounded-[14px] px-4 py-3 text-sm font-mono focus:outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: `0.5px solid ${title ? "var(--accent)" : "rgba(255,255,255,0.12)"}`, color: "rgba(255,255,255,0.94)" }} />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)" rows={2}
                className="w-full rounded-[14px] px-4 py-3 text-xs font-mono focus:outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.94)" }} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Status</label>
                  <div className="space-y-1">
                    {STATUS_OPTIONS.map((s) => (
                      <button key={s.value} onClick={() => setStatus(s.value)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[11px] font-mono transition-all text-left"
                        style={{ background: status === s.value ? `${s.color}20` : "rgba(255,255,255,0.05)", color: status === s.value ? s.color : "rgba(255,255,255,0.50)", border: `0.5px solid ${status === s.value ? s.color + "55" : "rgba(255,255,255,0.10)"}`, fontWeight: status === s.value ? 600 : 400 }}>
                        <span style={{ fontSize: "14px" }}>{s.icon}</span><span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Priority</label>
                  <div className="space-y-1">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button key={p.value} onClick={() => setPriority(p.value)}
                        className="w-full px-2.5 py-2 rounded-[10px] text-[11px] font-mono capitalize transition-all text-left"
                        style={{ background: priority === p.value ? `${p.color}20` : "rgba(255,255,255,0.05)", color: priority === p.value ? p.color : "rgba(255,255,255,0.50)", border: `0.5px solid ${priority === p.value ? p.color + "55" : "rgba(255,255,255,0.10)"}`, fontWeight: priority === p.value ? 600 : 400 }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map((c) => (
                    <button key={c.value} onClick={() => setCategory(c.value)}
                      className="px-3 py-1.5 rounded-[10px] text-[11px] font-mono transition-all"
                      style={{ background: category === c.value ? "var(--accent-muted)" : "rgba(255,255,255,0.05)", color: category === c.value ? "var(--accent)" : "rgba(255,255,255,0.50)", border: `0.5px solid ${category === c.value ? "var(--accent-dim)" : "rgba(255,255,255,0.10)"}`, fontWeight: category === c.value ? 600 : 400 }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Assigned to</label>
                <input value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="developer, designer, yourself…"
                  className="w-full rounded-[14px] px-4 py-3 text-xs font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.94)" }} />
              </div>
            </>
          )}

          {tab === "details" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Start date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-[14px] px-3 py-2.5 text-xs font-mono focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.94)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Due date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-[14px] px-3 py-2.5 text-xs font-mono focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.94)" }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Estimated minutes</label>
                <input type="number" value={estimatedMins} onChange={(e) => setEstimatedMins(e.target.value)} placeholder="e.g. 60"
                  className="w-full rounded-[14px] px-4 py-3 text-xs font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.94)" }} />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>Tags</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="python, ml, urgent (comma-separated)"
                  className="w-full rounded-[14px] px-4 py-3 text-xs font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.94)" }} />
                {tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                      <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "resources" && (
            <>
              {resources.length > 0 && (
                <div className="space-y-1.5">
                  {resources.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-[12px]"
                      style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.10)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.88)" }}>{r.title}</div>
                        <div className="text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.38)" }}>{r.url}</div>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>{r.type}</span>
                      <button onClick={() => removeResource(i)} className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ color: "#f87171", fontSize: "16px", background: "rgba(248,65,65,0.10)" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-[16px] p-3 space-y-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.10)" }}>
                <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.38)" }}>Add resource link</p>
                <input value={newResTitle} onChange={(e) => setNewResTitle(e.target.value)} placeholder="Title (e.g. Andrew Ng Course)"
                  className="w-full rounded-[12px] px-3 py-2.5 text-xs font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.94)" }} />
                <input value={newResUrl} onChange={(e) => setNewResUrl(e.target.value)} placeholder="URL (https://...)"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addResource(); } }}
                  className="w-full rounded-[12px] px-3 py-2.5 text-xs font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.94)" }} />
                <div className="flex gap-2">
                  <select value={newResType} onChange={(e) => setNewResType(e.target.value as ResourceLink["type"])}
                    className="flex-1 rounded-[12px] px-3 text-[11px] font-mono focus:outline-none cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.70)", height: "36px" }}>
                    {RESOURCE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={addResource} disabled={!newResTitle.trim() || !newResUrl.trim()}
                    className="px-4 py-2 text-xs font-medium rounded-[12px] disabled:opacity-30 transition-all"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>+ Add</button>
                </div>
              </div>
              {resources.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>No resources yet</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>Add articles, videos, GitHub links…</p>
                </div>
              )}
            </>
          )}
          <div style={{ height: "4px" }} />
        </div>

        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
          {isLastTab ? (
            <div className="flex gap-2">
              <button onClick={() => setTabIdx(tabIdx - 1)} className="flex items-center gap-1.5 px-4 py-3 text-xs rounded-[16px] flex-shrink-0 transition-all"
                style={{ color: "rgba(255,255,255,0.55)", border: "0.5px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </button>
              <button onClick={handleSave} disabled={!title.trim() || saving}
                className="flex-1 py-3 text-sm font-medium rounded-[16px] disabled:opacity-30 transition-all"
                style={{ background: "var(--accent)", color: "#0a0a0b" }}>
                {saving ? "Saving…" : isEdit ? "Save changes" : "Add task"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {!isFirstTab ? (
                <button onClick={() => setTabIdx(tabIdx - 1)} className="flex items-center gap-1.5 px-4 py-3 text-xs rounded-[16px] flex-shrink-0 transition-all"
                  style={{ color: "rgba(255,255,255,0.55)", border: "0.5px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                  Back
                </button>
              ) : (
                <button onClick={onClose} className="px-4 py-3 text-xs rounded-[16px] flex-shrink-0"
                  style={{ color: "rgba(255,255,255,0.55)", border: "0.5px solid rgba(255,255,255,0.14)" }}>Cancel</button>
              )}
              <button onClick={() => setTabIdx(tabIdx + 1)} disabled={tab === "basics" && !title.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium rounded-[16px] disabled:opacity-30 transition-all"
                style={{ background: "var(--accent)", color: "#0a0a0b" }}>
                Next — {TABS[tabIdx + 1] ? TAB_LABELS[TABS[tabIdx + 1]] : ""}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { todos, loading } = useRealtimeTodos();
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState<TodoStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<TodoPriority | "">("");
  const [filterCategory, setFilterCategory] = useState<TodoCategory | "">("");
  const [showModal, setShowModal]         = useState(false);
  const [editTodo, setEditTodo]           = useState<Todo | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode]           = useState(false);
  const [templates, setTemplates]         = useState<TaskTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => { fetchTemplates().then(setTemplates).catch(() => {}); }, []);

  const filtered = todos.filter((t) => {
    if (filterStatus   && t.status   !== filterStatus)   return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSave = useCallback(async (data: Partial<Todo>) => {
    if (editTodo) await updateTodo(editTodo.id, data);
    else          await addTodo(data);
    setEditTodo(null);
  }, [editTodo]);

  const handleDelete = useCallback(async (id: string) => { await deleteTodo(id); }, []);

  const handleBulkDelete = useCallback(async () => {
    await Promise.all([...selectedIds].map(deleteTodo));
    setSelectedIds(new Set()); setBulkMode(false);
  }, [selectedIds]);

  const handleBulkStatus = useCallback(async (s: TodoStatus) => {
    await Promise.all([...selectedIds].map((id) => updateTodo(id, { status: s })));
    setSelectedIds(new Set()); setBulkMode(false);
  }, [selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleUseTemplate = async (tmpl: TaskTemplate) => {
    await createTodoFromTemplate(tmpl);
    setShowTemplates(false);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Created: ${tmpl.title}`, type: "success" } }));
  };

  const exportCSV = () => {
    const rows = [["Title", "Status", "Priority", "Category", "Agent", "Due", "Tags"]];
    filtered.forEach((t) => rows.push([t.title, t.status, t.priority, t.category, t.assigned_agent, t.due_date ?? "", (t.tags ?? []).join("|")]));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "tasks.csv"; a.click();
  };
  const exportJSON = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" }));
    a.download = "tasks.json"; a.click();
  };

  const total   = todos.length;
  const done    = todos.filter((t) => t.status === "done").length;
  const overdue = todos.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10" style={{ overflowX: "hidden" }}>
      <header className="mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Tasks</h1>
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
              {done}/{total} done{overdue > 0 && <span style={{ color: "#f87171" }}> · {overdue} overdue</span>}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => setShowTemplates(!showTemplates)} className="cc-btn px-3 py-2 text-xs" style={{ color: "var(--cc-text-muted)" }}>
              <span style={{ position: "relative", zIndex: 3 }}>⊞</span>
            </button>
            <button onClick={exportCSV} className="cc-btn px-3 py-2 text-xs hidden sm:flex" style={{ color: "var(--cc-text-muted)" }}>
              <span style={{ position: "relative", zIndex: 3 }}>CSV</span>
            </button>
            <button onClick={exportJSON} className="cc-btn px-3 py-2 text-xs hidden sm:flex" style={{ color: "var(--cc-text-muted)" }}>
              <span style={{ position: "relative", zIndex: 3 }}>JSON</span>
            </button>
            <button onClick={() => setBulkMode(!bulkMode)} className="cc-btn px-3 py-2 text-xs"
              style={{ color: bulkMode ? "var(--accent)" : "var(--cc-text-muted)", border: bulkMode ? "0.5px solid var(--accent-dim)" : undefined }}>
              <span style={{ position: "relative", zIndex: 3 }}>Bulk</span>
            </button>
            <button onClick={() => { setEditTodo(null); setShowModal(true); }} className="cc-btn cc-btn-accent px-3 sm:px-4 py-2 text-xs flex-shrink-0">
              <span style={{ position: "relative", zIndex: 3 }}>+ Task</span>
            </button>
          </div>
        </div>

        <div className="relative mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, tags…"
            className="w-full rounded-[14px] pl-9 pr-4 py-2.5 text-xs font-mono focus:outline-none"
            style={{ background: "var(--bg-input)", border: `0.5px solid ${search ? "var(--accent)" : "var(--glass-border)"}`, color: "var(--text-primary)" }} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)", fontSize: "16px" }}>×</button>
          )}
        </div>

        <div className="flex gap-2" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", paddingBottom: "2px" }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TodoStatus | "")}
            className="glass rounded-xl px-3 py-2 text-[11px] font-mono focus:outline-none cursor-pointer flex-shrink-0" style={{ color: "var(--text-secondary)", height: "34px" }}>
            <option value="">All status</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as TodoPriority | "")}
            className="glass rounded-xl px-3 py-2 text-[11px] font-mono focus:outline-none cursor-pointer flex-shrink-0" style={{ color: "var(--text-secondary)", height: "34px" }}>
            <option value="">All priority</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as TodoCategory | "")}
            className="glass rounded-xl px-3 py-2 text-[11px] font-mono focus:outline-none cursor-pointer flex-shrink-0" style={{ color: "var(--text-secondary)", height: "34px" }}>
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {(filterStatus || filterPriority || filterCategory || search) && (
            <button onClick={() => { setFilterStatus(""); setFilterPriority(""); setFilterCategory(""); setSearch(""); }}
              className="px-3 py-2 rounded-xl text-[11px] font-mono flex-shrink-0" style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>
              Clear
            </button>
          )}
        </div>
      </header>

      {bulkMode && selectedIds.size > 0 && (
        <div className="mb-3 liquid-glass rounded-[16px] px-4 py-3 flex items-center gap-3 animate-fade-in" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
          <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{selectedIds.size} selected</span>
          <div className="flex gap-1.5 ml-auto flex-shrink-0">
            {STATUS_OPTIONS.slice(0, 3).map((s) => (
              <button key={s.value} onClick={() => handleBulkStatus(s.value)}
                className="px-2.5 py-1.5 rounded-xl text-[10px] font-mono whitespace-nowrap"
                style={{ background: `${s.color}15`, color: s.color, border: `0.5px solid ${s.color}35` }}>→ {s.label}</button>
            ))}
            <button onClick={handleBulkDelete} className="px-2.5 py-1.5 rounded-xl text-[10px] font-mono"
              style={{ background: "rgba(248,65,65,0.12)", color: "#f87171", border: "0.5px solid rgba(248,65,65,0.28)" }}>Delete</button>
          </div>
        </div>
      )}

      {showTemplates && templates.length > 0 && (
        <div className="mb-4 liquid-glass rounded-[20px] overflow-hidden animate-fade-in">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Templates</span>
            <button onClick={() => setShowTemplates(false)} style={{ color: "var(--text-muted)", fontSize: "16px" }}>×</button>
          </div>
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.map((tmpl) => (
              <button key={tmpl.id} onClick={() => handleUseTemplate(tmpl)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-left transition-all"
                style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{tmpl.title}</div>
                  <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{tmpl.priority} · {tmpl.recurrence ?? "once"}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 animate-fade-in">
          <div className="glass rounded-2xl px-8 py-6 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-transparent mx-auto mb-3 animate-spin" style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent-dim)" }} />
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading tasks…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-[22px] p-10 text-center animate-fade-in">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{todos.length === 0 ? "No tasks yet" : "No tasks match your filters"}</p>
          <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>{todos.length === 0 ? "Add your first task to get started." : "Try clearing your search or filters."}</p>
          {todos.length === 0 && (
            <button onClick={() => { setEditTodo(null); setShowModal(true); }} className="cc-btn cc-btn-accent px-4 py-2 text-xs">
              <span style={{ position: "relative", zIndex: 3 }}>+ Add first task</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((todo, idx) => {
            const isExpanded = expandedId === todo.id;
            const isSelected = selectedIds.has(todo.id);
            const due = formatDate(todo.due_date);
            const sc  = STATUS_OPTIONS.find((s) => s.value === todo.status)!;

            return (
              <div key={todo.id} className="liquid-glass rounded-[20px] overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${idx * 25}ms`, border: isSelected ? "0.5px solid var(--accent)" : undefined, opacity: todo.status === "done" ? 0.72 : 1, transition: "opacity 0.2s" }}>

                <div className="flex items-center gap-2 px-3 sm:px-4 py-3">
                  {bulkMode && (
                    <button onClick={() => toggleSelect(todo.id)}
                      className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all"
                      style={{ background: isSelected ? "var(--accent)" : "var(--bg-input)", border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--glass-border)"}` }}>
                      {isSelected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-5"/></svg>}
                    </button>
                  )}

                  <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: sc.color, boxShadow: `0 0 6px ${sc.color}60` }} />

                  <button className="flex-1 min-w-0 text-left" onClick={() => setExpandedId(isExpanded ? null : todo.id)}>
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <span className="text-sm font-medium truncate"
                        style={{ color: todo.status === "done" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: todo.status === "done" ? "line-through" : "none" }}>
                        {todo.title}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `${priorityColor(todo.priority)}15`, color: priorityColor(todo.priority), border: `0.5px solid ${priorityColor(todo.priority)}30` }}>
                        {todo.priority}
                      </span>
                      {due && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${due.color}15`, color: due.color, border: `0.5px solid ${due.color}30` }}>
                          {due.label}
                        </span>
                      )}
                    </div>
                    {todo.description && !isExpanded && (
                      <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{todo.description}</p>
                    )}
                  </button>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <select
                      value={todo.status}
                      onChange={async (e) => {
                        const next = e.target.value as TodoStatus;
                        await updateTodo(todo.id, { status: next, ...(next === "done" ? { completed_at: new Date().toISOString() } : {}) });
                      }}
                      className="rounded-[8px] text-[10px] font-mono cursor-pointer focus:outline-none transition-all"
                      style={{ background: `${sc.color}18`, color: sc.color, border: `0.5px solid ${sc.color}45`, padding: "4px 6px", height: "28px", minWidth: "88px", maxWidth: "110px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value} style={{ background: "#0a0a14", color: s.color }}>{s.icon} {s.label}</option>
                      ))}
                    </select>

                    <button onClick={() => { setEditTodo(todo); setShowModal(true); }}
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                      style={{ color: "var(--text-muted)", background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(todo.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                      style={{ color: "var(--text-muted)", background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : todo.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ color: "var(--text-muted)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.22s ease" }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 animate-fade-in" style={{ borderTop: "0.5px solid var(--glass-border-subtle)" }}>
                    {todo.description && (
                      <p className="text-xs font-mono pt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{todo.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                      <span>Status: <span style={{ color: sc.color }}>{sc.label}</span></span>
                      <span>Category: <span style={{ color: "var(--text-secondary)" }}>{todo.category}</span></span>
                      <span>Agent: <span style={{ color: "var(--text-secondary)" }}>@{todo.assigned_agent}</span></span>
                      {todo.estimated_mins && <span>Est: <span style={{ color: "var(--text-secondary)" }}>{todo.estimated_mins}m</span></span>}
                      {todo.start_date && <span>Start: <span style={{ color: "var(--text-secondary)" }}>{todo.start_date.slice(0, 10)}</span></span>}
                      {todo.due_date && <span>Due: <span style={{ color: due?.color ?? "var(--text-secondary)" }}>{todo.due_date.slice(0, 10)}</span></span>}
                    </div>
                    {(todo.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(todo.tags ?? []).map((tag) => (
                          <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                            style={{ background: "var(--glass-fill-deep)", color: "var(--text-muted)", border: "0.5px solid var(--glass-border-subtle)" }}>{tag}</span>
                        ))}
                      </div>
                    )}
                    {(todo.resource_links ?? []).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Resources</p>
                        {todo.resource_links.map((r, i) => (
                          <a key={i} href={r.url} target="_blank" rel="noopener"
                            className="flex items-center gap-2 px-3 py-2 rounded-[11px] transition-all hover:opacity-80"
                            style={{ background: "var(--accent-muted)", border: "0.5px solid var(--accent-dim)", textDecoration: "none" }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: "var(--accent)", flexShrink: 0 }}>
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            <span className="text-[11px] font-mono flex-1 truncate" style={{ color: "var(--accent)" }}>{r.title}</span>
                            <span className="text-[9px] font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>{r.type}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <TodoModal todo={editTodo} onSave={handleSave} onClose={() => { setShowModal(false); setEditTodo(null); }} />
      )}
    </div>
  );
}
