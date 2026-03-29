"use client";

import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { fetchHabits, fetchHabitLogs, toggleHabitDay, fetchFocusSessions, updateTodo, fetchLearningStats, type DailyHabit, type HabitLog, type FocusSession, type TodoStatus } from "@/lib/supabase";
import { useState, useEffect, useMemo } from "react";
import { isToday, isPast, format } from "date-fns";
import Link from "next/link";

export default function TodayPage() {
  const { todos } = useRealtimeTodos();
  const [habits, setHabits]   = useState<DailyHabit[]>([]);
  const [logs, setLogs]       = useState<HabitLog[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [learnStats, setLearnStats] = useState<{ totalTopics: number; doneTopics: number; totalWeeks: number; doneWeeks: number } | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchHabits().then(setHabits).catch(() => {});
    fetchHabitLogs(7).then(setLogs).catch(() => {});
    fetchFocusSessions(1).then(setSessions).catch(() => {});
    fetchLearningStats().then(setLearnStats).catch(() => {});
  }, []);

  const todayLogs        = useMemo(() => logs.filter((l) => l.completed_date === today), [logs, today]);
  const habitsCompleted  = todayLogs.length;
  const habitsTotal      = habits.length;

  const todayTasks  = useMemo(() => todos.filter((t) => t.due_date && isToday(new Date(t.due_date)) && t.status !== "done"), [todos]);
  const overdueTasks = useMemo(() => todos.filter((t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== "done"), [todos]);
  const inProgress  = useMemo(() => todos.filter((t) => t.status === "in_progress"), [todos]);
  const todayDone   = useMemo(() => todos.filter((t) => t.completed_at && isToday(new Date(t.completed_at))), [todos]);
  const todayFocusMinutes = useMemo(() =>
    sessions.filter((s) => s.completed && isToday(new Date(s.started_at))).reduce((sum, s) => sum + s.duration_minutes, 0),
  [sessions]);

  const currentStreak = useMemo(() => {
    if (habits.length === 0) return 0;
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = format(d, "yyyy-MM-dd");
      const allDone = habits.every((h) => logs.some((l) => l.habit_id === h.id && l.completed_date === dateStr));
      if (allDone) { streak++; d.setDate(d.getDate() - 1); }
      else if (i === 0) { d.setDate(d.getDate() - 1); continue; }
      else break;
    }
    return streak;
  }, [habits, logs]);

  const handleToggleHabit = async (habitId: string) => {
    await toggleHabitDay(habitId, today);
    const updated = await fetchHabitLogs(7);
    setLogs(updated);
  };

  const STATUS_CYCLE: Record<TodoStatus, TodoStatus> = { pending: "in_progress", in_progress: "done", done: "pending", blocked: "pending" };
  const STATUS_ICON:  Record<TodoStatus, string>     = { pending: "○", in_progress: "◑", done: "●", blocked: "✕" };
  const STATUS_COLOR: Record<TodoStatus, string>     = { pending: "#f5a623", in_progress: "#4da6ff", done: "#5ecf95", blocked: "#ff6b6b" };
  const handleCycleStatus = async (id: string, current: TodoStatus) => { await updateTodo(id, { status: STATUS_CYCLE[current] }); };

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const learnPct = learnStats && learnStats.totalTopics > 0 ? Math.round((learnStats.doneTopics / learnStats.totalTopics) * 100) : null;
  const weeksPct = learnStats && learnStats.totalWeeks > 0  ? Math.round((learnStats.doneWeeks  / learnStats.totalWeeks)  * 100) : null;

  const QUICK_ACTIONS = [
    { href: "/focus",    label: "Start focus", icon: "⏱", color: "#4da6ff" },
    { href: "/notes",    label: "Add a note",  icon: "📝", color: "#f5a623" },
    { href: "/learning", label: "Learning",    icon: "🎓", color: "#a09aee" },
    { href: "/analytics",label: "Analytics",  icon: "📊", color: "#b48eff" },
  ];

  const TaskRow = ({ t, overdue = false }: { t: (typeof todos)[0]; overdue?: boolean }) => (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[14px]"
      style={{ background: overdue ? "rgba(255,107,107,0.08)" : "var(--glass-fill)", border: `0.5px solid ${overdue ? "rgba(255,107,107,0.20)" : "var(--glass-border)"}` }}>
      <div className="flex items-center gap-2">
        <button onClick={() => handleCycleStatus(t.id, t.status)} className="text-sm leading-none transition-all"
          style={{ color: STATUS_COLOR[t.status], width: "18px", textAlign: "center" }} title={`Status: ${t.status}`}>
          {STATUS_ICON[t.status]}
        </button>
        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</span>
        {overdue && <span className="text-[10px] font-mono" style={{ color: "#ff6b6b" }}>overdue</span>}
      </div>
      <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{t.priority}</span>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}>
          {greeting}, SRN
        </h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          {format(new Date(), "EEEE, MMMM d yyyy")}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          {/* Daily habits */}
          <div className="liquid-glass rounded-[22px] p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Daily habits</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: habitsCompleted === habitsTotal && habitsTotal > 0 ? "#5ecf95" : "var(--text-muted)" }}>{habitsCompleted}/{habitsTotal}</span>
                {currentStreak > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[8px]" style={{ background: "rgba(245,166,35,0.12)", color: "#f5a623", border: "0.5px solid rgba(245,166,35,0.22)" }}>{currentStreak}d streak</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {habits.map((h) => {
                const done = todayLogs.some((l) => l.habit_id === h.id);
                return (
                  <button key={h.id} onClick={() => handleToggleHabit(h.id)} className="cc-habit p-3 sm:p-4 text-left"
                    style={{ background: done ? `linear-gradient(160deg, ${h.color}35 0%, ${h.color}20 100%)` : "var(--cc-glass-base)", borderColor: done ? `${h.color}45` : "rgba(255,255,255,0.14)", boxShadow: done ? `inset 0 0.5px 0 ${h.color}55, 0 4px 16px ${h.color}25, 0 1px 3px rgba(0,0,0,0.2)` : "var(--cc-inner-shadow), var(--cc-outer-shadow)" }}>
                    <div className="w-7 h-7 rounded-[10px] flex items-center justify-center text-sm mb-2"
                      style={{ background: done ? h.color : "rgba(255,255,255,0.10)", boxShadow: done ? `0 2px 8px ${h.color}50, inset 0 0.5px 0 rgba(255,255,255,0.35)` : "inset 0 0.5px 0 rgba(255,255,255,0.15)" }}>
                      {done ? "✓" : h.icon}
                    </div>
                    <span className="text-xs font-medium block leading-tight" style={{ color: done ? h.color : "var(--text-secondary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.01em" }}>{h.name}</span>
                  </button>
                );
              })}
            </div>
            <Link href="/streaks" className="block mt-3 text-[10px] font-mono text-center" style={{ color: "var(--text-muted)" }}>View full streak history →</Link>
          </div>

          {/* Tasks due today */}
          <div className="liquid-glass rounded-[22px] p-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              Due today{todayTasks.length > 0 && <span className="text-xs font-mono ml-1" style={{ color: "#f5a623" }}>({todayTasks.length})</span>}
            </h2>
            {todayTasks.length === 0 && overdueTasks.length === 0
              ? <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>No tasks due today.</p>
              : <div className="space-y-2">{overdueTasks.map((t) => <TaskRow key={t.id} t={t} overdue />)}{todayTasks.map((t) => <TaskRow key={t.id} t={t} />)}</div>}
          </div>

          {/* In progress */}
          {inProgress.length > 0 && (
            <div className="liquid-glass rounded-[22px] p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>In progress ({inProgress.length})</h2>
              <div className="space-y-2">
                {inProgress.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-[14px]" style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "#4da6ff", boxShadow: "0 0 6px rgba(77,166,255,0.4)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>@{t.assigned_agent}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Today's stats */}
          <div className="liquid-glass rounded-[22px] p-5 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Today&apos;s stats</h2>
            <div className="space-y-3">
              {[
                { label: "Tasks completed", value: todayDone.length,              color: "#5ecf95" },
                { label: "Focus time",      value: `${todayFocusMinutes}m`,       color: "#4da6ff" },
                { label: "Habits done",     value: `${habitsCompleted}/${habitsTotal}`, color: habitsCompleted === habitsTotal && habitsTotal > 0 ? "#5ecf95" : "#f5a623" },
                { label: "Current streak",  value: `${currentStreak}d`,           color: currentStreak > 0 ? "#f5a623" : "var(--text-muted)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                  <span className="text-[13px] font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Learning progress card */}
          {learnStats && (
            <Link href="/learning" className="block liquid-glass rounded-[22px] p-5 animate-fade-in-up no-underline hover-lift" style={{ animationDelay: "70ms" }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>ML Roadmap</h2>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>→ open</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>Topics</span>
                    <span className="text-[10px] font-mono font-medium" style={{ color: "var(--accent)" }}>{learnStats.doneTopics}/{learnStats.totalTopics}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${learnPct ?? 0}%`, background: `linear-gradient(90deg, var(--accent), hsl(var(--accent-h),var(--accent-s),calc(var(--accent-l)+14%)))` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>Weeks done</span>
                    <span className="text-[10px] font-mono font-medium" style={{ color: "#5ecf95" }}>{learnStats.doneWeeks}/{learnStats.totalWeeks}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${weeksPct ?? 0}%`, background: "#5ecf95" }} />
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Quick actions */}
          <div className="liquid-glass rounded-[22px] p-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Quick actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((item) => (
                <Link key={item.href} href={item.href} className="cc-tile flex flex-col items-start p-3 rounded-[18px] no-underline" style={{ minHeight: "72px" }}>
                  <span className="text-xl mb-2" style={{ position: "relative", zIndex: 3, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}>{item.icon}</span>
                  <span className="text-[11px] font-medium leading-tight" style={{ color: "var(--text-primary)", position: "relative", zIndex: 3, fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.01em" }}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
