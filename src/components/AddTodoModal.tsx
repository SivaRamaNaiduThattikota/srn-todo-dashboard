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
  const [agent, setAgent] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), priority, assigned_agent: agent.trim() || "unassigned" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal with liquid glass */}
      <div className="relative glass-heavy rounded-3xl p-7 w-full max-w-md animate-slide-up">
        {/* Top shine line */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <h2 className="text-xl font-semibold text-white mb-6 tracking-tight">New Task</h2>

        {/* Title */}
        <label className="block mb-5">
          <span className="text-[11px] font-mono text-text-muted uppercase tracking-[0.15em]">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="mt-2 w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted/50 focus:outline-none focus:border-accent/30 font-mono focus:shadow-[0_0_20px_rgba(110,231,183,0.08)]"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </label>

        {/* Priority */}
        <label className="block mb-5">
          <span className="text-[11px] font-mono text-text-muted uppercase tracking-[0.15em]">Priority</span>
          <div className="flex gap-2 mt-2">
            {(["critical", "high", "medium", "low"] as TodoPriority[]).map((p) => {
              const isActive = priority === p;
              const colors: Record<string, { active: string; idle: string }> = {
                critical: { active: "bg-priority-critical/20 text-priority-critical border-priority-critical/30 status-glow-blocked", idle: "" },
                high: { active: "bg-priority-high/20 text-priority-high border-priority-high/30", idle: "" },
                medium: { active: "bg-priority-medium/20 text-priority-medium border-priority-medium/30", idle: "" },
                low: { active: "bg-priority-low/20 text-priority-low border-priority-low/30", idle: "" },
              };
              return (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2.5 text-xs font-mono font-medium rounded-xl border transition-all duration-300 ${
                    isActive
                      ? `${colors[p].active} skeuo-raised`
                      : "glass text-text-muted hover:text-white hover:border-white/10"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </label>

        {/* Agent */}
        <label className="block mb-7">
          <span className="text-[11px] font-mono text-text-muted uppercase tracking-[0.15em]">Assigned agent</span>
          <input
            type="text"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            placeholder="e.g. developer, designer, devops"
            className="mt-2 w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted/50 focus:outline-none focus:border-accent/30 font-mono focus:shadow-[0_0_20px_rgba(110,231,183,0.08)]"
          />
        </label>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-text-secondary hover:text-white transition-all duration-300 rounded-xl hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-6 py-2.5 text-sm font-medium bg-accent text-surface-0 rounded-xl hover:bg-accent-dim transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed skeuo-raised hover:shadow-[0_0_24px_rgba(110,231,183,0.2)]"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
