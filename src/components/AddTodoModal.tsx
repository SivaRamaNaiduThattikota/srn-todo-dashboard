"use client";

import { useState } from "react";
import type { TodoPriority } from "@/lib/supabase";

interface Props {
  onAdd: (data: { title: string; priority: TodoPriority; assigned_agent: string }) => void;
  onClose: () => void;
}

export function AddTodoModal({ onAdd, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [agent, setAgent] = useState("claude");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), priority, assigned_agent: agent.trim() || "unassigned" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative animate-slide-up bg-surface-1 border border-surface-3 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-text-primary mb-4">New Task</h2>

        <label className="block mb-4">
          <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="mt-1.5 w-full bg-surface-0 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40 font-mono"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Priority</span>
          <div className="flex gap-2 mt-1.5">
            {(["critical", "high", "medium", "low"] as TodoPriority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 text-xs font-mono font-medium rounded-lg border transition-all ${
                  priority === p
                    ? p === "critical" ? "bg-priority-critical/20 text-priority-critical border-priority-critical/40"
                    : p === "high" ? "bg-priority-high/20 text-priority-high border-priority-high/40"
                    : p === "medium" ? "bg-priority-medium/20 text-priority-medium border-priority-medium/40"
                    : "bg-priority-low/20 text-priority-low border-priority-low/40"
                    : "bg-surface-2 text-text-muted border-surface-3 hover:border-surface-4"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </label>

        <label className="block mb-6">
          <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Assigned Agent</span>
          <input
            type="text"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            placeholder="e.g. claude, developer, designer"
            className="mt-1.5 w-full bg-surface-0 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40 font-mono"
          />
        </label>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-5 py-2 text-sm font-medium bg-accent text-surface-0 rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
