"use client";

import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { useMemo, useState } from "react";
import type { Todo } from "@/lib/supabase";

interface Insight {
  type: "warning" | "suggestion" | "achievement" | "priority";
  icon: string;
  title: string;
  description: string;
  color: string;
}

function generateInsights(todos: Todo[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Blocked items alert
  const blocked = todos.filter((t) => t.status === "blocked");
  if (blocked.length > 0) {
    insights.push({
      type: "warning",
      icon: "!",
      title: `${blocked.length} task${blocked.length > 1 ? "s" : ""} blocked`,
      description: `Blocked: ${blocked.map((t) => t.title).join(", ")}. These need attention to unblock your workflow.`,
      color: "text-status-blocked",
    });
  }

  // Overdue tasks
  const overdue = todos.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== "done");
  if (overdue.length > 0) {
    insights.push({
      type: "warning",
      icon: "⏰",
      title: `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`,
      description: `Past due: ${overdue.map((t) => t.title).join(", ")}. Consider reprioritizing or rescheduling.`,
      color: "text-priority-critical",
    });
  }

  // Too many critical tasks
  const critical = todos.filter((t) => t.priority === "critical" && t.status !== "done");
  if (critical.length > 3) {
    insights.push({
      type: "suggestion",
      icon: "↓",
      title: "Too many critical tasks",
      description: `You have ${critical.length} critical items. Not everything can be critical — consider downgrading some to "high" to maintain focus.`,
      color: "text-priority-high",
    });
  }

  // Completion rate achievement
  const total = todos.length;
  const done = todos.filter((t) => t.status === "done").length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;
  if (rate >= 80) {
    insights.push({
      type: "achievement",
      icon: "★",
      title: `${rate}% completion rate!`,
      description: "Excellent progress. You're crushing it. Keep the momentum going.",
      color: "text-status-done",
    });
  } else if (rate < 30 && total > 5) {
    insights.push({
      type: "suggestion",
      icon: "→",
      title: `Only ${rate}% tasks completed`,
      description: "Consider breaking large tasks into smaller ones, or mark items done that are already finished.",
      color: "text-status-pending",
    });
  }

  // Agent balance check
  const agentLoad: Record<string, number> = {};
  todos.filter((t) => t.status !== "done").forEach((t) => {
    agentLoad[t.assigned_agent] = (agentLoad[t.assigned_agent] || 0) + 1;
  });
  const agents = Object.entries(agentLoad);
  if (agents.length > 1) {
    const max = Math.max(...agents.map(([, v]) => v));
    const min = Math.min(...agents.map(([, v]) => v));
    if (max > min * 3) {
      const overloaded = agents.find(([, v]) => v === max)?.[0];
      insights.push({
        type: "suggestion",
        icon: "⚖",
        title: "Unbalanced workload",
        description: `@${overloaded} has ${max} active tasks — significantly more than others. Consider redistributing.`,
        color: "text-status-in_progress",
      });
    }
  }

  // Suggest next action
  const inProgress = todos.filter((t) => t.status === "in_progress");
  const pending = todos.filter((t) => t.status === "pending");
  if (inProgress.length === 0 && pending.length > 0) {
    const next = pending.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })[0];
    insights.push({
      type: "priority",
      icon: "→",
      title: "Suggested next action",
      description: `Start working on "${next.title}" (${next.priority} priority). No tasks are currently in progress.`,
      color: "text-accent",
    });
  }

  // Nothing happening
  if (insights.length === 0) {
    insights.push({
      type: "achievement",
      icon: "✓",
      title: "Everything looks good",
      description: "No issues detected. Your task board is balanced and on track. Keep going!",
      color: "text-status-done",
    });
  }

  return insights;
}

function generatePriorities(todos: Todo[]): string[] {
  const priorities: string[] = [];

  const blocked = todos.filter((t) => t.status === "blocked");
  if (blocked.length > 0) priorities.push(`Unblock: ${blocked[0].title}`);

  const critical = todos.filter((t) => t.priority === "critical" && t.status !== "done");
  if (critical.length > 0 && priorities.length < 3) priorities.push(`Complete: ${critical[0].title}`);

  const inProgress = todos.filter((t) => t.status === "in_progress");
  if (inProgress.length > 0 && priorities.length < 3) priorities.push(`Finish: ${inProgress[0].title}`);

  const pendingHigh = todos.filter((t) => t.status === "pending" && (t.priority === "critical" || t.priority === "high"));
  if (pendingHigh.length > 0 && priorities.length < 3) priorities.push(`Start: ${pendingHigh[0].title}`);

  while (priorities.length < 3) priorities.push("Continue daily practice: Python + SQL + ML");

  return priorities.slice(0, 3);
}

export default function AssistantPage() {
  const { todos, loading } = useRealtimeTodos();
  const [showDetail, setShowDetail] = useState<number | null>(null);

  const insights = useMemo(() => generateInsights(todos), [todos]);
  const priorities = useMemo(() => generatePriorities(todos), [todos]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center skeuo-raised">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">AI Assistant</h1>
            <p className="text-sm text-text-muted font-mono mt-0.5">Smart rules engine — analyzes your tasks in real-time</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="glass-heavy rounded-2xl px-8 py-6 flex items-center gap-4 animate-float-in">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            </div>
            <span className="text-sm font-mono text-text-secondary">Analyzing tasks...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today's Priorities */}
          <div className="liquid-glass rounded-2xl p-6 animate-fade-in-up">
            <h2 className="text-sm font-medium text-accent mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-accent/10 flex items-center justify-center text-[10px]">→</span>
              Today&apos;s top 3 priorities
            </h2>
            <div className="space-y-3">
              {priorities.map((p, i) => (
                <div key={i} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="w-6 h-6 rounded-lg glass flex items-center justify-center text-xs font-mono text-accent font-medium">
                    {i + 1}
                  </span>
                  <span className="text-sm text-white">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono text-text-muted uppercase tracking-[0.15em] px-1">Insights</h2>
            {insights.map((insight, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-5 hover-lift cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${(i + 3) * 60}ms` }}
                onClick={() => setShowDetail(showDetail === i ? null : i)}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-8 h-8 rounded-xl glass flex items-center justify-center text-sm flex-shrink-0 ${insight.color}`}>
                    {insight.icon}
                  </span>
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium ${insight.color}`}>{insight.title}</h3>
                    <p className={`text-xs text-text-secondary mt-1 leading-relaxed transition-all duration-300 ${
                      showDetail === i ? "max-h-40 opacity-100" : "max-h-5 overflow-hidden opacity-70"
                    }`}>
                      {insight.description}
                    </p>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-text-muted transition-transform duration-300 flex-shrink-0 mt-1 ${showDetail === i ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Upgrade notice */}
          <div className="glass rounded-xl p-4 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted/60">ℹ</span>
              <p className="text-xs text-text-muted font-mono">
                Running on smart rules engine (free). Add ANTHROPIC_API_KEY in .env for AI-powered insights with natural language summaries.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
