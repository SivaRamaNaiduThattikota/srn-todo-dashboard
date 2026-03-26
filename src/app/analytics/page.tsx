"use client";

import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { fetchActivityLog, type ActivityLog } from "@/lib/supabase";
import { useMemo, useState, useEffect } from "react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

export default function AnalyticsPage() {
  const { todos, loading } = useRealtimeTodos();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [actLoading, setActLoading] = useState(true);

  useEffect(() => {
    fetchActivityLog(30).then((d) => { setActivities(d); setActLoading(false); }).catch(() => setActLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = todos.length;
    const done = todos.filter((t) => t.status === "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const byPriority = { critical: todos.filter((t) => t.priority === "critical").length, high: todos.filter((t) => t.priority === "high").length, medium: todos.filter((t) => t.priority === "medium").length, low: todos.filter((t) => t.priority === "low").length };
    const byAgent: Record<string, { total: number; done: number }> = {};
    todos.forEach((t) => { if (!byAgent[t.assigned_agent]) byAgent[t.assigned_agent] = { total: 0, done: 0 }; byAgent[t.assigned_agent].total++; if (t.status === "done") byAgent[t.assigned_agent].done++; });
    const byStatus = { pending: todos.filter((t) => t.status === "pending").length, in_progress: todos.filter((t) => t.status === "in_progress").length, done, blocked: todos.filter((t) => t.status === "blocked").length };
    const overdue = todos.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;
    return { total, done, completionRate, byPriority, byAgent, byStatus, overdue };
  }, [todos]);

  // Burndown + velocity data (last 14 days)
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const created = activities.filter((a) => a.action === "created" && format(new Date(a.created_at), "yyyy-MM-dd") === dayStr).length;
      const completed = activities.filter((a) => a.action === "status_changed" && a.new_value === "done" && format(new Date(a.created_at), "yyyy-MM-dd") === dayStr).length;
      return { date: format(day, "MMM d"), day: format(day, "EEE"), created, completed };
    });
  }, [activities]);

  const maxChart = Math.max(...chartData.map((d) => Math.max(d.created, d.completed)), 1);

  // Productivity score (0-100 based on completion rate, no overdue, balanced priority)
  const productivityScore = useMemo(() => {
    let score = 0;
    score += stats.completionRate * 0.4; // 40% weight on completion
    score += stats.overdue === 0 ? 25 : Math.max(0, 25 - stats.overdue * 5); // 25% for no overdue
    score += stats.byStatus.blocked === 0 ? 15 : Math.max(0, 15 - stats.byStatus.blocked * 3); // 15% for no blocked
    const inProgressRatio = stats.total > 0 ? stats.byStatus.in_progress / stats.total : 0;
    score += inProgressRatio > 0.1 && inProgressRatio < 0.5 ? 20 : 10; // 20% for balanced WIP
    return Math.min(100, Math.round(score));
  }, [stats]);

  const scoreColor = productivityScore >= 80 ? "#6ee7b7" : productivityScore >= 50 ? "#fbbf24" : "#f87171";
  const maxP = Math.max(stats.byPriority.critical, stats.byPriority.high, stats.byPriority.medium, stats.byPriority.low, 1);
  const maxS = Math.max(stats.byStatus.pending, stats.byStatus.in_progress, stats.byStatus.done, stats.byStatus.blocked, 1);

  // Weekly velocity
  const thisWeek = chartData.slice(-7).reduce((s, d) => s + d.completed, 0);
  const lastWeek = chartData.slice(0, 7).reduce((s, d) => s + d.completed, 0);
  const velocityTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Analytics</h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>Task distribution, velocity, and productivity</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="glass-heavy rounded-2xl px-6 py-5 flex items-center gap-3 animate-float-in">
            <div className="relative w-4 h-4"><div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--border-default)" }} /><div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "var(--accent)" }} /></div>
            <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>Loading...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Top row: Score + Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 animate-fade-in-up">
            {/* Productivity Score — big */}
            <div className="col-span-2 sm:col-span-1 liquid-glass rounded-2xl px-5 py-5 hover-lift text-center">
              <div className="text-4xl font-bold font-mono tracking-tight" style={{ color: scoreColor }}>{productivityScore}</div>
              <div className="text-[10px] uppercase tracking-[0.15em] font-mono mt-1" style={{ color: "var(--text-muted)" }}>Productivity</div>
              <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: "var(--bg-input)" }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${productivityScore}%`, background: scoreColor }} />
              </div>
            </div>
            {[
              { label: "Total", value: stats.total, color: "var(--text-primary)" },
              { label: "Done", value: `${stats.completionRate}%`, color: "#6ee7b7" },
              { label: "Velocity", value: `${thisWeek}/wk`, color: velocityTrend >= 0 ? "#6ee7b7" : "#f87171" },
              { label: "Overdue", value: stats.overdue, color: stats.overdue > 0 ? "#f87171" : "#6ee7b7" },
            ].map((s, i) => (
              <div key={s.label} className="liquid-glass rounded-2xl px-4 py-4 hover-lift" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="text-2xl font-semibold font-mono tracking-tight" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] font-mono mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Burndown / Velocity Chart */}
          <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>14-day activity</h3>
              <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: "#60a5fa" }} /> Created</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: "#6ee7b7" }} /> Completed</span>
                {velocityTrend !== 0 && (
                  <span style={{ color: velocityTrend > 0 ? "#6ee7b7" : "#f87171" }}>
                    {velocityTrend > 0 ? "↑" : "↓"} {Math.abs(velocityTrend)}% vs last week
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-end gap-1 sm:gap-2" style={{ height: "120px" }}>
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: "90px" }}>
                    <div className="flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(2, (d.created / maxChart) * 90)}px`, background: "#60a5fa", opacity: 0.7, animationDelay: `${i * 30}ms` }} />
                    <div className="flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(2, (d.completed / maxChart) * 90)}px`, background: "#6ee7b7", opacity: 0.8, animationDelay: `${i * 30}ms` }} />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{d.day.charAt(0)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority Distribution */}
            <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
              <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Priority distribution</h3>
              <div className="space-y-3">
                {([
                  { key: "critical" as const, label: "Critical", color: "#f87171" },
                  { key: "high" as const, label: "High", color: "#fb923c" },
                  { key: "medium" as const, label: "Medium", color: "#fbbf24" },
                  { key: "low" as const, label: "Low", color: "#94a3b8" },
                ]).map((p) => (
                  <div key={p.key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{p.label}</span>
                      <span className="text-xs font-mono font-medium" style={{ color: p.color }}>{stats.byPriority[p.key]}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(stats.byPriority[p.key] / maxP) * 100}%`, background: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
              <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Status breakdown</h3>
              <div className="space-y-3">
                {([
                  { key: "pending" as const, label: "Pending", color: "#fbbf24" },
                  { key: "in_progress" as const, label: "In Progress", color: "#60a5fa" },
                  { key: "done" as const, label: "Done", color: "#6ee7b7" },
                  { key: "blocked" as const, label: "Blocked", color: "#f87171" },
                ]).map((s) => (
                  <div key={s.key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                      <span className="text-xs font-mono font-medium" style={{ color: s.color }}>{stats.byStatus[s.key]}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(stats.byStatus[s.key] / maxS) * 100}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent Workload */}
          <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Agent workload</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(stats.byAgent).map(([agent, data], i) => {
                const rate = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                return (
                  <div key={agent} className="liquid-glass rounded-xl px-4 py-4 hover-lift">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
                        <span className="text-[10px] font-mono font-medium" style={{ color: "var(--accent)" }}>{agent[0].toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>@{agent}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{data.total}</span>
                      <span className="text-[10px] font-mono" style={{ color: "#6ee7b7" }}>{rate}% done</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "var(--bg-input)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Recent activity</h3>
            {actLoading ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading activity...</p>
            ) : activities.length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>No activity yet. Start creating and completing tasks to see your history here.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activities.slice(0, 30).map((a) => {
                  const actionColors: Record<string, string> = { created: "#60a5fa", status_changed: "#fbbf24", completed: "#6ee7b7", deleted: "#f87171" };
                  const actionLabels: Record<string, string> = { created: "Created", status_changed: "Status changed", completed: "Completed", deleted: "Deleted" };
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: actionColors[a.action] || "var(--text-muted)" }} />
                      <span className="text-xs font-mono flex-1" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: actionColors[a.action] }}>{actionLabels[a.action]}</span>
                        {a.new_value && <> — {a.action === "status_changed" ? `${a.old_value} → ${a.new_value}` : a.new_value}</>}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(a.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
