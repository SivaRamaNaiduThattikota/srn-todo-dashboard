"use client";

import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { fetchHabits, fetchHabitLogs, fetchFocusSessions, fetchDecisions, type DailyHabit, type HabitLog, type FocusSession, type Decision } from "@/lib/supabase";
import { useState, useEffect, useMemo } from "react";
import { format, isToday, isPast, subDays } from "date-fns";

export default function BriefingPage() {
  const { todos } = useRealtimeTodos();
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  useEffect(() => {
    fetchHabits().then(setHabits).catch(() => {});
    fetchHabitLogs(7).then(setLogs).catch(() => {});
    fetchFocusSessions(7).then(setSessions).catch(() => {});
    fetchDecisions().then(setDecisions).catch(() => {});
  }, []);

  const todayHabits = logs.filter((l) => l.completed_date === today);
  const yesterdayHabits = logs.filter((l) => l.completed_date === yesterday);

  const overdue = useMemo(() => todos.filter((t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== "done"), [todos]);
  const dueToday = useMemo(() => todos.filter((t) => t.due_date && isToday(new Date(t.due_date)) && t.status !== "done"), [todos]);
  const inProgress = useMemo(() => todos.filter((t) => t.status === "in_progress"), [todos]);
  const blocked = useMemo(() => todos.filter((t) => t.status === "blocked"), [todos]);
  const critical = useMemo(() => todos.filter((t) => t.priority === "critical" && t.status !== "done"), [todos]);

  const todayFocus = sessions.filter((s) => s.completed && isToday(new Date(s.started_at))).reduce((sum, s) => sum + s.duration_minutes, 0);
  const yesterdayFocus = sessions.filter((s) => s.completed && format(new Date(s.started_at), "yyyy-MM-dd") === yesterday).reduce((sum, s) => sum + s.duration_minutes, 0);

  const decisionsToReview = decisions.filter((d) => d.status === "active" && isPast(new Date(d.review_date)));

  // Streak
  const streak = useMemo(() => {
    if (habits.length === 0) return 0;
    let s = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = format(d, "yyyy-MM-dd");
      const allDone = habits.every((h) => logs.some((l) => l.habit_id === h.id && l.completed_date === ds));
      if (allDone) { s++; d.setDate(d.getDate() - 1); } else if (i === 0) { d.setDate(d.getDate() - 1); } else break;
    }
    return s;
  }, [habits, logs]);

  // Smart priorities
  const priorities = useMemo(() => {
    const p: string[] = [];
    if (blocked.length > 0) p.push(`Unblock: ${blocked[0].title}`);
    if (overdue.length > 0) p.push(`Overdue: ${overdue[0].title}`);
    if (critical.length > 0 && p.length < 3) p.push(`Critical: ${critical[0].title}`);
    if (inProgress.length > 0 && p.length < 3) p.push(`Continue: ${inProgress[0].title}`);
    if (todayHabits.length < habits.length && p.length < 3) p.push("Complete daily habits");
    while (p.length < 3) p.push("Practice: Python + SQL + ML concept");
    return p.slice(0, 3);
  }, [blocked, overdue, critical, inProgress, todayHabits, habits]);

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="mb-6 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>{greeting}, SRN</h1>
        <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>Daily briefing — {format(new Date(), "EEEE, MMMM d yyyy")}</p>
      </header>

      {/* Top 3 priorities */}
      <div className="liquid-glass rounded-2xl p-5 mb-4 animate-fade-in-up">
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--accent)" }}>Today&apos;s priorities</h2>
        {priorities.map((p, i) => (
          <div key={i} className="flex items-center gap-3 mb-2">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>{i + 1}</span>
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>{p}</span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(overdue.length > 0 || blocked.length > 0 || decisionsToReview.length > 0) && (
        <div className="liquid-glass rounded-2xl p-5 mb-4 animate-fade-in-up" style={{ animationDelay: "40ms", borderColor: "rgba(248,113,113,0.2)" }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: "#f87171" }}>Needs attention</h2>
          {overdue.map((t) => (
            <div key={t.id} className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#f87171" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Overdue: {t.title}</span>
            </div>
          ))}
          {blocked.map((t) => (
            <div key={t.id} className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#f87171" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Blocked: {t.title}</span>
            </div>
          ))}
          {decisionsToReview.map((d) => (
            <div key={d.id} className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#fbbf24" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Decision review due: {d.decision}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        {[
          { label: "Due today", value: dueToday.length, color: dueToday.length > 0 ? "#fbbf24" : "var(--text-muted)" },
          { label: "Habits", value: `${todayHabits.length}/${habits.length}`, color: todayHabits.length === habits.length && habits.length > 0 ? "#6ee7b7" : "var(--text-secondary)" },
          { label: "Focus today", value: `${todayFocus}m`, color: todayFocus > 0 ? "#60a5fa" : "var(--text-muted)" },
          { label: "Streak", value: `${streak}d`, color: streak > 0 ? "#fbbf24" : "var(--text-muted)" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4 text-center">
            <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Yesterday recap */}
      <div className="glass rounded-2xl p-5 mb-4 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Yesterday</h2>
        <div className="flex gap-4 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
          <span>Habits: {yesterdayHabits.length}/{habits.length}</span>
          <span>Focus: {yesterdayFocus}m</span>
          <span>Tasks done: {todos.filter((t) => t.completed_at && format(new Date(t.completed_at), "yyyy-MM-dd") === yesterday).length}</span>
        </div>
      </div>

      {/* In progress */}
      {inProgress.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-4 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Currently working on ({inProgress.length})</h2>
          {inProgress.map((t) => (
            <div key={t.id} className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#60a5fa" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{t.title}</span>
              <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--text-muted)" }}>{t.priority}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-center mt-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Auto-generated from live data · {format(new Date(), "h:mm a")}</p>
      </div>
    </div>
  );
}
