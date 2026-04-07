"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchHabits, fetchHabitLogsByRange, toggleHabitDay, addHabit, deleteHabit, type DailyHabit, type HabitLog } from "@/lib/supabase";
import { format, subDays, eachDayOfInterval, addDays } from "date-fns";

const WINDOW = 84; // 12 weeks
const STEP   = 7;  // slide 1 week at a time

export default function StreaksPage() {
  const [habits, setHabits]   = useState<DailyHabit[]>([]);
  const [logs, setLogs]       = useState<HabitLog[]>([]);
  const [newHabit, setNewHabit] = useState("");
  const [newColor, setNewColor] = useState("#6ee7b7");
  const [loading, setLoading]  = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  // windowOffset: how many days back the END of the window is from today
  // 0 = window ends today, 7 = window ends 7 days ago, etc.
  const [windowOffset, setWindowOffset] = useState(0);
  const [slideDir, setSlideDir]         = useState<"left" | "right" | null>(null);
  const slideKey = useRef(0);

  const [pendingDelete, setPendingDelete] = useState<DailyHabit | null>(null);
  const [undoTimer, setUndoTimer]         = useState<ReturnType<typeof setTimeout> | null>(null);
  const [undoSeconds, setUndoSeconds]     = useState(5);
  const [undoInterval, setUndoInterval]   = useState<ReturnType<typeof setInterval> | null>(null);

  // Window start/end dates based on offset
  const windowEnd   = useMemo(() => subDays(new Date(), windowOffset), [windowOffset]);
  const windowStart = useMemo(() => subDays(windowEnd, WINDOW - 1), [windowEnd]);
  const windowEndStr   = format(windowEnd, "yyyy-MM-dd");
  const windowStartStr = format(windowStart, "yyyy-MM-dd");

  const fetchLogs = useCallback(async (startStr: string, endStr: string) => {
    setLoading(true);
    try {
      const data = await fetchHabitLogsByRange(startStr, endStr);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchHabits().then(setHabits).catch(() => {});
  }, []);

  // Refetch logs whenever window changes
  useEffect(() => {
    fetchLogs(windowStartStr, windowEndStr);
  }, [windowStartStr, windowEndStr, fetchLogs]);

  const reload = useCallback(async () => {
    setHabits(await fetchHabits());
    await fetchLogs(windowStartStr, windowEndStr);
  }, [windowStartStr, windowEndStr, fetchLogs]);

  const slideTo = (direction: "prev" | "next") => {
    if (direction === "next" && windowOffset === 0) return; // can't go into future
    slideKey.current += 1;
    setSlideDir(direction === "prev" ? "left" : "right");
    setWindowOffset((o) => direction === "prev" ? o + STEP : Math.max(0, o - STEP));
  };

  const goToToday = () => {
    if (windowOffset === 0) return;
    slideKey.current += 1;
    setSlideDir("right");
    setWindowOffset(0);
  };

  const handleAdd = async () => {
    if (!newHabit.trim()) return;
    await addHabit(newHabit.trim(), newColor);
    setNewHabit("");
    await reload();
  };

  const handleDelete = (habit: DailyHabit) => {
    if (undoTimer) clearTimeout(undoTimer);
    if (undoInterval) clearInterval(undoInterval);
    if (pendingDelete) deleteHabit(pendingDelete.id).then(reload);
    setPendingDelete(habit);
    setUndoSeconds(5);
    const iv = setInterval(() => setUndoSeconds((s) => s - 1), 1000);
    setUndoInterval(iv);
    const t = setTimeout(async () => { clearInterval(iv); await deleteHabit(habit.id); setPendingDelete(null); await reload(); }, 5000);
    setUndoTimer(t);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Habit deleted — undo in 5s", type: "warning" } }));
  };

  const handleUndo = () => {
    if (undoTimer) clearTimeout(undoTimer);
    if (undoInterval) clearInterval(undoInterval);
    setPendingDelete(null); setUndoTimer(null); setUndoInterval(null);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Delete undone", type: "success" } }));
  };

  const handleToggle = async (habitId: string, date: string) => {
    await toggleHabitDay(habitId, date);
    await fetchLogs(windowStartStr, windowEndStr);
  };

  // Heatmap days for current window
  const heatmapDays = useMemo(() =>
    eachDayOfInterval({ start: windowStart, end: windowEnd }),
  [windowStart, windowEnd]);

  // Streak calculation always looks back 365 days from today regardless of window
  const streaks = useMemo(() => {
    const result: Record<string, number> = {};
    habits.forEach((h) => {
      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const ds = format(d, "yyyy-MM-dd");
        if (logs.some((l) => l.habit_id === h.id && l.completed_date === ds)) { streak++; d.setDate(d.getDate() - 1); }
        else if (i === 0) { d.setDate(d.getDate() - 1); } else break;
      }
      result[h.id] = streak;
    });
    return result;
  }, [habits, logs]);

  const overallStreak = useMemo(() => {
    if (habits.length === 0) return 0;
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = format(d, "yyyy-MM-dd");
      const allDone = habits.every((h) => logs.some((l) => l.habit_id === h.id && l.completed_date === ds));
      if (allDone) { streak++; d.setDate(d.getDate() - 1); }
      else if (i === 0) { d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }, [habits, logs]);

  const COLORS = ["#6ee7b7", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4"];
  const visibleHabits = useMemo(() => habits.filter((h) => h.id !== pendingDelete?.id), [habits, pendingDelete]);

  const isAtToday = windowOffset === 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">
      <style>{`
        @keyframes slideInLeft  { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX( 32px); } to { opacity: 1; transform: translateX(0); } }
        .slide-left  { animation: slideInLeft  0.28s cubic-bezier(0.2,0.8,0.2,1) both; }
        .slide-right { animation: slideInRight 0.28s cubic-bezier(0.2,0.8,0.2,1) both; }
      `}</style>

      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Daily streaks</h1>
            <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              {overallStreak > 0 ? `${overallStreak} day streak — all habits` : "Complete all habits daily to build your streak"}
            </p>
          </div>
          {overallStreak > 0 && (
            <div className="text-3xl sm:text-4xl font-bold font-mono" style={{ color: "#fbbf24" }}>
              {overallStreak}<span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>days</span>
            </div>
          )}
        </div>
      </header>

      {/* Undo banner */}
      {pendingDelete && (
        <div className="liquid-glass rounded-2xl px-4 py-3 mb-4 flex items-center justify-between animate-fade-in-up" style={{ borderColor: "rgba(255,107,107,0.3)" }}>
          <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
            Deleting "<span style={{ color: "#ff6b6b" }}>{pendingDelete.name}</span>" in{" "}
            <span style={{ color: "#ff6b6b" }}>{undoSeconds}s</span>…
          </span>
          <button onClick={handleUndo} className="px-3 py-1 text-[10px] font-mono rounded-xl"
            style={{ background: "rgba(94,207,149,0.12)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.3)" }}>
            Undo
          </button>
        </div>
      )}

      {/* Habit cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        {visibleHabits.map((h) => {
          const done = logs.some((l) => l.habit_id === h.id && l.completed_date === today);
          return (
            <div key={h.id} className="glass rounded-2xl p-4 hover-lift" style={{ borderColor: done ? `${h.color}40` : undefined }}>
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => handleToggle(h.id, today)} className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all"
                  style={{ background: done ? h.color : "var(--bg-input)", color: done ? "#fff" : "var(--text-muted)" }}>
                  {done ? "✓" : h.icon}
                </button>
                <button onClick={() => handleDelete(h)} className="text-xs px-1" style={{ color: "var(--text-muted)", opacity: 0.4 }}>×</button>
              </div>
              <span className="text-xs font-medium block" style={{ color: done ? h.color : "var(--text-secondary)" }}>{h.name}</span>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{streaks[h.id] || 0}d streak</span>
            </div>
          );
        })}
      </div>

      {/* Add habit */}
      <div className="glass rounded-2xl p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
          <input type="text" value={newHabit} onChange={(e) => setNewHabit(e.target.value)}
            placeholder="Add new habit..."
            className="flex-1 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none min-w-0"
            style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <div className="flex gap-1.5 flex-shrink-0">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setNewColor(c)} className="w-5 h-5 rounded-full transition-all flex-shrink-0"
                style={{ background: c, transform: newColor === c ? "scale(1.3)" : "scale(1)", boxShadow: newColor === c ? `0 0 8px ${c}60` : "none" }} />
            ))}
          </div>
          <button onClick={handleAdd} className="px-3 py-2.5 text-xs font-medium rounded-xl flex-shrink-0"
            style={{ background: "var(--accent)", color: "#0a0a0b" }}>
            Add
          </button>
        </div>
      </div>

      {/* Heatmaps */}
      {visibleHabits.map((h) => (
        <div key={h.id} className="glass rounded-2xl p-4 sm:p-5 mb-4 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: h.color }}>{h.name}</span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{streaks[h.id] || 0} day streak</span>
          </div>

          {/* Navigation row */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => slideTo("prev")}
              className="cc-btn px-2.5 py-1.5 text-[11px] font-mono flex-shrink-0"
              style={{ color: "var(--text-secondary)" }}
            >
              <span style={{ position: "relative", zIndex: 3 }}>‹ prev</span>
            </button>

            <span className="flex-1 text-center text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
              {format(windowStart, "MMM d")} – {format(windowEnd, "MMM d, yyyy")}
              {windowOffset > 0 && (
                <span style={{ color: "var(--text-tertiary)", marginLeft: "6px" }}>
                  ({windowOffset}d ago)
                </span>
              )}
            </span>

            <button
              onClick={() => slideTo("next")}
              disabled={isAtToday}
              className="cc-btn px-2.5 py-1.5 text-[11px] font-mono flex-shrink-0"
              style={{ color: isAtToday ? "var(--text-tertiary)" : "var(--text-secondary)", opacity: isAtToday ? 0.4 : 1 }}
            >
              <span style={{ position: "relative", zIndex: 3 }}>next ›</span>
            </button>

            {!isAtToday && (
              <button
                onClick={goToToday}
                className="cc-btn px-2.5 py-1.5 text-[11px] font-mono flex-shrink-0"
                style={{ color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}
              >
                <span style={{ position: "relative", zIndex: 3 }}>today</span>
              </button>
            )}
          </div>

          {/* Heatmap grid with slide animation */}
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            <div
              key={slideKey.current}
              className={slideDir === "left" ? "slide-left" : slideDir === "right" ? "slide-right" : ""}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gridTemplateRows:    "repeat(7, 1fr)",
                gridAutoFlow:        "column",
                gap:                 "3px",
                minWidth:            "calc(12 * 13px)",
                width:               "100%",
                opacity: loading ? 0.5 : 1,
                transition: "opacity 0.15s ease",
              }}
            >
              {heatmapDays.map((day) => {
                const dateStr     = format(day, "yyyy-MM-dd");
                const done        = logs.some((l) => l.habit_id === h.id && l.completed_date === dateStr);
                const isTodayDate = dateStr === today;
                const isFuture    = dateStr > today;
                return (
                  <button
                    key={dateStr}
                    onClick={() => !isFuture && handleToggle(h.id, dateStr)}
                    disabled={isFuture}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: "3px",
                      background: isFuture ? "transparent" : done ? h.color : "var(--bg-input)",
                      opacity: isFuture ? 0.15 : done ? 1 : 0.4,
                      outline: isTodayDate ? `1.5px solid ${h.color}` : "none",
                      outlineOffset: "1px",
                      transition: "all 0.15s",
                      minWidth: "10px",
                      minHeight: "10px",
                      cursor: isFuture ? "default" : "pointer",
                    }}
                    title={isFuture ? "future" : `${format(day, "MMM d, yyyy")} — ${done ? "done" : "not done"}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-between mt-2">
            <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{format(windowStart, "MMM d")}</span>
            <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
              {isAtToday ? `today (${format(new Date(), "MMM d")})` : format(windowEnd, "MMM d")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
