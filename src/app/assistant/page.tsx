"use client";

import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { fetchActivityLog, type ActivityLog } from "@/lib/supabase";
import { useMemo, useState, useEffect } from "react";
import type { Todo } from "@/lib/supabase";

interface Insight {
  type: "warning" | "suggestion" | "achievement" | "priority";
  icon: string;
  title: string;
  description: string;
  color: string;
}

function generateInsights(todos: Todo[], activities: ActivityLog[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  const blocked = todos.filter((t) => t.status === "blocked");
  if (blocked.length > 0)
    insights.push({ type: "warning", icon: "!", title: `${blocked.length} blocked task${blocked.length > 1 ? "s" : ""}`, description: `Blocked: ${blocked.map((t) => t.title).join(", ")}. Unblock these to keep your workflow moving.`, color: "#f87171" });

  const overdue = todos.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== "done");
  if (overdue.length > 0)
    insights.push({ type: "warning", icon: "⏰", title: `${overdue.length} overdue`, description: `Past due: ${overdue.map((t) => t.title).join(", ")}. Reprioritize or reschedule.`, color: "#f87171" });

  const critical = todos.filter((t) => t.priority === "critical" && t.status !== "done");
  if (critical.length > 3)
    insights.push({ type: "suggestion", icon: "↓", title: "Too many critical tasks", description: `${critical.length} critical items. Downgrade some to "high" to maintain focus.`, color: "#fb923c" });

  const total = todos.length;
  const done  = todos.filter((t) => t.status === "done").length;
  const rate  = total > 0 ? Math.round((done / total) * 100) : 0;
  if (rate >= 80)
    insights.push({ type: "achievement", icon: "★", title: `${rate}% completion rate!`, description: "Excellent progress. Keep the momentum.", color: "#6ee7b7" });
  else if (rate < 30 && total > 5)
    insights.push({ type: "suggestion", icon: "→", title: `Only ${rate}% complete`, description: "Break large tasks into smaller ones, or mark done items.", color: "#fbbf24" });

  const agentLoad: Record<string, number> = {};
  todos.filter((t) => t.status !== "done").forEach((t) => { agentLoad[t.assigned_agent] = (agentLoad[t.assigned_agent] || 0) + 1; });
  const agents = Object.entries(agentLoad);
  if (agents.length > 1) {
    const max = Math.max(...agents.map(([, v]) => v));
    const min = Math.min(...agents.map(([, v]) => v));
    if (max > min * 3) {
      const overloaded = agents.find(([, v]) => v === max)?.[0];
      insights.push({ type: "suggestion", icon: "⚖", title: "Unbalanced workload", description: `@${overloaded} has ${max} active tasks. Consider redistributing.`, color: "#60a5fa" });
    }
  }

  const noDueDate = todos.filter((t) => !t.due_date && t.status !== "done");
  if (noDueDate.length > 3)
    insights.push({ type: "suggestion", icon: "📅", title: `${noDueDate.length} tasks without due dates`, description: "Adding deadlines helps track progress. Set due dates for better planning.", color: "#fbbf24" });

  const staleInProgress = todos.filter((t) => {
    if (t.status !== "in_progress") return false;
    return (now.getTime() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60 * 24) > 3;
  });
  if (staleInProgress.length > 0)
    insights.push({ type: "warning", icon: "⏳", title: `${staleInProgress.length} stale in-progress task${staleInProgress.length > 1 ? "s" : ""}`, description: `Not updated in 3+ days: ${staleInProgress.map((t) => t.title).join(", ")}. Still working on these?`, color: "#fb923c" });

  const todayActivities = activities.filter((a) => new Date(a.created_at).toDateString() === now.toDateString());
  const todayCompleted  = todayActivities.filter((a) => a.action === "status_changed" && a.new_value === "done").length;
  if (todayCompleted >= 3)
    insights.push({ type: "achievement", icon: "🔥", title: `${todayCompleted} tasks completed today!`, description: "You're on fire. Great productivity today.", color: "#6ee7b7" });

  const inProgress = todos.filter((t) => t.status === "in_progress");
  const pending    = todos.filter((t) => t.status === "pending");
  if (inProgress.length === 0 && pending.length > 0) {
    const next = pending.sort((a, b) => { const po = { critical: 0, high: 1, medium: 2, low: 3 }; return po[a.priority] - po[b.priority]; })[0];
    insights.push({ type: "priority", icon: "→", title: "Start next task", description: `Begin "${next.title}" (${next.priority}). No tasks in progress right now.`, color: "var(--accent)" });
  }

  if (insights.length === 0)
    insights.push({ type: "achievement", icon: "✓", title: "All clear", description: "No issues. Your board is balanced and on track.", color: "#6ee7b7" });

  return insights;
}

