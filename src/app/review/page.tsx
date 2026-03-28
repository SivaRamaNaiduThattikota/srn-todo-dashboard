"use client";

import { useState, useEffect, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import {
  fetchActivityLog, fetchFocusSessions, fetchHabits, fetchHabitLogs,
  fetchWeeklyReviews, saveWeeklyReview, type WeeklyReview,
} from "@/lib/supabase";
import { format, startOfWeek, isWithinInterval } from "date-fns";

export default function ReviewPage() {
  const { todos } = useRealtimeTodos();
  const [reviews, setReviews]       = useState<WeeklyReview[]>([]);
  const [reflection, setReflection] = useState("");
  const [goals, setGoals]           = useState("");
  const [saving, setSaving]         = useState(false);

  /* For auto-computing focus + streak */
  const [focusSessions, setFocusSessions] = useState<Awaited<ReturnType<typeof fetchFocusSessions>>>([]);
  const [habits, setHabits]               = useState<Awaited<ReturnType<typeof fetchHabits>>>([]);
  const [habitLogs, setHabitLogs]         = useState<Awaited<ReturnType<typeof fetchHabitLogs>>>([]);

  const thisWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekStart     = startOfWeek(new Date(), { weekStartsOn: 1 });

  useEffect(() => {
    fetchWeeklyReviews().then(setReviews).catch(() => {});
    fetchFocusSessions(30).then(setFocusSessions).catch(() => {});
    fetchHabits().then(setHabits).catch(() => {});
    fetchHabitLogs(14).then(setHabitLogs).catch(() => {});
  }, []);

  const currentReview = reviews.find((r) => r.week_start === thisWeekStart);

  useEffect(() => {
    if (currentReview) {
      setReflection(currentReview.reflection || "");
      setGoals(currentReview.goals_next_week || "");
    }
  }, [currentReview]);

  /* ── Auto-computed stats ── */
  const weekStats = useMemo(() => {
    const now = new Date();

    // Tasks completed this week
    const completed = todos.filter(
      (t) => t.completed_at && new Date(t.completed_at) >= weekStart
    ).length;

    // Focus minutes this week
    const focusMins = focusSessions
      .filter((s) => s.completed && new Date(s.started_at) >= weekStart)
      .reduce((sum, s) => sum + s.duration_minutes, 0);

    // Current streak (full days where ALL habits done)
    let streak = 0;
    if (habits.length > 0) {
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const ds = format(d, "yyyy-MM-dd");
        const allDone = habits.every((h) =>
          habitLogs.some((l) => l.habit_id === h.id && l.completed_date === ds)
        );
        if (allDone) { streak++; d.setDate(d.getDate() - 1); }
        else if (i === 0) { d.setDate(d.getDate() - 1); }
        else break;
      }
    }

    return { completed, focusMins, streak };
  }, [todos, focusSessions, habits, habitLogs, weekStart]);

  const handleSave = async () => {
    setSaving(true);
    await saveWeeklyReview({
      week_start:      thisWeekStart,
      tasks_completed: weekStats.completed,
      focus_minutes:   weekStats.focusMins,
      streak_days:     weekStats.streak,
      reflection:      reflection.trim(),
      goals_next_week: goals.trim(),
    });
    setReviews(await fetchWeeklyReviews());
    setSaving(false);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Weekly review saved", type: "success" } }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto pb-32 md:pb-10">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Weekly review</h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          Week of {format(weekStart, "MMMM d, yyyy")}
        </p>
      </header>

      {/* This week's auto stats */}
      <div className="glass rounded-2xl p-5 mb-4 animate-fade-in-up">
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>This week so far</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Tasks done",   value: weekStats.completed,                                                              color: "#6ee7b7" },
            { label: "Focus time",   value: `${weekStats.focusMins}m`,                                                       color: "#60a5fa" },
            { label: "In progress",  value: todos.filter((t) => t.status === "in_progress").length,                          color: "#4da6ff" },
            { label: "Streak",       value: `${weekStats.streak}d`,                                                         color: weekStats.streak > 0 ? "#fbbf24" : "var(--text-muted)" },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
              <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[
            { label: "Blocked",  value: todos.filter((t) => t.status === "blocked").length,                          color: "#f87171" },
            { label: "Overdue",  value: todos.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length, color: "#fbbf24" },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
              <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reflection */}
      <div className="glass rounded-2xl p-5 mb-4 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Reflection</h2>
        <p className="text-xs font-mono mb-3" style={{ color: "var(--text-muted)" }}>
          What went well? What did you learn? What could improve?
        </p>
        <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={4}
          placeholder="Write your thoughts about this week…"
          className="w-full rounded-xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
          style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
      </div>

      {/* Goals */}
      <div className="glass rounded-2xl p-5 mb-4 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Goals for next week</h2>
        <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3}
          placeholder="What do you want to accomplish next week?"
          className="w-full rounded-xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
          style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 text-sm font-medium rounded-2xl transition-all disabled:opacity-50 animate-fade-in-up"
        style={{ background: "var(--accent)", color: "#0a0a0b", animationDelay: "180ms" }}>
        {saving ? "Saving…" : "Save weekly review"}
      </button>

      {/* Past reviews */}
      {reviews.filter((r) => r.week_start !== thisWeekStart).length > 0 && (
        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Past reviews</h2>
          <div className="space-y-3">
            {reviews.filter((r) => r.week_start !== thisWeekStart).map((r) => (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    Week of {format(new Date(r.week_start), "MMM d")}
                  </span>
                  <div className="flex gap-3 text-xs font-mono">
                    <span style={{ color: "#6ee7b7" }}>{r.tasks_completed} tasks</span>
                    {r.focus_minutes > 0 && <span style={{ color: "#60a5fa" }}>{r.focus_minutes}m focus</span>}
                    {r.streak_days > 0 && <span style={{ color: "#fbbf24" }}>{r.streak_days}d streak</span>}
                  </div>
                </div>
                {r.reflection && (
                  <p className="text-xs font-mono mb-1" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>{r.reflection}</p>
                )}
                {r.goals_next_week && (
                  <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Goals: {r.goals_next_week}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
