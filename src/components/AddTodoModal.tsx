"use client";

import { useState } from "react";
import type { TodoPriority } from "@/lib/supabase";

interface Props {
  onAdd: (data: { title: string; description: string; priority: TodoPriority; assigned_agent: string; due_date: string | null }) => Promise<void>;
  onClose: () => void;
}

export function AddTodoModal({ onAdd, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [agent, setAgent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim(),
        priority,
        assigned_agent: agent.trim() || "unassigned",
        due_date: dueDate || null,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to add task");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose} />

      <div className="relative rounded-3xl p-5 sm:p-7 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto"
        style={{ background: "rgba(30, 30, 35, 0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(40px)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <h2 className="text-lg sm:text-xl font-semibold text-white mb-5 tracking-tight">New task</h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs font-mono" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
            {error}
          </div>
        )}

        <label className="block mb-4">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: "#a1a1aa" }}>Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?" autoFocus
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-mono focus:outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </label>

        <label className="block mb-4">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: "#a1a1aa" }}>Description <span style={{ opacity: 0.4 }}>(optional)</span></span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, notes, or context..." rows={2}
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-mono focus:outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </label>

        <label className="block mb-4">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: "#a1a1aa" }}>Due date <span style={{ opacity: 0.4 }}>(optional)</span></span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-mono focus:outline-none [color-scheme:dark]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </label>

        <label className="block mb-4">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: "#a1a1aa" }}>Priority</span>
          <div className="flex gap-2 mt-2">
            {(["critical", "high", "medium", "low"] as TodoPriority[]).map((p) => {
              const isActive = priority === p;
              const colors: Record<string, string> = {
                critical: "#f87171", high: "#fb923c", medium: "#fbbf24", low: "#94a3b8",
              };
              return (
                <button key={p} onClick={() => setPriority(p)} type="button"
                  className="flex-1 py-2 sm:py-2.5 text-[10px] sm:text-xs font-mono font-medium rounded-xl transition-all duration-200"
                  style={{
                    background: isActive ? `${colors[p]}20` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? `${colors[p]}50` : "rgba(255,255,255,0.08)"}`,
                    color: isActive ? colors[p] : "#71717a",
                  }}>
                  {p}
                </button>
              );
            })}
          </div>
        </label>

        <label className="block mb-6">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: "#a1a1aa" }}>Assigned agent</span>
          <input type="text" value={agent} onChange={(e) => setAgent(e.target.value)}
            placeholder="e.g. developer, designer, devops"
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-mono focus:outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </label>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} type="button"
            className="px-4 sm:px-5 py-2.5 text-sm rounded-xl transition-all duration-200"
            style={{ color: "#a1a1aa" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!title.trim() || loading} type="button"
            className="px-5 sm:px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-30"
            style={{ background: "var(--accent)", color: "#0a0a0b" }}>
            {loading ? "Adding..." : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}
