"use client";

import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { fetchActivityLogByRange, fetchLearningStats, type ActivityLog } from "@/lib/supabase";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { format, subDays, eachDayOfInterval, isToday, isYesterday } from "date-fns";
import Link from "next/link";

const CHART_WINDOW = 14;
const CHART_STEP   = 7;

export default function AnalyticsPage() {
  const { todos, loading } = useRealtimeTodos();
  const [activities, setActivities]     = useState<ActivityLog[]>([]);
  const [actLoading, setActLoading]     = useState(true);
  const [learnStats, setLearnStats]     = useState<{ totalTopics: number; doneTopics: number; totalWeeks: number; doneWeeks: number } | null>(null);

  // ── Sliding window state ────────────────────────────────────────────────────
  const [chartOffset, setChartOffset]     = useState(0);
  const [slideDir, setSlideDir]           = useState<"left" | "right" | null>(null);
  const slideKey                          = useRef(0);
  const [selectedDay, setSelectedDay]     = useState<string | null>(null);

  const windowEnd   = useMemo(() => subDays(new Date(), chartOffset), [chartOffset]);
  const windowStart = useMemo(() => subDays(windowEnd, CHART_WINDOW - 1), [windowEnd]);
  const windowEndStr   = format(windowEnd,   "yyyy-MM-dd");
  const windowStartStr = format(windowStart, "yyyy-MM-dd");
  const isAtToday = chartOffset === 0;

  const fetchActivities = useCallback(async (from: string, to: string) => {
    setActLoading(true);
    try {
      const data = await fetchActivityLogByRange(from, to);
      setActivities(data);
    } catch { /* silent */ }
    finally { setActLoading(false); }
  }, []);

  useEffect(() => {
    fetchActivities(windowStartStr, windowEndStr);
  }, [windowStartStr, windowEndStr, fetchActivities]);

  useEffect(() => {
    fetchLearningStats().then(setLearnStats).catch(() => {});
  }, []);

  const slideChart = (dir: "prev" | "next") => {
    if (dir === "next" && isAtToday) return;
    slideKey.current += 1;
    setSlideDir(dir === "prev" ? "left" : "right");
    setChartOffset((o) => dir === "prev" ? o + CHART_STEP : Math.max(0, o - CHART_STEP));
    setSelectedDay(null);
  };

  const goToToday = () => {
    if (isAtToday) return;
    slideKey.current += 1;
    setSlideDir("right");
    setChartOffset(0);
    setSelectedDay(null);
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = todos.length;
    const done  = todos.filter((t) => t.status === "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const byPriority = { critical: todos.filter((t) => t.priority === "critical").length, high: todos.filter((t) => t.priority === "high").length, medium: todos.filter((t) => t.priority === "medium").length, low: todos.filter((t) => t.priority === "low").length };
    const byAgent: Record<string, { total: number; done: number }> = {};
    todos.forEach((t) => { if (!byAgent[t.assigned_agent]) byAgent[t.assigned_agent] = { total: 0, done: 0 }; byAgent[t.assigned_agent].total++; if (t.status === "done") byAgent[t.assigned_agent].done++; });
    const byStatus = { pending: todos.filter((t) => t.status === "pending").length, in_progress: todos.filter((t) => t.status === "in_progress").length, done, blocked: todos.filter((t) => t.status === "blocked").length };
    const overdue = todos.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;
    const withChecklist = todos.filter((t) => (t.checklist ?? []).length > 0);
    const checklistTotal = withChecklist.length;
    const avgChecklistPct = checklistTotal > 0
      ? Math.round(withChecklist.reduce((sum, t) => {
          const cl = t.checklist ?? [];
          return sum + (cl.length > 0 ? cl.filter((i: { done: boolean }) => i.done).length / cl.length : 0);
        }, 0) / checklistTotal * 100)
      : null;
    const incompleteChecklists = withChecklist
      .filter((t) => { const cl = t.checklist ?? []; return cl.length > 0 && cl.some((i: { done: boolean }) => !i.done); })
      .map((t) => {
        const cl = t.checklist ?? [];
        const done = cl.filter((i: { done: boolean }) => i.done).length;
        return { title: t.title, done, total: cl.length, pct: Math.round((done / cl.length) * 100) };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 6);
    return { total, done, completionRate, byPriority, byAgent, byStatus, overdue, checklistTotal, avgChecklistPct, incompleteChecklists };
  }, [todos]);

  // ── Chart data for current window ───────────────────────────────────────────
  const chartDays = useMemo(() =>
    eachDayOfInterval({ start: windowStart, end: windowEnd }),
  [windowStart, windowEnd]);

  const chartData = useMemo(() => {
    return chartDays.map((day) => {
      const dayStr    = format(day, "yyyy-MM-dd");
      const created   = activities.filter((a) => a.action === "created"        && format(new Date(a.created_at), "yyyy-MM-dd") === dayStr).length;
      const completed = activities.filter((a) => a.action === "status_changed" && a.new_value === "done" && format(new Date(a.created_at), "yyyy-MM-dd") === dayStr).length;
      return { date: dayStr, day: format(day, "EEE"), created, completed };
    });
  }, [chartDays, activities]);

  const maxChart    = Math.max(...chartData.map((d) => Math.max(d.created, d.completed)), 1);

  // Velocity uses the LAST 7 days of current window vs prior 7
  const thisWeek    = chartData.slice(-7).reduce((s, d) => s + d.completed, 0);
  const lastWeek    = chartData.slice(0, 7).reduce((s, d) => s + d.completed, 0);
  const velocityTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;

  const productivityScore = useMemo(() => {
    let score = 0;
    score += stats.completionRate * 0.4;
    score += stats.overdue === 0 ? 25 : Math.max(0, 25 - stats.overdue * 5);
    score += stats.byStatus.blocked === 0 ? 15 : Math.max(0, 15 - stats.byStatus.blocked * 3);
    const inProgressRatio = stats.total > 0 ? stats.byStatus.in_progress / stats.total : 0;
    score += inProgressRatio > 0.1 && inProgressRatio < 0.5 ? 20 : 10;
    return Math.min(100, Math.round(score));
  }, [stats]);

  const scoreColor = productivityScore >= 80 ? "#6ee7b7" : productivityScore >= 50 ? "#fbbf24" : "#f87171";
  const maxP = Math.max(stats.byPriority.critical, stats.byPriority.high, stats.byPriority.medium, stats.byPriority.low, 1);
  const maxS = Math.max(stats.byStatus.pending, stats.byStatus.in_progress, stats.byStatus.done, stats.byStatus.blocked, 1);
  const learnPct = learnStats && learnStats.totalTopics > 0 ? Math.round((learnStats.doneTopics / learnStats.totalTopics) * 100) : 0;
  const weeksPct = learnStats && learnStats.totalWeeks  > 0 ? Math.round((learnStats.doneWeeks  / learnStats.totalWeeks)  * 100) : 0;

  // ── Selected day detail ──────────────────────────────────────────────────────
  const selectedDayDetail = useMemo(() => {
    if (!selectedDay) return null;
    const dayActivities = activities.filter((a) => format(new Date(a.created_at), "yyyy-MM-dd") === selectedDay);
    const createdItems = dayActivities
      .filter((a) => a.action === "created")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((a) => {
        const task = todos.find((t) => t.id === a.todo_id);
        return { id: a.id, time: format(new Date(a.created_at), "h:mma").toLowerCase(), title: task?.title ?? null };
      });
    const completedItems = dayActivities
      .filter((a) => a.action === "status_changed" && a.new_value === "done")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((a) => {
        const task = todos.find((t) => t.id === a.todo_id);
        return { id: a.id, time: format(new Date(a.created_at), "h:mma").toLowerCase(), title: task?.title ?? null };
      });
    const dayDate = new Date(selectedDay + "T12:00:00");
    const dateLabel = isToday(dayDate) ? "Today" : isYesterday(dayDate) ? "Yesterday" : format(dayDate, "EEE, MMM d");
    return { dateLabel, createdItems, completedItems };
  }, [selectedDay, activities, todos]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <style>{`
        @keyframes slideInLeft  { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX( 24px); } to { opacity: 1; transform: translateX(0); } }
        .chart-slide-left  { animation: slideInLeft  0.26s cubic-bezier(0.2,0.8,0.2,1) both; }
        .chart-slide-right { animation: slideInRight 0.26s cubic-bezier(0.2,0.8,0.2,1) both; }
      `}</style>

      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Analytics</h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>Task distribution, velocity, productivity &amp; learning progress</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="glass-heavy rounded-2xl px-6 py-5 flex items-center gap-3 animate-float-in">
            <div className="relative w-4 h-4"><div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--border-default)" }}/><div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "var(--accent)" }}/></div>
            <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>Loading...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">

          {/* ── LEARNING PROGRESS ── */}
          {learnStats && (
            <Link href="/learning" className="block no-underline animate-fade-in-up">
              <div className="glass rounded-2xl p-4 sm:p-5 hover-lift">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: "rgba(160,154,238,0.18)", fontSize: "14px" }}>🎓</div>
                    <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>ML/DS Roadmap progress</h3>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>open roadmap →</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Topics done",  value: learnStats.doneTopics,  total: learnStats.totalTopics, color: "var(--accent)" },
                    { label: "Topics left",  value: learnStats.totalTopics - learnStats.doneTopics, total: null, color: "var(--text-secondary)" },
                    { label: "Weeks done",   value: learnStats.doneWeeks,   total: learnStats.totalWeeks,  color: "#5ecf95" },
                    { label: "Weeks left",   value: learnStats.totalWeeks  - learnStats.doneWeeks,  total: null, color: "var(--text-secondary)" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[14px] px-3 py-3" style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                      <div className="text-lg sm:text-xl font-semibold font-mono" style={{ color: s.color }}>{s.value}{s.total ? `/${s.total}` : ""}</div>
                      <div className="text-[9px] sm:text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono w-20 sm:w-24 flex-shrink-0" style={{ color: "var(--text-secondary)" }}>Topics {learnPct}%</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${learnPct}%`, background: "linear-gradient(90deg, var(--accent), hsl(var(--accent-h),var(--accent-s),calc(var(--accent-l)+14%)))" }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono w-20 sm:w-24 flex-shrink-0" style={{ color: "var(--text-secondary)" }}>Weeks {weeksPct}%</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${weeksPct}%`, background: "#5ecf95" }} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* ── SCORE + KEY STATS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 animate-fade-in-up">
            <div className="col-span-2 sm:col-span-1 liquid-glass rounded-2xl px-5 py-5 hover-lift text-center">
              <div className="text-4xl font-bold font-mono tracking-tight" style={{ color: scoreColor }}>{productivityScore}</div>
              <div className="text-[10px] uppercase tracking-[0.15em] font-mono mt-1" style={{ color: "var(--text-muted)" }}>Productivity</div>
              <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: "var(--bg-input)" }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${productivityScore}%`, background: scoreColor }} />
              </div>
            </div>
            {[
              { label: "Total",    value: stats.total,            color: "var(--text-primary)" },
              { label: "Done",     value: `${stats.completionRate}%`, color: "#6ee7b7" },
              { label: "Velocity", value: `${thisWeek}/wk`,       color: velocityTrend >= 0 ? "#6ee7b7" : "#f87171" },
              { label: "Overdue",  value: stats.overdue,          color: stats.overdue > 0 ? "#f87171" : "#6ee7b7" },
            ].map((s, i) => (
              <div key={s.label} className="liquid-glass rounded-2xl px-4 py-4 hover-lift" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="text-2xl font-semibold font-mono tracking-tight" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] font-mono mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── 14-DAY ACTIVITY CHART ── */}
          <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "80ms" }}>

            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Task activity</h3>
                <div className="flex items-center gap-3 text-[10px] font-mono flex-wrap" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#60a5fa" }}/> Created</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#6ee7b7" }}/> Completed</span>
                  {velocityTrend !== 0 && (
                    <span style={{ color: velocityTrend > 0 ? "#6ee7b7" : "#f87171" }}>
                      {velocityTrend > 0 ? "↑" : "↓"} {Math.abs(velocityTrend)}% vs prior 7d
                    </span>
                  )}
                </div>
              </div>

              {/* Prev / next controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => slideChart("prev")} className="cc-btn px-2 py-1.5 text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ position: "relative", zIndex: 3 }}>‹ prev</span>
                </button>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                  {format(windowStart, "MMM d")} – {format(windowEnd, "MMM d")}
                  {chartOffset > 0 && <span style={{ color: "var(--text-tertiary)", marginLeft: "4px" }}>({chartOffset}d ago)</span>}
                </span>
                <button onClick={() => slideChart("next")} disabled={isAtToday} className="cc-btn px-2 py-1.5 text-[11px] font-mono"
                  style={{ color: isAtToday ? "var(--text-tertiary)" : "var(--text-secondary)", opacity: isAtToday ? 0.4 : 1 }}>
                  <span style={{ position: "relative", zIndex: 3 }}>next ›</span>
                </button>
                {!isAtToday && (
                  <button onClick={goToToday} className="cc-btn px-2 py-1.5 text-[11px] font-mono" style={{ color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
                    <span style={{ position: "relative", zIndex: 3 }}>today</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bars */}
            <div
              key={slideKey.current}
              className={slideDir === "left" ? "chart-slide-left" : slideDir === "right" ? "chart-slide-right" : ""}
              style={{ opacity: actLoading ? 0.45 : 1, transition: "opacity 0.15s ease" }}
            >
              <div className="flex items-end gap-1 sm:gap-2" style={{ height: "100px" }}>
                {chartData.map((d) => {
                  const isSelected = selectedDay === d.date;
                  const isTodayBar = d.date === format(new Date(), "yyyy-MM-dd");
                  const hasActivity = d.created > 0 || d.completed > 0;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center gap-1"
                      style={{ cursor: hasActivity ? "pointer" : "default" }}
                      onClick={() => {
                        if (!hasActivity) return;
                        setSelectedDay(selectedDay === d.date ? null : d.date);
                      }}
                    >
                      <div className="w-full flex gap-0.5 items-end transition-all duration-300"
                        style={{
                          height: "76px",
                          outline: isSelected ? "1.5px solid var(--accent)" : "none",
                          outlineOffset: "2px",
                          borderRadius: "3px",
                          opacity: isTodayBar ? 1 : 0.7,
                          transform: isSelected ? "scaleY(1.04)" : "scaleY(1)",
                          transformOrigin: "bottom",
                        }}
                      >
                        <div className="flex-1 rounded-t-sm transition-all duration-500"
                          style={{ height: `${Math.max(2, (d.created   / maxChart) * 76)}px`, background: "#60a5fa", opacity: isSelected ? 1 : 0.7 }} />
                        <div className="flex-1 rounded-t-sm transition-all duration-500"
                          style={{ height: `${Math.max(2, (d.completed / maxChart) * 76)}px`, background: "#6ee7b7", opacity: isSelected ? 1 : 0.8 }} />
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-mono"
                        style={{ color: isSelected ? "var(--accent)" : "var(--text-muted)", fontWeight: isSelected ? 700 : 400 }}>
                        {d.day.charAt(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Selected day detail panel ── */}
            {selectedDayDetail && (
              <div className="animate-fade-in" style={{ marginTop: "14px", borderTop: "0.5px solid var(--glass-border-subtle)", paddingTop: "14px" }}>
                {/* Panel header */}
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{selectedDayDetail.dateLabel}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono" style={{ color: "#60a5fa" }}>
                      {selectedDayDetail.createdItems.length} created
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "#6ee7b7" }}>
                      {selectedDayDetail.completedItems.length} completed
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Created column */}
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "#60a5fa", opacity: 0.7 }}>
                      Created
                    </p>
                    {selectedDayDetail.createdItems.length === 0 ? (
                      <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>None</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedDayDetail.createdItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between px-2.5 py-2 rounded-[10px]"
                            style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border-subtle)" }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex-shrink-0 rounded-full" style={{ width: "5px", height: "5px", background: "#60a5fa", opacity: 0.8 }} />
                              <span className="text-[11px] font-mono truncate"
                                style={{ color: item.title ? "var(--text-secondary)" : "var(--text-muted)", fontStyle: item.title ? "normal" : "italic" }}>
                                {item.title ?? "Deleted task"}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>{item.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Completed column */}
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "#6ee7b7", opacity: 0.7 }}>
                      Completed
                    </p>
                    {selectedDayDetail.completedItems.length === 0 ? (
                      <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>None</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedDayDetail.completedItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between px-2.5 py-2 rounded-[10px]"
                            style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border-subtle)" }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex-shrink-0 rounded-full" style={{ width: "5px", height: "5px", background: "#6ee7b7", opacity: 0.8 }} />
                              <span className="text-[11px] font-mono truncate"
                                style={{ color: item.title ? "var(--text-secondary)" : "var(--text-muted)", fontStyle: item.title ? "normal" : "italic" }}>
                                {item.title ?? "Deleted task"}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>{item.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── PRIORITY + STATUS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
              <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Priority distribution</h3>
              <div className="space-y-3">
                {([{ key: "critical" as const, label: "Critical", color: "#f87171" }, { key: "high" as const, label: "High", color: "#fb923c" }, { key: "medium" as const, label: "Medium", color: "#fbbf24" }, { key: "low" as const, label: "Low", color: "#94a3b8" }]).map((p) => (
                  <div key={p.key}>
                    <div className="flex justify-between mb-1"><span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{p.label}</span><span className="text-xs font-mono font-medium" style={{ color: p.color }}>{stats.byPriority[p.key]}</span></div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(stats.byPriority[p.key] / maxP) * 100}%`, background: p.color }}/></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
              <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Status breakdown</h3>
              <div className="space-y-3">
                {([{ key: "pending" as const, label: "Pending", color: "#fbbf24" }, { key: "in_progress" as const, label: "In Progress", color: "#60a5fa" }, { key: "done" as const, label: "Done", color: "#6ee7b7" }, { key: "blocked" as const, label: "Blocked", color: "#f87171" }]).map((s) => (
                  <div key={s.key}>
                    <div className="flex justify-between mb-1"><span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{s.label}</span><span className="text-xs font-mono font-medium" style={{ color: s.color }}>{stats.byStatus[s.key]}</span></div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(stats.byStatus[s.key] / maxS) * 100}%`, background: s.color }}/></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── AGENT WORKLOAD ── */}
          <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Agent workload</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(stats.byAgent).map(([agent, data]) => {
                const rate = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                return (
                  <div key={agent} className="liquid-glass rounded-xl px-4 py-4 hover-lift">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
                        <span className="text-[10px] font-mono font-medium" style={{ color: "var(--accent)" }}>{agent[0].toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-mono truncate" style={{ color: "var(--text-primary)" }}>@{agent}</span>
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

          {/* ── CHECKLIST COMPLETION ── */}
          {stats.checklistTotal > 0 && (
            <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "220ms" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Checklist completion</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    {stats.checklistTotal} task{stats.checklistTotal !== 1 ? "s" : ""} with checklists
                  </span>
                  {stats.avgChecklistPct !== null && (
                    <span className="text-sm font-semibold font-mono"
                      style={{ color: stats.avgChecklistPct >= 75 ? "#6ee7b7" : stats.avgChecklistPct >= 40 ? "#fbbf24" : "#f87171" }}>
                      {stats.avgChecklistPct}% avg
                    </span>
                  )}
                </div>
              </div>
              {stats.avgChecklistPct !== null && (
                <div className="mb-4 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${stats.avgChecklistPct}%`, background: stats.avgChecklistPct >= 75 ? "#6ee7b7" : stats.avgChecklistPct >= 40 ? "#fbbf24" : "#f87171" }} />
                </div>
              )}
              {stats.incompleteChecklists.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Incomplete — tasks with unfinished steps</p>
                  <div className="space-y-2">
                    {stats.incompleteChecklists.map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono truncate flex-1 mr-2" style={{ color: "var(--text-secondary)" }}>{item.title}</span>
                          <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>{item.done}/{item.total} · {item.pct}%</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${item.pct}%`, background: item.pct >= 75 ? "#6ee7b7" : item.pct >= 40 ? "#fbbf24" : "#f87171" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {stats.incompleteChecklists.length === 0 && (
                <p className="text-xs font-mono text-center py-2" style={{ color: "#6ee7b7" }}>✓ All checklists complete!</p>
              )}
            </div>
          )}

          {/* ── RECENT ACTIVITY ── */}
          <div className="glass rounded-2xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Recent activity</h3>
            {actLoading ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading activity...</p>
            ) : activities.length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>No activity in this window.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activities.slice(0, 30).map((a) => {
                  const actionColors: Record<string, string> = { created: "#60a5fa", status_changed: "#fbbf24", completed: "#6ee7b7", deleted: "#f87171" };
                  const actionLabels: Record<string, string> = { created: "Created", status_changed: "Status changed", completed: "Completed", deleted: "Deleted" };
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: actionColors[a.action] || "var(--text-muted)" }}/>
                      <span className="text-xs font-mono flex-1" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: actionColors[a.action] }}>{actionLabels[a.action]}</span>
                        {a.new_value && <> — {a.action === "status_changed" ? `${a.old_value} → ${a.new_value}` : a.new_value}</>}
                      </span>
                      <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>{format(new Date(a.created_at), "MMM d, HH:mm")}</span>
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
