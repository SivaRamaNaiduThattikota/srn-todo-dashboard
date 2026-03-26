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

  // Daily stats for last 14 days
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
  const yesterdayMinutes = dailyStats.find((d) => {
    const yesterday = subDays(new Date(), 1);
    return d.date === format(yesterday, "yyyy-MM-dd");
  })?.minutes || 0;
  const todaySessions = dailyStats.find((d) => d.date === format(new Date(), "yyyy-MM-dd"))?.sessions || 0;
  const weekMinutes = dailyStats.slice(-7).reduce((s, d) => s + d.minutes, 0);
  const maxDayMinutes = Math.max(...dailyStats.map((d) => d.minutes), 1);

  // Average focus per day (last 7 days, only counting days with sessions)
  const activeDays = dailyStats.slice(-7).filter((d) => d.minutes > 0).length;
  const avgMinutes = activeDays > 0 ? Math.round(weekMinutes / activeDays) : 0;

  // Most productive time slot
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-6 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Focus timer</h1>
        <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          Today: {todayMinutes}min ({todaySessions} sessions) · This week: {weekMinutes}min
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timer — left/center */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-6 sm:p-8 text-center mb-4 animate-fade-in-up">
            <div className="relative inline-block mb-5">
              <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                <circle cx="90" cy="90" r="80" fill="none" strokeWidth="4" style={{ stroke: "var(--border-default)" }} />
                <circle cx="90" cy="90" r="80" fill="none" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 80} strokeDashoffset={2 * Math.PI * 80 * (1 - progress)}
                  style={{ stroke: isRunning ? "var(--accent)" : "var(--text-muted)", transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-mono font-bold" style={{ color: "var(--text-primary)" }}>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
                <span className="text-[10px] font-mono mt-1" style={{ color: "var(--text-muted)" }}>{isRunning ? "focusing..." : "ready"}</span>
              </div>
            </div>

            {!isRunning ? (
              <div className="space-y-3">
                <div className="flex gap-2 justify-center">
                  {[15, 25, 45, 60].map((d) => (
                    <button key={d} onClick={() => { setDuration(d); setTimeLeft(d * 60); }}
                      className="px-3 py-1.5 text-xs font-mono rounded-xl transition-all"
                      style={{ background: duration === d ? "var(--accent-muted)" : "var(--bg-input)", color: duration === d ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${duration === d ? "hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.2)" : "var(--border-default)"}` }}>
                      {d}m
                    </button>
                  ))}
                </div>
                <select value={selectedTodo} onChange={(e) => setSelectedTodo(e.target.value)}
                  className="rounded-xl px-4 py-2 text-xs font-mono focus:outline-none w-full max-w-xs mx-auto block"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
                  <option value="">Free focus (no task)</option>
                  {activeTodos.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <button onClick={handleStart} className="px-8 py-2.5 text-sm font-medium rounded-2xl" style={{ background: "var(--accent)", color: "#0a0a0b" }}>Start</button>
              </div>
            ) : (
              <button onClick={handleStop} className="px-8 py-2.5 text-sm font-medium rounded-2xl"
                style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>Stop</button>
            )}
          </div>

          {/* 14-day chart */}
          <div className="glass rounded-2xl p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Last 14 days</h2>
            <div className="flex items-end gap-1" style={{ height: "100px" }}>
              {dailyStats.map((d, i) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t transition-all duration-300" title={`${d.date}: ${d.minutes}min (${d.sessions} sessions)`}
                    style={{ height: `${Math.max(2, (d.minutes / maxDayMinutes) * 80)}px`, background: d.minutes > 0 ? "var(--accent)" : "var(--bg-input)", opacity: d.date === format(new Date(), "yyyy-MM-dd") ? 1 : 0.7 }} />
                  <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{d.day.charAt(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — stats + recent */}
        <div className="space-y-4">
          {/* Stats cards */}
          <div className="glass rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Insights</h2>
            <div className="space-y-3">
              {[
                { label: "Today", value: `${todayMinutes}m`, color: "#6ee7b7" },
                { label: "Yesterday", value: `${yesterdayMinutes}m`, color: "var(--text-secondary)" },
                { label: "This week", value: `${weekMinutes}m`, color: "#60a5fa" },
                { label: "Daily average", value: `${avgMinutes}m`, color: "#fbbf24" },
                { label: "Best time", value: hourDistribution, color: "#a78bfa" },
                { label: "Total sessions", value: `${sessions.filter((s) => s.completed).length}`, color: "var(--text-secondary)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  <span className="text-sm font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent sessions */}
          <div className="glass rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Recent</h2>
            {sessions.filter((s) => s.completed).length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>No sessions yet</p>
            ) : (
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {sessions.filter((s) => s.completed).slice(0, 20).map((s) => {
                  const task = todos.find((t) => t.id === s.todo_id);
                  const sessionDate = new Date(s.started_at);
                  const dateLabel = isToday(sessionDate) ? "Today" : isYesterday(sessionDate) ? "Yesterday" : format(sessionDate, "MMM d");
                  return (
                    <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: "var(--bg-input)" }}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#6ee7b7" }} />
                        <span className="text-[10px] font-mono truncate" style={{ color: "var(--text-secondary)" }}>{task ? task.title : "Free focus"}</span>
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