function generatePriorities(todos: Todo[]): string[] {
  const p: string[] = [];
  const blocked    = todos.filter((t) => t.status === "blocked");
  if (blocked.length > 0) p.push(`Unblock: ${blocked[0].title}`);
  const critical   = todos.filter((t) => t.priority === "critical" && t.status !== "done");
  if (critical.length > 0 && p.length < 3) p.push(`Complete: ${critical[0].title}`);
  const inProgress = todos.filter((t) => t.status === "in_progress");
  if (inProgress.length > 0 && p.length < 3) p.push(`Finish: ${inProgress[0].title}`);
  const pendingHigh = todos.filter((t) => t.status === "pending" && (t.priority === "critical" || t.priority === "high"));
  if (pendingHigh.length > 0 && p.length < 3) p.push(`Start: ${pendingHigh[0].title}`);
  while (p.length < 3) p.push("Continue daily practice: Python + SQL + ML");
  return p.slice(0, 3);
}

export default function AssistantPage() {
  const { todos, loading }  = useRealtimeTodos();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [showDetail, setShowDetail] = useState<number | null>(null);

  useEffect(() => { fetchActivityLog(7).then(setActivities).catch(() => {}); }, []);

  const insights   = useMemo(() => generateInsights(todos, activities), [todos, activities]);
  const priorities = useMemo(() => generatePriorities(todos), [todos]);

  const totalActive = todos.filter((t) => t.status !== "done").length;
  const todayDone   = activities.filter(
    (a) => a.action === "status_changed" && a.new_value === "done" && new Date(a.created_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto pb-32 md:pb-10">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center skeuo-raised"
            style={{ background: "var(--accent-muted)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"
              style={{ stroke: "var(--accent)" }}>
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              AI Assistant
            </h1>
            <p className="text-xs sm:text-sm font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
              Smart analysis — {totalActive} active tasks, {todayDone} done today
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="glass-heavy rounded-2xl px-6 py-5 flex items-center gap-3 animate-float-in">
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--glass-border)" }} />
              <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "var(--accent)" }} />
            </div>
            <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>Analyzing…</span>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Priorities */}
          <div className="liquid-glass rounded-2xl p-5 sm:p-6 animate-fade-in-up">
            <h2 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: "var(--accent)" }}>
              <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px]"
                style={{ background: "var(--accent-muted)" }}>→</span>
              Today&apos;s priorities
            </h2>
            <div className="space-y-3">
              {priorities.map((p, i) => (
                <div key={i} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="w-6 h-6 rounded-lg glass flex items-center justify-center text-xs font-mono font-medium"
                    style={{ color: "var(--accent)" }}>{i + 1}</span>
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-2.5">
            <h2 className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.15em] px-1"
              style={{ color: "var(--text-muted)" }}>
              Insights ({insights.length})
            </h2>
            {insights.map((ins, i) => (
              <div key={i}
                className="glass rounded-2xl p-4 sm:p-5 hover-lift cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${(i + 3) * 50}ms` }}
                onClick={() => setShowDetail(showDetail === i ? null : i)}>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl glass flex items-center justify-center text-sm flex-shrink-0"
                    style={{ color: ins.color }}>{ins.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium" style={{ color: ins.color }}>{ins.title}</h3>
                    <p className="text-xs mt-1 leading-relaxed transition-all duration-300"
                      style={{ color: "var(--text-secondary)", maxHeight: showDetail === i ? "160px" : "20px", overflow: "hidden", opacity: showDetail === i ? 1 : 0.7 }}>
                      {ins.description}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="flex-shrink-0 mt-1 transition-transform duration-300"
                    style={{ color: "var(--text-muted)", transform: showDetail === i ? "rotate(180deg)" : "rotate(0)" }}>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
