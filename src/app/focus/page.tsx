"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { startFocusSession, completeFocusSession, fetchFocusSessions, type FocusSession } from "@/lib/supabase";
import { playDoneSound } from "@/lib/sounds";
import { format, isToday, subDays, eachDayOfInterval, isYesterday } from "date-fns";

export default function FocusPage() {
  const { todos } = useRealtimeTodos();
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [selectedTodo, setSelectedTodo] = useState("");
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { fetchFocusSessions(30).then(setSessions).catch(() => {}); }, []);

  const activeTodos = useMemo(() => todos.filter((t) => t.status !== "done"), [todos]);

  const dailyStats = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const daySessions = sessions.filter((s) => s.completed && format(new Date(s.started_at), "yyyy-MM-dd") === dayStr);
      const totalMinutes = daySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
      return { date: dayStr, day: format(day, "EEE"), dayShort: format(day, "d"), minutes: totalMinutes, sessions: daySessions.length };
    });
  }, [sessions]);

  const todayMinutes = dailyStats.find((d) => d.date === format(new Date(), "yyyy-MM-dd"))?.minutes || 0;
  const yesterdayMinutes = dailyStats.find((d) => d.date === format(subDays(new Date(), 1), "yyyy-MM-dd"))?.minutes || 0;
  const todaySessions = dailyStats.find((d) => d.date === format(new Date(), "yyyy-MM-dd"))?.sessions || 0;
  const weekMinutes = dailyStats.slice(-7).reduce((s, d) => s + d.minutes, 0);
  const maxDayMinutes = Math.max(...dailyStats.map((d) => d.minutes), 1);
  const activeDays = dailyStats.slice(-7).filter((d) => d.minutes > 0).length;
  const avgMinutes = activeDays > 0 ? Math.round(weekMinutes / activeDays) : 0;

  const hourDistribution = useMemo(() => {
    const hours: Record<number, number> = {};
    sessions.filter((s) => s.completed).forEach((s) => {
      const hour = new Date(s.started_at).getHours();
      hours[hour] = (hours[hour] || 0) + s.duration_minutes;
    });
    const best = Object.entries(hours).sort(([, a], [, b]) => b - a)[0];
    return best ? `${Number(best[0]) % 12 || 12}${Number(best[0]) >= 12 ? "PM" : "AM"}` : "—";
  }, [sessions]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleComplete();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  const handleStart = async () => {
    const session = await startFocusSession(selectedTodo || null, duration);
    setCurrentSession(session);
    setTimeLeft(duration * 60);
    setIsRunning(true);
  };

  const handleComplete = async () => {
    setIsRunning(false);
    if (currentSession) {
      await completeFocusSession(currentSession.id);
      playDoneSound();
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Focus complete! ${duration}min`, type: "success" } }));
      setSessions(await fetchFocusSessions(30));
    }
    setCurrentSession(null);
  };

  const handleStop = () => { setIsRunning(false); setTimeLeft(duration * 60); setCurrentSession(null); };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / (duration * 60);

  const DURATIONS = [15, 25, 45, 60];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-6 animate-fade-in-up">
        <h1
          className="text-xl sm:text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}
        >
          Focus timer
        </h1>
        <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          Today: {todayMinutes}min ({todaySessions} sessions) · This week: {weekMinutes}min
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Timer panel ── */}
        <div className="lg:col-span-2">
          <div className="liquid-glass rounded-[24px] p-6 sm:p-8 text-center mb-4 animate-fade-in-up">

            {/* SVG ring */}
            <div className="relative inline-block mb-6">
              <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                <circle cx="90" cy="90" r="80" fill="none" strokeWidth="3"
                  style={{ stroke: "var(--glass-border)" }} />
                <circle cx="90" cy="90" r="80" fill="none" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={2 * Math.PI * 80 * (1 - progress)}
                  style={{
                    stroke: isRunning ? "var(--accent)" : "var(--glass-border-hover)",
                    transition: "stroke-dashoffset 1s linear",
                    filter: isRunning ? "drop-shadow(0 0 6px var(--accent-glow))" : "none",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-4xl font-mono font-bold"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "-apple-system, 'SF Mono', monospace",
                    letterSpacing: "-0.03em",
                    textShadow: isRunning ? "0 0 20px var(--accent-glow)" : "none",
                  }}
                >
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </span>
                <span
                  className="text-[10px] font-mono mt-1.5 uppercase tracking-widest"
                  style={{ color: isRunning ? "var(--accent)" : "var(--text-muted)" }}
                >
                  {isRunning ? "focusing" : "ready"}
                </span>
              </div>
            </div>

            {!isRunning ? (
              <div className="space-y-4">
                {/* Duration chips — CC style */}
                <div className="flex gap-2 justify-center">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setDuration(d); setTimeLeft(d * 60); }}
                      className={`cc-chip px-4 py-2 text-xs relative z-10`}
                      style={{
                        color: duration === d ? "var(--accent)" : "var(--text-secondary)",
                        minWidth: "52px",
                      }}
                      data-active={duration === d}
                    >
                      <span style={{ position: "relative", zIndex: 3 }}>{d}m</span>
                    </button>
                  ))}
                </div>

                {/* Task selector */}
                <select
                  value={selectedTodo}
                  onChange={(e) => setSelectedTodo(e.target.value)}
                  className="rounded-[14px] px-4 py-2.5 text-xs font-mono focus:outline-none w-full max-w-xs mx-auto block"
                  style={{
                    background: "var(--bg-input)",
                    border: "0.5px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">Free focus (no task)</option>
                  {activeTodos.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>

                {/* Start — CC glossy accent button */}
                <button
                  onClick={handleStart}
                  className="cc-btn cc-btn-accent px-10 py-3 text-sm"
                  style={{ minWidth: "140px" }}
                >
                  <span style={{ position: "relative", zIndex: 3 }}>▶ Start</span>
                </button>
              </div>
            ) : (
              /* Stop — CC glossy danger button */
              <div className="space-y-3">
                <button
                  onClick={handleComplete}
                  className="cc-btn cc-btn-accent px-8 py-3 text-sm"
                  style={{ minWidth: "130px" }}
                >
                  <span style={{ position: "relative", zIndex: 3 }}>✓ Complete</span>
                </button>
                <div>
                  <button
                    onClick={handleStop}
                    className="cc-btn cc-btn-danger px-8 py-2.5 text-xs"
                    style={{ minWidth: "110px" }}
                  >
                    <span style={{ position: "relative", zIndex: 3 }}>✕ Stop</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 14-day chart */}
          <div className="liquid-glass rounded-[22px] p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Last 14 days</h2>
            <div className="flex items-end gap-1" style={{ height: "80px" }}>
              {dailyStats.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    title={`${d.date}: ${d.minutes}min (${d.sessions} sessions)`}
                    style={{
                      height: `${Math.max(2, (d.minutes / maxDayMinutes) * 64)}px`,
                      background: d.minutes > 0
                        ? `linear-gradient(180deg, hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 10%), 0.9), var(--accent))`
                        : "var(--glass-fill)",
                      border: "0.5px solid var(--glass-border)",
                      opacity: d.date === format(new Date(), "yyyy-MM-dd") ? 1 : 0.65,
                      boxShadow: d.minutes > 0 ? "0 0 8px var(--accent-glow)" : "none",
                    }}
                  />
                  <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{d.day.charAt(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: stats + recent ── */}
        <div className="space-y-4">
          {/* Insights */}
          <div className="liquid-glass rounded-[22px] p-4 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Insights</h2>
            <div className="space-y-2.5">
              {[
                { label: "Today",         value: `${todayMinutes}m`,                         color: "#5ecf95" },
                { label: "Yesterday",     value: `${yesterdayMinutes}m`,                     color: "var(--text-secondary)" },
                { label: "This week",     value: `${weekMinutes}m`,                          color: "#4da6ff" },
                { label: "Daily average", value: `${avgMinutes}m`,                           color: "#f5a623" },
                { label: "Best time",     value: hourDistribution,                           color: "#b48eff" },
                { label: "Total sessions",value: `${sessions.filter((s) => s.completed).length}`, color: "var(--text-secondary)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  <span className="text-[13px] font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent sessions */}
          <div className="liquid-glass rounded-[22px] p-4 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Recent</h2>
            {sessions.filter((s) => s.completed).length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>No sessions yet</p>
            ) : (
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {sessions.filter((s) => s.completed).slice(0, 20).map((s) => {
                  const task = todos.find((t) => t.id === s.todo_id);
                  const sessionDate = new Date(s.started_at);
                  const dateLabel = isToday(sessionDate) ? "Today" : isYesterday(sessionDate) ? "Yesterday" : format(sessionDate, "MMM d");
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-[11px]"
                      style={{
                        background: "var(--glass-fill)",
                        border: "0.5px solid var(--glass-border-subtle)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#5ecf95" }} />
                        <span className="text-[10px] font-mono truncate" style={{ color: "var(--text-secondary)" }}>
                          {task ? task.title : "Free focus"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono font-medium" style={{ color: "var(--accent)" }}>{s.duration_minutes}m</span>
                        <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{dateLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
