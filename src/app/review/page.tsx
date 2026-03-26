"use client";

import { useState, useEffect, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { fetchActivityLog, fetchFocusSessions, fetchHabits, fetchHabitLogs, fetchWeeklyReviews, saveWeeklyReview, type WeeklyReview } from "@/lib/supabase";
import { format, startOfWeek, subWeeks } from "date-fns";

export default function ReviewPage() {
  const { todos } = useRealtimeTodos();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [reflection, setReflection] = useState("");
  const [goals, setGoals] = useState("");
  const [saving, setSaving] = useState(false);

  const thisWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  useEffect(() => {
    fetchWeeklyReviews().then(setReviews).catch(() => {});
  }, []);

  const currentReview = reviews.find((r) => r.week_start === thisWeekStart);

  useEffect(() => {
    if (currentReview) {
      setReflection(currentReview.reflection || "");
      setGoals(currentReview.goals_next_week || "");
    }
  }, [currentReview]);

  // Auto-calculate stats
  const weekStats = useMemo(() => {
    const completed = todos.filter((t) => t.completed_at && new Date(t.completed_at) >= startOfWeek(new Date(), { weekStartsOn: 1 })).length;
    return { completed };
  }, [todos]);

  const handleSave = async () => {
    setSaving(true);
    await saveWeeklyReview({
      week_start: thisWeekStart,
      tasks_completed: weekStats.completed,
      reflection: reflection.trim(),
      goals_next_week: goals.trim(),
    });
    setReviews(await fetchWeeklyReviews());
    setSaving(false);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Weekly review saved", type: "success" } }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Weekly review</h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMMM d, yyyy")}
        </p>
      </header>

      {/* This week's auto stats */}
      <div className="glass rounded-2xl p-5 mb-4 animate-fade-in-up">
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>This week so far</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
            <div className="text-xl font-bold font-mono" style={{ color: "#6ee7b7" }}>{weekStats.completed}</div>
            <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Tasks done</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
            <div className="text-xl font-bold font-mono" style={{ color: "#60a5fa" }}>{todos.filter((t) => t.status === "in_progress").length}</div>
            <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>In progress</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
            <div className="text-xl font-bold font-mono" style={{ color: "#f87171" }}>{todos.filter((t) => t.status === "blocked").length}</div>
            <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Blocked</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
            <div className="text-xl font-bold font-mono" style={{ color: "#fbbf24" }}>{todos.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length}</div>
            <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Overdue</div>
          </div>
        </div>
      </div>

      {/* Reflection */}
      <div className="glass rounded-2xl p-5 mb-4 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Reflection</h2>
        <p className="text-xs font-mono mb-3" style={{ color: "var(--text-muted)" }}>What went well? What did you learn? What could improve?</p>
        <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={4} placeholder="Write your thoughts about this week..."
          className="w-full rounded-xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
      </div>

      {/* Goals for next week */}
      <div className="glass rounded-2xl p-5 mb-4 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Goals for next week</h2>
        <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} placeholder="What do you want to accomplish next week?"
          className="w-full rounded-xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full py-3 text-sm font-medium rounded-2xl transition-all disabled:opacity-50 animate-fade-in-up"
        style={{ background: "var(--accent)", color: "#0a0a0b", animationDelay: "180ms" }}>
        {saving ? "Saving..." : "Save weekly review"}
      </button>

      {/* Past reviews */}
      {reviews.filter((r) => r.week_start !== thisWeekStart).length > 0 && (
        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Past reviews</h2>
          <div className="space-y-3">
            {reviews.filter((r) => r.week_start !== thisWeekStart).map((r) => (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Week of {format(new Date(r.week_start), "MMM d")}</span>
                  <span className="text-xs font-mono" style={{ color: "#6ee7b7" }}>{r.tasks_completed} tasks</span>
                </div>
                {r.reflection && <p className="text-xs font-mono mb-1" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>{r.reflection}</p>}
                {r.goals_next_week && <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Goals: {r.goals_next_week}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
