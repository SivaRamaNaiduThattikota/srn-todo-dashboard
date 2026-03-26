"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { startFocusSession, completeFocusSession, fetchFocusSessions, type FocusSession } from "@/lib/supabase";
import { playDoneSound } from "@/lib/sounds";
import { format, isToday } from "date-fns";

export default function FocusPage() {
  const { todos } = useRealtimeTodos();
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<string>("");
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { fetchFocusSessions(7).then(setSessions).catch(() => {}); }, []);

  const activeTodos = useMemo(() => todos.filter((t) => t.status !== "done"), [todos]);

  const todayMinutes = useMemo(() =>
    sessions.filter((s) => s.completed && isToday(new Date(s.started_at))).reduce((sum, s) => sum + s.duration_minutes, 0),
  [sessions]);

  const todaySessions = useMemo(() =>
    sessions.filter((s) => s.completed && isToday(new Date(s.started_at))).length,
  [sessions]);

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
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Focus session complete! ${duration}min`, type: "success" } }));
      setSessions(await fetchFocusSessions(7));
    }
    setCurrentSession(null);
  };

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(duration * 60);
    setCurrentSession(null);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / (duration * 60);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Focus timer</h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          {todayMinutes > 0 ? `${todayMinutes}min focused today (${todaySessions} sessions)` : "Start a focus session to track your deep work"}
        </p>
      </header>

      {/* Timer */}
      <div className="glass rounded-2xl p-8 sm:p-12 text-center mb-6 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        {/* Circular progress */}
        <div className="relative inline-block mb-6">
          <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
            <circle cx="100" cy="100" r="88" fill="none" strokeWidth="4" style={{ stroke: "var(--border-default)" }} />
            <circle cx="100" cy="100" r="88" fill="none" strokeWidth="4"
              strokeDasharray={2 * Math.PI * 88}
              strokeDashoffset={2 * Math.PI * 88 * (1 - progress)}
              strokeLinecap="round"
              style={{ stroke: isRunning ? "var(--accent)" : "var(--text-muted)", transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl font-mono font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
            <span className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              {isRunning ? "focusing..." : "ready"}
            </span>
          </div>
        </div>

        {/* Controls */}
        {!isRunning ? (
          <div className="space-y-4">
            {/* Duration selector */}
            <div className="flex gap-2 justify-center">
              {[15, 25, 45, 60].map((d) => (
                <button key={d} onClick={() => { setDuration(d); setTimeLeft(d * 60); }}
                  className="px-4 py-2 text-xs font-mono rounded-xl transition-all"
                  style={{
                    background: duration === d ? "var(--accent-muted)" : "var(--bg-input)",
                    color: duration === d ? "var(--accent)" : "var(--text-muted)",
                    border: `1px solid ${duration === d ? "hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.2)" : "var(--border-default)"}`,
                  }}>
                  {d}min
                </button>
              ))}
            </div>

            {/* Task selector */}
            <select value={selectedTodo} onChange={(e) => setSelectedTodo(e.target.value)}
              className="rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none w-full max-w-xs mx-auto block"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
              <option value="">No task (free focus)</option>
              {activeTodos.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>

            <button onClick={handleStart} className="px-8 py-3 text-sm font-medium rounded-2xl transition-all"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}>
              Start focus
            </button>
          </div>
        ) : (
          <button onClick={handleStop} className="px-8 py-3 text-sm font-medium rounded-2xl transition-all"
            style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
            Stop
          </button>
        )}
      </div>

      {/* Recent sessions */}
      <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Recent sessions</h2>
        {sessions.filter((s) => s.completed).length === 0 ? (
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>No completed sessions yet. Start your first focus session above.</p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {sessions.filter((s) => s.completed).slice(0, 15).map((s) => {
              const task = todos.find((t) => t.id === s.todo_id);
              return (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: "#6ee7b7" }} />
                    <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                      {task ? task.title : "Free focus"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>{s.duration_minutes}min</span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{format(new Date(s.started_at), "MMM d")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
