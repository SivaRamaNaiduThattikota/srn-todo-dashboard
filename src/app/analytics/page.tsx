"use client";

import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { useMemo } from "react";

export default function AnalyticsPage() {
  const { todos, loading } = useRealtimeTodos();

  const stats = useMemo(() => {
    const total = todos.length;
    const done = todos.filter((t) => t.status === "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    const byPriority = {
      critical: todos.filter((t) => t.priority === "critical").length,
      high: todos.filter((t) => t.priority === "high").length,
      medium: todos.filter((t) => t.priority === "medium").length,
      low: todos.filter((t) => t.priority === "low").length,
    };

    const byAgent: Record<string, { total: number; done: number }> = {};
    todos.forEach((t) => {
      if (!byAgent[t.assigned_agent]) byAgent[t.assigned_agent] = { total: 0, done: 0 };
      byAgent[t.assigned_agent].total++;
      if (t.status === "done") byAgent[t.assigned_agent].done++;
    });

    const byStatus = {
      pending: todos.filter((t) => t.status === "pending").length,
      in_progress: todos.filter((t) => t.status === "in_progress").length,
      done,
      blocked: todos.filter((t) => t.status === "blocked").length,
    };

    const overdue = todos.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;

    return { total, done, completionRate, byPriority, byAgent, byStatus, overdue };
  }, [todos]);

  const maxPriority = Math.max(stats.byPriority.critical, stats.byPriority.high, stats.byPriority.medium, stats.byPriority.low, 1);
  const maxStatus = Math.max(stats.byStatus.pending, stats.byStatus.in_progress, stats.byStatus.done, stats.byStatus.blocked, 1);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Analytics</h1>
        <p className="text-sm text-text-muted font-mono mt-1">Task distribution and team performance</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="glass-heavy rounded-2xl px-8 py-6 flex items-center gap-4 animate-float-in">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            </div>
            <span className="text-sm font-mono text-text-secondary">Crunching numbers...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-4 gap-4 animate-fade-in-up">
            {[
              { label: "Total tasks", value: stats.total, color: "text-white" },
              { label: "Completion rate", value: `${stats.completionRate}%`, color: "text-status-done" },
              { label: "Overdue", value: stats.overdue, color: stats.overdue > 0 ? "text-status-blocked" : "text-status-done" },
              { label: "Blocked", value: stats.byStatus.blocked, color: stats.byStatus.blocked > 0 ? "text-status-blocked" : "text-text-muted" },
            ].map((s, i) => (
              <div key={s.label} className="liquid-glass rounded-2xl px-5 py-5 hover-lift" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`text-3xl font-semibold font-mono ${s.color} tracking-tight`}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-mono mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority Distribution */}
            <div className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <h3 className="text-sm font-medium text-white mb-5">Priority distribution</h3>
              <div className="space-y-4">
                {([
                  { key: "critical", label: "Critical", color: "bg-priority-critical", textColor: "text-priority-critical" },
                  { key: "high", label: "High", color: "bg-priority-high", textColor: "text-priority-high" },
                  { key: "medium", label: "Medium", color: "bg-priority-medium", textColor: "text-priority-medium" },
                  { key: "low", label: "Low", color: "bg-priority-low", textColor: "text-priority-low" },
                ] as const).map((p) => (
                  <div key={p.key}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs font-mono text-text-secondary">{p.label}</span>
                      <span className={`text-xs font-mono font-medium ${p.textColor}`}>
                        {stats.byPriority[p.key]}
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden skeuo-inset">
                      <div
                        className={`h-full ${p.color} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${(stats.byPriority[p.key] / maxPriority) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Distribution */}
            <div className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
              <h3 className="text-sm font-medium text-white mb-5">Status breakdown</h3>
              <div className="space-y-4">
                {([
                  { key: "pending", label: "Pending", color: "bg-status-pending", textColor: "text-status-pending" },
                  { key: "in_progress", label: "In Progress", color: "bg-status-in_progress", textColor: "text-status-in_progress" },
                  { key: "done", label: "Done", color: "bg-status-done", textColor: "text-status-done" },
                  { key: "blocked", label: "Blocked", color: "bg-status-blocked", textColor: "text-status-blocked" },
                ] as const).map((s) => (
                  <div key={s.key}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs font-mono text-text-secondary">{s.label}</span>
                      <span className={`text-xs font-mono font-medium ${s.textColor}`}>
                        {stats.byStatus[s.key]}
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden skeuo-inset">
                      <div
                        className={`h-full ${s.color} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${(stats.byStatus[s.key] / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent Workload */}
          <div className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: "220ms" }}>
            <h3 className="text-sm font-medium text-white mb-5">Agent workload</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(stats.byAgent).map(([agent, data], i) => {
                const rate = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                return (
                  <div key={agent} className="liquid-glass rounded-xl px-4 py-4 hover-lift" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                        <span className="text-accent text-[10px] font-mono font-medium">{agent[0].toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-mono text-white">@{agent}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-semibold font-mono text-white">{data.total}</span>
                      <span className="text-[10px] font-mono text-status-done">{rate}% done</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2 skeuo-inset">
                      <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
