"use client";

import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { fetchHabits, fetchHabitLogs, toggleHabitDay, fetchFocusSessions, type DailyHabit, type HabitLog, type FocusSession } from "@/lib/supabase";
import { useState, useEffect, useMemo } from "react";
import { isToday, isPast, format } from "date-fns";
import Link from "next/link";

export default function TodayPage() {
  const { todos } = useRealtimeTodos();
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchHabits().then(setHabits).catch(() => {});
    fetchHabitLogs(7).then(setLogs).catch(() => {});
    fetchFocusSessions(1).then(setSessions).catch(() => {});
  }, []);

  const todayLogs = useMemo(() => logs.filter((l) => l.completed_date === today), [logs, today]);
  const habitsCompleted = todayLogs.length;
  const habitsTotal = habits.length;

  const todayTasks = useMemo(() => todos.filter((t) => t.due_date && isToday(new Date(t.due_date)) && t.status !== "done"), [todos]);
  const overdueTasks = useMemo(() => todos.filter((t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== "done"), [todos]);
  const inProgress = useMemo(() => todos.filter((t) => t.status === "in_progress"), [todos]);
  const todayDone = useMemo(() => todos.filter((t) => t.completed_at && isToday(new Date(t.completed_at))), [todos]);

  const todayFocusMinutes = useMemo(() => sessions.filter((s) => s.completed && isToday(new Date(s.started_at))).reduce((sum, s) => sum + s.duration_minutes, 0), [sessions]);

  // Streak calculation
  const currentStreak = useMemo(() => {
    if (habits.length === 0) return 0;
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = format(d, "yyyy-MM-dd");
      const allDone = habits.every((h) => logs.some((l) => l.habit_id === h.id && l.completed_date === dateStr));
      if (allDone) { streak++; d.setDate(d.getDate() - 1); } else if (i === 0) { d.setDate(d.getDate() - 1); continue; } else break;
    }
    return streak;
  }, [habits, logs]);

  const handleToggleHabit = async (habitId: string) => {
    await toggleHabitDay(habitId, today);
    const updated = await fetchHabitLogs(7);
    setLogs(updated);
  };

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>{greeting}, SRN</h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>{format(new Date(), "EEEE, MMMM d yyyy")}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — habits + focus */}
        <div className="lg:col-span-2 space-y-4">
          {/* Daily Habits */}
          <div className="glass rounded-2xl p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Daily habits</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: habitsCompleted === habitsTotal && habitsTotal > 0 ? "#6ee7b7" : "var(--text-muted)" }}>
                  {habitsCompleted}/{habitsTotal}
                </span>
                {currentStreak > 0 && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-lg" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
                    {currentStreak} day streak
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {habits.map((h) => {
                const done = todayLogs.some((l) => l.habit_id === h.id);
                return (
                  <button key={h.id} onClick={() => handleToggleHabit(h.id)}
                    className="p-3 sm:p-4 rounded-xl transition-all duration-200 text-left"
                    style={{
                      background: done ? `${h.color}15` : "var(--bg-input)",
                      border: `1px solid ${done ? `${h.color}40` : "var(--border-default)"}`,
                    }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: done ? h.color : "var(--bg-card)", color: done ? "#fff" : "var(--text-muted)" }}>
                        {done ? "✓" : h.icon}
                      </div>
                      <span className="text-xs font-medium" style={{ color: done ? h.color : "var(--text-secondary)" }}>{h.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <Link href="/streaks" className="block mt-3 text-[10px] font-mono text-center" style={{ color: "var(--text-muted)" }}>
              View full streak history →
            </Link>
          </div>

          {/* Tasks due today */}
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
              Due today {todayTasks.length > 0 && <span className="text-xs font-mono ml-1" style={{ color: "#fbbf24" }}>({todayTasks.length})</span>}
            </h2>
            {todayTasks.length === 0 && overdueTasks.length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>No tasks due today. Check the task list for upcoming work.</p>
            ) : (
              <div className="space-y-2">
                {overdueTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "#f87171" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</span>
                      <span className="text-[10px] font-mono" style={{ color: "#f87171" }}>overdue</span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{t.priority}</span>
                  </div>
                ))}
                {todayTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "#fbbf24" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{t.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In progress */}
          {inProgress.length > 0 && (
            <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>In progress ({inProgress.length})</h2>
              <div className="space-y-2">
                {inProgress.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "#60a5fa" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>@{t.assigned_agent}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — stats */}
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Today&apos;s stats</h2>
            <div className="space-y-3">
              {[
                { label: "Tasks completed today", value: todayDone.length, color: "#6ee7b7" },
                { label: "Focus time", value: `${todayFocusMinutes}m`, color: "#60a5fa" },
                { label: "Habits done", value: `${habitsCompleted}/${habitsTotal}`, color: habitsCompleted === habitsTotal && habitsTotal > 0 ? "#6ee7b7" : "#fbbf24" },
                { label: "Current streak", value: `${currentStreak}d`, color: currentStreak > 0 ? "#fbbf24" : "var(--text-muted)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                  <span className="text-sm font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Quick actions</h2>
            <div className="space-y-2">
              {[
                { href: "/focus", label: "Start focus session", icon: "⏱" },
                { href: "/notes", label: "Add a note", icon: "📝" },
                { href: "/streaks", label: "View streaks", icon: "🔥" },
                { href: "/analytics", label: "See analytics", icon: "📊" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex items-center gap-2 p-2.5 rounded-xl transition-all duration-200"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-input)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <span className="text-sm">{l.icon}</span>
                  <span className="text-xs font-medium">{l.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
