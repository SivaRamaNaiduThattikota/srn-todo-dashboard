"use client";


import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { fetchHabits, fetchHabitLogs, toggleHabitDay, fetchFocusSessions, updateTodo, fetchLearningStats, fetchWeeklyTaskCounts, fetchDailyTaskCounts, fetchMonthlyTaskCounts, fetchPeriodTotals, type DailyHabit, type HabitLog, type FocusSession, type TodoStatus } from "@/lib/supabase";
import { useState, useEffect, useMemo } from "react";
import { isToday, isPast, format } from "date-fns";
import Link from "next/link";
import ActionCards from "@/components/ActionCards";
import ProductivityGoalCard from "@/components/ProductivityGoalCard";

export default function TodayPage() {
  const { todos } = useRealtimeTodos();
  const [habits, setHabits]       = useState<DailyHabit[]>([]);
  const [logs, setLogs]           = useState<HabitLog[]>([]);
  const [sessions, setSessions]   = useState<FocusSession[]>([]);
  const [learnStats, setLearnStats] = useState<{ totalTopics: number; doneTopics: number; totalWeeks: number; doneWeeks: number } | null>(null);
  const [weeklyBars,   setWeeklyBars]   = useState<{ label: string; count: number; color: string }[]>([]);
  const [dailyBars,    setDailyBars]    = useState<{ label: string; count: number; color: string }[]>([]);
  const [monthlyBars,  setMonthlyBars]  = useState<{ label: string; count: number; color: string }[]>([]);
  const [periodTotals, setPeriodTotals] = useState<{ daily: number; weekly: number; monthly: number }>({ daily: 0, weekly: 0, monthly: 0 });
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchHabits().then(setHabits).catch(() => {});
    fetchHabitLogs(7).then(setLogs).catch(() => {});
    fetchFocusSessions(30).then(setSessions).catch(() => {});
    fetchLearningStats().then(setLearnStats).catch(() => {});
    fetchWeeklyTaskCounts().then(setWeeklyBars).catch(() => {});
    fetchDailyTaskCounts().then(setDailyBars).catch(() => {});
    fetchMonthlyTaskCounts().then(setMonthlyBars).catch(() => {});
    fetchPeriodTotals().then(setPeriodTotals).catch(() => {});
  }, []);

  const todayLogs        = useMemo(() => logs.filter((l) => l.completed_date === today), [logs, today]);
  const habitsCompleted  = todayLogs.length;
  const habitsTotal      = habits.length;

  const todayTasks   = useMemo(() => todos.filter((t) => t.due_date && isToday(new Date(t.due_date)) && t.status !== "done" && !t.deleted_at), [todos]);
  const overdueTasks = useMemo(() => todos.filter((t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== "done" && !t.deleted_at), [todos]);
  const inProgress   = useMemo(() => todos.filter((t) => t.status === "in_progress" && !t.deleted_at), [todos]);
  const todayDone    = useMemo(() => todos.filter((t) => t.completed_at && isToday(new Date(t.completed_at)) && !t.deleted_at), [todos]);

  const todayFocusMinutes = useMemo(() =>
    sessions
      .filter((s) => s.completed && isToday(new Date(s.started_at)))
      .reduce((sum, s) => sum + s.duration_minutes, 0),
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
  const handleCycleStatus = async (id: string, current: TodoStatus) => {
    await updateTodo(id, { status: STATUS_CYCLE[current] });
  };

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Daily score 0-100 — resets every day
  // Habits 40% + Focus 35% (max at 60min) + Tasks done 25% (max at 3)
  const dailyScore = useMemo(() => {
    const habitPct = habitsTotal > 0 ? habitsCompleted / habitsTotal : 0;
    const focusPct = Math.min(todayFocusMinutes / 60, 1);
    const taskPct  = Math.min(todayDone.length / 3, 1);
    return Math.round(habitPct * 40 + focusPct * 35 + taskPct * 25);
  }, [habitsCompleted, habitsTotal, todayFocusMinutes, todayDone]);

  const scoreColor = dailyScore >= 90 ? "var(--accent)" : dailyScore >= 70 ? "#5ecf95" : dailyScore >= 40 ? "#f5a623" : "#f87171";
  const scoreLabel = dailyScore >= 90 ? "Excellent" : dailyScore >= 70 ? "Good day" : dailyScore >= 40 ? "Decent" : "Keep going";

  const learnPct = learnStats && learnStats.totalTopics > 0 ? Math.round((learnStats.doneTopics / learnStats.totalTopics) * 100) : null;

  const QUICK_ACTIONS = [
    { href: "/focus",     label: "Start focus",   icon: "⏱", color: "#4da6ff" },
    { href: "/notes",     label: "Add a note",    icon: "📝", color: "#f5a623" },
    { href: "/learning",  label: "Learning",      icon: "🎓", color: "#a09aee" },
    { href: "/interview", label: "Interview prep", icon: "🎯", color: "#f87171" },
    { href: "/analytics", label: "Analytics",     icon: "📊", color: "#b48eff" },
    { href: "/streaks",   label: "Streaks",       icon: "⚡", color: "#5ecf95" },
  ];

  const TaskRow = ({ t, overdue = false }: { t: (typeof todos)[0]; overdue?: boolean }) => (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[14px]"
      style={{
        background: overdue ? "rgba(255,107,107,0.08)" : "var(--glass-fill)",
        border: `0.5px solid ${overdue ? "rgba(255,107,107,0.20)" : "var(--glass-border)"}`,
      }}>
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={() => handleCycleStatus(t.id, t.status)}
          className="text-sm leading-none transition-all flex-shrink-0"
          style={{ color: STATUS_COLOR[t.status], width: "18px", textAlign: "center" }}
          title={`Status: ${t.status}`}>
          {STATUS_ICON[t.status]}
        </button>
        <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{t.title}</span>
        {overdue && <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "#ff6b6b" }}>overdue</span>}
      </div>
      <span className="text-[10px] font-mono flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>
        {t.priority}
      </span>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">

      {/* ── Header with Daily Score ── */}
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight gltxt"
              style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}>
              {greeting}, SRN
            </h1>
            <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              {format(new Date(), "EEEE, MMMM d yyyy")}
            </p>
          </div>

          {/* Daily Score Widget — links to Analytics */}
          <Link href="/analytics" style={{ textDecoration: "none" }}
            className="flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-[18px] hover-lift prism ca-strong"
            style={{ background: "var(--glass-fill)", backdropFilter: "blur(20px)",
              border: `0.5px solid ${scoreColor}40`,
              boxShadow: `0 4px 16px ${scoreColor}18, inset 0 1px 0 rgba(255,255,255,0.15)` }}>
            <div className="prism-border" style={{ borderRadius: "18px" }} />
            <span className="text-[28px] font-bold font-mono leading-none tracking-tight"
              style={{ color: scoreColor, textShadow: dailyScore >= 90 ? `0 0 20px ${scoreColor}60` : "none" }}>
              {dailyScore}
            </span>
            <span className="text-[9px] font-mono uppercase tracking-wider mt-0.5"
              style={{ color: scoreColor, opacity: 0.8 }}>
              {scoreLabel}
            </span>
            <div className="w-12 h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${dailyScore}%`, background: scoreColor }} />
            </div>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Daily habits */}
          <div className="liquid-glass rounded-[22px] p-5 animate-fade-in-up ca">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                Daily habits
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono"
                style={{ color: habitsCompleted === habitsTotal && habitsTotal > 0 ? "#5ecf95" : "var(--text-muted)" }}>
                {habitsCompleted}/{habitsTotal}
                </span>
                   {currentStreak > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[8px]"
                    style={{ background: "rgba(245,166,35,0.12)", color: "#f5a623", border: "0.5px solid rgba(245,166,35,0.22)" }}>
                    {currentStreak}d streak
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {habits.length === 0 ? (
                <p className="text-xs font-mono col-span-4" style={{ color: "var(--text-muted)" }}>
                  No habits set up. <Link href="/streaks" style={{ color: "var(--accent)" }}>Add habits →</Link>
                </p>
              ) : habits.map((h) => {
                const done = todayLogs.some((l) => l.habit_id === h.id);
                return (
                  <button key={h.id} onClick={(e) => {
                    handleToggleHabit(h.id);
                    const el = e.currentTarget;
                    el.classList.remove('haptic');
                    void (el as HTMLElement).offsetWidth;
                    el.classList.add('haptic');
                    setTimeout(() => el.classList.remove('haptic'), 460);
                  }} className="cc-habit p-3 sm:p-4 text-left"
                    style={{
                      background: done ? `linear-gradient(160deg, ${h.color}35 0%, ${h.color}20 100%)` : "var(--cc-glass-base)",
                      borderColor: done ? `${h.color}45` : "rgba(255,255,255,0.14)",
                      boxShadow: done
                        ? `inset 0 0.5px 0 ${h.color}55, 0 4px 16px ${h.color}25, 0 1px 3px rgba(0,0,0,0.2)`
                        : "var(--cc-inner-shadow), var(--cc-outer-shadow)",
                    }}>
                    <div className="w-7 h-7 rounded-[10px] flex items-center justify-center text-sm mb-2"
                      style={{
                        background: done ? h.color : "rgba(255,255,255,0.10)",
                        boxShadow: done
                          ? `0 2px 8px ${h.color}50, inset 0 0.5px 0 rgba(255,255,255,0.35)`
                          : "inset 0 0.5px 0 rgba(255,255,255,0.15)",
                      }}>
                      {done ? "✓" : h.icon}
                    </div>
                    <span className="text-xs font-medium block leading-tight"
                      style={{ color: done ? h.color : "var(--text-secondary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.01em" }}>
                      {h.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <Link href="/streaks" className="block mt-3 text-[10px] font-mono text-center"
              style={{ color: "var(--text-muted)" }}>
              View full streak history →
            </Link>
          </div>

          {/* Tasks due today + overdue */}
          <div className="liquid-glass rounded-[22px] p-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                Due today
                {todayTasks.length > 0 && (
                  <span className="text-xs font-mono ml-1.5" style={{ color: "#f5a623" }}>({todayTasks.length})</span>
                )}
              </h2>
              {overdueTasks.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[8px]"
                  style={{ background: "rgba(255,107,107,0.12)", color: "#ff6b6b", border: "0.5px solid rgba(255,107,107,0.25)" }}>
                  {overdueTasks.length} overdue
                </span>
              )}
            </div>
            {todayTasks.length === 0 && overdueTasks.length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                No tasks due today.
                <Link href="/" className="ml-1" style={{ color: "var(--accent)" }}>Add one →</Link>
              </p>
            ) : (
              <div className="space-y-2">
                {overdueTasks.map((t) => <TaskRow key={t.id} t={t} overdue />)}
                {todayTasks.map((t) => <TaskRow key={t.id} t={t} />)}
              </div>
            )}
          </div>

          {/* In progress */}
          {inProgress.length > 0 && (
            <div className="liquid-glass rounded-[22px] p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                In progress ({inProgress.length})
              </h2>
              <div className="space-y-2">
                {inProgress.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-[14px]"
                    style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "#4da6ff", boxShadow: "0 0 6px rgba(77,166,255,0.4)" }} />
                      <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {t.title}
                      </span>
                    </div>
                    {t.assigned_agent && (
                      <span className="text-[10px] font-mono flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>
                        @{t.assigned_agent}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-4">

          {/* Today's stats — compact pill row */}
          <div className="liquid-glass rounded-[22px] p-5 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
            <div className="shim" style={{ borderRadius: "22px" }} />
            <h2 className="text-sm font-medium mb-4 gltxt" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Today&apos;s stats</h2>
            <div className="space-y-3">
              {[
                { label: "Tasks completed", value: todayDone.length, color: "#5ecf95" },
                { label: "Focus time",      value: todayFocusMinutes >= 60 ? `${Math.floor(todayFocusMinutes/60)}h${todayFocusMinutes%60>0?` ${todayFocusMinutes%60}m`:""}` : `${todayFocusMinutes}m`, color: "#4da6ff" },
                { label: "Habits done",     value: `${habitsCompleted}/${habitsTotal}`,
                  color: habitsCompleted === habitsTotal && habitsTotal > 0 ? "#5ecf95" : "#f5a623" },
                { label: "Streak",          value: `${currentStreak}d`,
                  color: currentStreak >= 7 ? "#f5a623" : currentStreak > 0 ? "var(--accent)" : "var(--text-muted)" },
                { label: "Due today",       value: todayTasks.length + overdueTasks.length,
                  color: overdueTasks.length > 0 ? "#ff6b6b" : todayTasks.length > 0 ? "#f5a623" : "#5ecf95" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                  <span className="text-[13px] font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action cards — quick navigation */}
          <ActionCards />

          {/* ML Roadmap inline progress */}
          {learnStats && (
            <div className="animate-fade-in-up" style={{ animationDelay: "110ms", background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)", borderRadius: "16px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>ML Roadmap</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{learnStats.doneTopics}/{learnStats.totalTopics} topics</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: "6px", background: "var(--bg-input)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${learnPct ?? 0}%`, borderRadius: "99px", background: `linear-gradient(90deg, var(--accent), var(--accent-light))`, transition: "width 0.8s ease" }} />
                </div>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>{learnPct ?? 0}%</div>
            </div>
          )}

          {/* Productivity goal card */}
          <ProductivityGoalCard
            weeklyDone={todayDone.length}
            weeklyTotal={todos.filter((t) => !t.deleted_at).length}
            focusMinutes={todayFocusMinutes}
            dailyBars={dailyBars}
            weeklyBars={weeklyBars}
            monthlyBars={monthlyBars}
            periodTotals={periodTotals}
          />

        </div>
      </div>
    </div>
  );
}
