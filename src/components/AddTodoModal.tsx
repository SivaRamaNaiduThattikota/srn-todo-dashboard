"use client";

import { useState } from "react";
import type { TodoPriority, TodoCategory } from "@/lib/supabase";

interface Props {
  onAdd: (data: { title: string; description: string; priority: TodoPriority; assigned_agent: string; due_date: string | null; category: TodoCategory }) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES: { value: TodoCategory; label: string; color: string }[] = [
  { value: "learning", label: "Learning", color: "#8b5cf6" },
  { value: "project", label: "Project", color: "#3b82f6" },
  { value: "interview-prep", label: "Interview", color: "#f59e0b" },
  { value: "work", label: "Work", color: "#64748b" },
  { value: "personal", label: "Personal", color: "#10b981" },
  { value: "general", label: "General", color: "#6b7280" },
];

export function AddTodoModal({ onAdd, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [agent, setAgent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<TodoCategory>("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true); setError(null);
    try {
      await onAdd({ title: title.trim(), description: description.trim(), priority, assigned_agent: agent.trim() || "unassigned", due_date: dueDate || null, category });
    } catch (err: any) { setError(err?.message || "Failed to add task"); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative rounded-3xl p-5 sm:p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-hover)", backdropFilter: "blur(40px)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>

        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>New task</h2>
        {error && <div className="mb-3 p-2.5 rounded-xl text-xs font-mono" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>{error}</div>}

        <label className="block mb-3">
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            className="mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
        </label>

        <label className="block mb-3">
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Description <span style={{ opacity: 0.5 }}>(optional)</span></span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows={2}
            className="mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none resize-none"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
        </label>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Due date</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none [color-scheme:dark]"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as TodoCategory)}
              className="mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        </div>

        <label className="block mb-3">
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Priority</span>
          <div className="flex gap-1.5 mt-1.5">
            {(["critical", "high", "medium", "low"] as TodoPriority[]).map((p) => {
              const colors: Record<string, string> = { critical: "#f87171", high: "#fb923c", medium: "#fbbf24", low: "#94a3b8" };
              return (
                <button key={p} onClick={() => setPriority(p)} type="button"
                  className="flex-1 py-2 text-[10px] font-mono font-medium rounded-xl transition-all"
                  style={{
                    background: priority === p ? `${colors[p]}20` : "var(--bg-input)",
                    border: `1px solid ${priority === p ? `${colors[p]}50` : "var(--border-default)"}`,
                    color: priority === p ? colors[p] : "var(--text-muted)",
                  }}>{p}</button>
              );
            })}
          </div>
        </label>

        <label className="block mb-5">
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Agent</span>
          <input type="text" value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="developer, designer..."
            className="mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
        </label>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} type="button" className="px-4 py-2 text-xs rounded-xl" style={{ color: "var(--text-muted)" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!title.trim() || loading} type="button"
            className="px-5 py-2 text-xs font-medium rounded-xl disabled:opacity-30"
            style={{ background: "var(--accent)", color: "#0a0a0b" }}>{loading ? "Adding..." : "Add task"}</button>
        </div>
      </div>
    </div>
  );
}
