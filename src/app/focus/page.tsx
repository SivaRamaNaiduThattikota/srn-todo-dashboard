"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { supabase, startFocusSession, completeFocusSession, fetchFocusSessions, type FocusSession } from "@/lib/supabase";
import { playDoneSound } from "@/lib/sounds";
import { format, isToday, subDays, eachDayOfInterval, isYesterday } from "date-fns";

const DURATIONS = [15, 25, 45, 60, 90, 120];

// ─────────────────────────────────────────────────────────────────────────────
// FLIP DIGIT — splitflap airport board style
// ─────────────────────────────────────────────────────────────────────────────
function FlipDigit({ value }: { value: string }) {
  const [current, setCurrent] = useState(value);
  const [next, setNext]       = useState(value);
  const [flipping, setFlipping] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    setNext(value);
    setFlipping(true);
    const t = setTimeout(() => {
      setCurrent(value);
      setFlipping(false);
      prevRef.current = value;
    }, 280);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{
      position: "relative",
      width: "clamp(52px, 10vw, 80px)",
      height: "clamp(72px, 14vw, 110px)",
      borderRadius: "10px",
      background: "rgba(255,255,255,0.06)",
      border: "0.5px solid rgba(255,255,255,0.12)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 16px rgba(0,0,0,0.40)",
      overflow: "hidden",
    }}>
      {/* Static bottom half — current value */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: "rgba(255,255,255,0.04)",
        borderTop: "0.5px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflow: "hidden",
      }}>
        <span style={{
          fontSize: "clamp(36px, 7vw, 68px)",
          fontWeight: 300,
          fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
          color: "rgba(255,255,255,0.90)",
          lineHeight: 1,
          marginTop: "-2px",
          letterSpacing: "-0.03em",
        }}>{current}</span>
      </div>

      {/* Static top half — current value */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "50%",
        background: "rgba(255,255,255,0.08)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        overflow: "hidden",
        borderBottom: "0.5px solid rgba(0,0,0,0.4)",
      }}>
        <span style={{
          fontSize: "clamp(36px, 7vw, 68px)",
          fontWeight: 300,
          fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
          color: "rgba(255,255,255,0.90)",
          lineHeight: 1,
          marginBottom: "-2px",
          letterSpacing: "-0.03em",
        }}>{current}</span>
      </div>

      {/* Flip card — animates from top down when digit changes */}
      {flipping && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "50%",
          background: "rgba(255,255,255,0.08)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          overflow: "hidden",
          transformOrigin: "bottom center",
          animation: "flipDown 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          borderBottom: "0.5px solid rgba(0,0,0,0.4)",
          zIndex: 10,
        }}>
          <span style={{
            fontSize: "clamp(36px, 7vw, 68px)",
            fontWeight: 300,
            fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
            color: "rgba(255,255,255,0.90)",
            lineHeight: 1,
            marginBottom: "-2px",
            letterSpacing: "-0.03em",
          }}>{current}</span>
        </div>
      )}
      {flipping && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
          background: "rgba(255,255,255,0.04)",
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          overflow: "hidden",
          transformOrigin: "top center",
          animation: "revealBottom 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          zIndex: 9,
        }}>
          <span style={{
            fontSize: "clamp(36px, 7vw, 68px)",
            fontWeight: 300,
            fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
            color: "rgba(255,255,255,0.90)",
            lineHeight: 1,
            marginTop: "-2px",
            letterSpacing: "-0.03em",
          }}>{next}</span>
        </div>
      )}
    </div>
  );
}

// Flipclock display: MM:SS
function FlipClock({ mins, secs, isRunning }: { mins: number; secs: number; isRunning: boolean }) {
  const m0 = String(Math.floor(mins / 10));
  const m1 = String(mins % 10);
  const s0 = String(Math.floor(secs / 10));
  const s1 = String(secs % 10);

  return (
    <>
      <style>{`
        @keyframes flipDown {
          0%   { transform: perspective(400px) rotateX(0deg); }
          100% { transform: perspective(400px) rotateX(-90deg); opacity: 0.3; }
        }
        @keyframes revealBottom {
          0%   { transform: perspective(400px) rotateX(90deg); opacity: 0.3; }
          100% { transform: perspective(400px) rotateX(0deg); }
        }
        @keyframes bbcScrollOut {
          0%   { transform: translateY(0);    opacity: 1; }
          100% { transform: translateY(-50px); opacity: 0; }
        }
        @keyframes bbcScrollIn {
          0%   { transform: translateY(50px);  opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(4px, 1vw, 10px)" }}>
        <FlipDigit value={m0} />
        <FlipDigit value={m1} />
        {/* Colon */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "0 4px" }}>
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: isRunning ? "var(--accent)" : "rgba(255,255,255,0.3)",
            boxShadow: isRunning ? "0 0 8px var(--accent)" : "none",
            animation: isRunning ? "none" : "none",
          }} />
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: isRunning ? "var(--accent)" : "rgba(255,255,255,0.3)",
            boxShadow: isRunning ? "0 0 8px var(--accent)" : "none",
          }} />
        </div>
        <FlipDigit value={s0} />
        <FlipDigit value={s1} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BBC-STYLE FULLSCREEN OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
function BBCScrollNumber({ value, label }: { value: string; label: string }) {
  const [displayed, setDisplayed] = useState(value);
  const [animKey, setAnimKey]     = useState(0);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    prevRef.current = value;
    setAnimKey((k) => k + 1);
    const t = setTimeout(() => setDisplayed(value), 1);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{
      position: "relative",
      padding: "clamp(8px,2vw,20px) clamp(16px,4vw,48px)",
      display: "flex",
      alignItems: "baseline",
      overflow: "hidden",
    }}>
      {/* Big number */}
      <div key={animKey} style={{
        fontSize: "clamp(5rem, 22vw, 18rem)",
        fontWeight: 200,
        fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
        color: "rgba(255,255,255,0.92)",
        lineHeight: 0.9,
        letterSpacing: "-0.04em",
        animation: animKey > 0 ? "bbcScrollIn 0.35s cubic-bezier(0.2,0.8,0.2,1) both" : "none",
      }}>
        {displayed}
      </div>
      {/* Label top-right */}
      <span style={{
        position: "absolute",
        top: "clamp(10px,2vw,20px)",
        right: "clamp(16px,4vw,48px)",
        fontSize: "clamp(11px,1.8vw,18px)",
        fontWeight: 400,
        letterSpacing: "0.10em",
        color: "rgba(255,255,255,0.28)",
        fontFamily: "-apple-system, sans-serif",
        textTransform: "uppercase",
      }}>{label}</span>
    </div>
  );
}

function FullscreenTimer({
  timeLeft, duration, isRunning, taskName, todayMinutes,
  onClose, onComplete, onStop,
}: {
  timeLeft: number; duration: number; isRunning: boolean;
  taskName: string; todayMinutes: number;
  onClose: () => void; onComplete: () => void; onStop: () => void;
}) {
  const hours    = Math.floor(timeLeft / 3600);
  const mins     = Math.floor((timeLeft % 3600) / 60);
  const secs     = timeLeft % 60;
  const progress = Math.round(((duration * 60 - timeLeft) / (duration * 60)) * 100);
  const now      = new Date();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#080808",
      display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes bbcScrollIn {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        flexShrink: 0,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "clamp(16px,3vw,32px) clamp(20px,4vw,48px) 0",
      }}>
        <div>
          <p style={{ fontSize: "clamp(14px,2vw,20px)", fontWeight: 400, color: "rgba(255,255,255,0.80)", margin: 0, letterSpacing: "-0.02em" }}>
            {taskName}
          </p>
          <p style={{ fontSize: "clamp(11px,1.4vw,14px)", color: "rgba(255,255,255,0.28)", margin: "3px 0 0", fontWeight: 400 }}>
            {format(now, "EEEE, MMMM d")} · Today {todayMinutes}min
          </p>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.07)",
          border: "0.5px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.50)",
          borderRadius: "100px",
          padding: "clamp(6px,1vw,10px) clamp(14px,2vw,22px)",
          fontSize: "clamp(11px,1.3vw,13px)",
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "0.02em",
        }}>✕ Exit</button>
      </div>

      {/* Divider */}
      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.08)", margin: "clamp(10px,2vw,20px) 0 0" }} />

      {/* Clock rows */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
        {/* Hours — only if duration ≥ 60 */}
        {duration >= 60 && (
          <>
            <BBCScrollNumber value={String(hours).padStart(2, "0")} label="H" />
            <div style={{ height: "0.5px", background: "rgba(255,255,255,0.06)", margin: "0 clamp(16px,4vw,48px)" }} />
          </>
        )}

        <BBCScrollNumber value={String(mins).padStart(2, "0")} label="Min" />
        <div style={{ height: "0.5px", background: "rgba(255,255,255,0.06)", margin: "0 clamp(16px,4vw,48px)" }} />
        <BBCScrollNumber value={String(secs).padStart(2, "0")} label="Sec" />
      </div>

      {/* Divider */}
      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.08)" }} />

      {/* Progress bar */}
      <div style={{ flexShrink: 0, padding: "clamp(8px,1.5vw,16px) clamp(20px,4vw,48px)" }}>
        <div style={{ height: "2px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: "2px",
            background: "rgba(255,255,255,0.45)",
            width: `${progress}%`,
            transition: "width 1s linear",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.20)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {isRunning ? "Focusing" : "Ready"}
          </span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.20)" }}>{progress}%</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        flexShrink: 0,
        display: "flex", gap: "10px", justifyContent: "center", alignItems: "center",
        padding: "clamp(10px,2vw,20px) clamp(20px,4vw,48px) clamp(24px,4vw,48px)",
      }}>
        {isRunning ? (
          <>
            <button onClick={onComplete} style={{
              background: "rgba(255,255,255,0.90)", color: "#080808",
              border: "none", borderRadius: "100px",
              padding: "clamp(10px,1.5vw,14px) clamp(28px,4vw,44px)",
              fontSize: "clamp(13px,1.5vw,15px)", fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em",
            }}>✓ Complete</button>
            <button onClick={onStop} style={{
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)",
              border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: "100px",
              padding: "clamp(10px,1.5vw,14px) clamp(22px,3vw,36px)",
              fontSize: "clamp(12px,1.3vw,14px)",
              cursor: "pointer", fontFamily: "inherit",
            }}>✕ Stop</button>
          </>
        ) : (
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.28)", margin: 0 }}>
            Start a session first
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function FocusPage() {
  const { todos } = useRealtimeTodos();
  const [duration, setDuration]             = useState(25);
  const [timeLeft, setTimeLeft]             = useState(25 * 60);
  const [isRunning, setIsRunning]           = useState(false);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [selectedTodo, setSelectedTodo]     = useState("");
  const [sessions, setSessions]             = useState<FocusSession[]>([]);
  const [showManual, setShowManual]         = useState(false);
  const [fullscreen, setFullscreen]         = useState(false);
  const [manualDate, setManualDate]         = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualHour, setManualHour]         = useState("09");
  const [manualDuration, setManualDuration] = useState(25);
  const [manualTodo, setManualTodo]         = useState("");
  const [manualCustomDur, setManualCustomDur] = useState("");
  const [savingManual, setSavingManual]     = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { fetchFocusSessions(30).then(setSessions).catch(() => {}); }, []);
  const activeTodos = useMemo(() => todos.filter((t) => t.status !== "done"), [todos]);

  const dailyStats = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    return days.map((day) => {
      const dayStr      = format(day, "yyyy-MM-dd");
      const daySessions = sessions.filter((s) => s.completed && format(new Date(s.started_at), "yyyy-MM-dd") === dayStr);
      return { date: dayStr, day: format(day, "EEE"), minutes: daySessions.reduce((sum, s) => sum + s.duration_minutes, 0), sessions: daySessions.length };
    });
  }, [sessions]);

  const todayMinutes     = dailyStats.find((d) => d.date === format(new Date(), "yyyy-MM-dd"))?.minutes || 0;
  const yesterdayMinutes = dailyStats.find((d) => d.date === format(subDays(new Date(), 1), "yyyy-MM-dd"))?.minutes || 0;
  const todaySessions    = dailyStats.find((d) => d.date === format(new Date(), "yyyy-MM-dd"))?.sessions || 0;
  const weekMinutes      = dailyStats.slice(-7).reduce((s, d) => s + d.minutes, 0);
  const maxDayMinutes    = Math.max(...dailyStats.map((d) => d.minutes), 1);
  const activeDays       = dailyStats.slice(-7).filter((d) => d.minutes > 0).length;
  const avgMinutes       = activeDays > 0 ? Math.round(weekMinutes / activeDays) : 0;

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
    } else if (timeLeft === 0 && isRunning) { handleComplete(); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  const handleStart = async () => {
    const session = await startFocusSession(selectedTodo || null, duration);
    setCurrentSession(session); setTimeLeft(duration * 60); setIsRunning(true);
    setFullscreen(true);
  };
  const handleComplete = async () => {
    setIsRunning(false); setFullscreen(false);
    if (currentSession) {
      await completeFocusSession(currentSession.id);
      playDoneSound();
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Focus complete! ${duration}min`, type: "success" } }));
      setSessions(await fetchFocusSessions(30));
    }
    setCurrentSession(null);
  };
  const handleStop = () => {
    setIsRunning(false); setFullscreen(false);
    setTimeLeft(duration * 60); setCurrentSession(null);
  };

  const handleManualLog = async () => {
    if (savingManual) return;
    const mins = manualCustomDur ? parseInt(manualCustomDur) : manualDuration;
    if (!mins || mins < 1 || mins > 480) {
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Duration must be 1–480 mins", type: "error" } })); return;
    }
    setSavingManual(true);
    try {
      const startedAt = new Date(`${manualDate}T${manualHour}:00:00`).toISOString();
      const endedAt   = new Date(new Date(`${manualDate}T${manualHour}:00:00`).getTime() + mins * 60 * 1000).toISOString();
      const { error } = await supabase.from("focus_sessions").insert({ todo_id: manualTodo || null, duration_minutes: mins, completed: true, started_at: startedAt, ended_at: endedAt });
      if (error) throw error;
      setSessions(await fetchFocusSessions(30));
      setShowManual(false); setManualCustomDur(""); setManualTodo("");
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Logged ${mins}min session`, type: "success" } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: err?.message || "Failed to log", type: "error" } }));
    } finally { setSavingManual(false); }
  };

  const mins     = Math.floor(timeLeft / 60);
  const secs     = timeLeft % 60;
  const selectedTask = todos.find((t) => t.id === selectedTodo);
  const taskName     = selectedTask?.title ?? "Free focus";

  return (
    <>
      {/* ── FULLSCREEN OVERLAY ── */}
      {fullscreen && (
        <FullscreenTimer
          timeLeft={timeLeft} duration={duration} isRunning={isRunning}
          taskName={taskName} todayMinutes={todayMinutes}
          onClose={() => setFullscreen(false)}
          onComplete={handleComplete} onStop={handleStop}
        />
      )}

      {/* ── NORMAL PAGE ── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto pb-32 md:pb-10">

        {/* Header */}
        <header className="mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
                Focus timer
              </h1>
              <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
                Today: {todayMinutes}min ({todaySessions} sessions) · This week: {weekMinutes}min
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isRunning && (
                <button onClick={() => setFullscreen(true)} className="cc-btn px-3 py-2 text-xs"
                  style={{ color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
                  <span style={{ position: "relative", zIndex: 3 }}>⛶ Focus mode</span>
                </button>
              )}
              <button onClick={() => setShowManual(!showManual)} className="cc-btn px-3 py-2 text-xs"
                style={{ color: showManual ? "var(--accent)" : "var(--cc-text)" }}>
                <span style={{ position: "relative", zIndex: 3 }}>{showManual ? "✕ Cancel" : "+ Log past"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Manual log panel */}
        {showManual && (
          <div className="liquid-glass rounded-[22px] p-4 sm:p-5 mb-4 animate-slide-up">
            <h2 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Log a past session</h2>
            <p className="text-[10px] font-mono mb-4" style={{ color: "var(--text-muted)" }}>Forgot to start the timer? Add any session from the past here.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Date</span>
                <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} max={format(new Date(), "yyyy-MM-dd")}
                  className="w-full rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Time (hour)</span>
                <select value={manualHour} onChange={(e) => setManualHour(e.target.value)}
                  className="w-full rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}>
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = String(i).padStart(2, "0");
                    const label = `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i < 12 ? "AM" : "PM"}`;
                    return <option key={h} value={h}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Duration</span>
                <div className="grid grid-cols-3 sm:flex gap-1">
                  {[25, 45, 60, 90, 120, 180].map((d) => (
                    <button key={d} onClick={() => { setManualDuration(d); setManualCustomDur(""); }}
                      className="py-2 text-[9px] font-mono rounded-[10px] transition-all"
                      style={{ background: manualDuration === d && !manualCustomDur ? "var(--accent-muted)" : "var(--bg-input)", color: manualDuration === d && !manualCustomDur ? "var(--accent)" : "var(--text-muted)", border: `0.5px solid ${manualDuration === d && !manualCustomDur ? "var(--accent-dim)" : "var(--glass-border)"}` }}>
                      {d >= 60 ? `${d / 60}h` : `${d}m`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Custom (mins)</span>
                <input type="number" min="1" max="480" value={manualCustomDur} onChange={(e) => setManualCustomDur(e.target.value)} placeholder="e.g. 110"
                  className="w-full rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
              </div>
            </div>
            <div className="mb-3">
              <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Task (optional)</span>
              <select value={manualTodo} onChange={(e) => setManualTodo(e.target.value)}
                className="w-full rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <option value="">Free focus (no task)</option>
                {activeTodos.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                Logging: <span style={{ color: "var(--accent)" }}>{manualCustomDur ? `${manualCustomDur}m` : manualDuration >= 60 ? `${manualDuration / 60}h` : `${manualDuration}m`}</span>
                {" "}on <span style={{ color: "var(--text-secondary)" }}>
                  {manualDate === format(new Date(), "yyyy-MM-dd") ? "today" : manualDate === format(subDays(new Date(), 1), "yyyy-MM-dd") ? "yesterday" : manualDate}
                </span>
                {" "}at <span style={{ color: "var(--text-secondary)" }}>
                  {parseInt(manualHour) === 0 ? "12" : parseInt(manualHour) > 12 ? parseInt(manualHour) - 12 : parseInt(manualHour)}:00 {parseInt(manualHour) < 12 ? "AM" : "PM"}
                </span>
              </p>
              <button onClick={handleManualLog} disabled={savingManual} className="cc-btn cc-btn-accent px-5 py-2 text-xs disabled:opacity-40">
                <span style={{ position: "relative", zIndex: 3 }}>{savingManual ? "Saving…" : "✓ Log session"}</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Timer panel */}
          <div className="lg:col-span-2">
            <div className="liquid-glass rounded-[24px] p-6 sm:p-8 text-center mb-4 animate-fade-in-up">

              {/* Flip clock display */}
              <div className="flex flex-col items-center mb-6">
                <FlipClock mins={mins} secs={secs} isRunning={isRunning} />
                <p className="text-[10px] font-mono mt-3 uppercase tracking-widest"
                  style={{ color: isRunning ? "var(--accent)" : "var(--text-muted)" }}>
                  {isRunning ? "focusing" : "ready"}
                </p>
              </div>

              {!isRunning ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 sm:flex gap-2 justify-center mx-auto" style={{ maxWidth: "360px" }}>
                    {DURATIONS.map((d) => (
                      <button key={d} onClick={() => { setDuration(d); setTimeLeft(d * 60); }}
                        className="cc-chip py-2.5 text-xs sm:text-sm relative z-10 px-3"
                        style={{ color: duration === d ? "var(--accent)" : "var(--text-secondary)" }}
                        data-active={duration === d}>
                        <span style={{ position: "relative", zIndex: 3 }}>{d >= 60 ? `${d / 60}h` : `${d}m`}</span>
                      </button>
                    ))}
                  </div>
                  <select value={selectedTodo} onChange={(e) => setSelectedTodo(e.target.value)}
                    className="rounded-[14px] px-4 py-2.5 focus:outline-none w-full max-w-sm mx-auto block"
                    style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)", fontSize: "var(--text-sm)" }}>
                    <option value="">Free focus (no task)</option>
                    {activeTodos.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                  <button onClick={handleStart} className="cc-btn cc-btn-accent px-12 py-3.5 text-sm" style={{ minWidth: "160px", fontSize: "var(--text-md)" }}>
                    <span style={{ position: "relative", zIndex: 3 }}>▶ Start</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <button onClick={() => setFullscreen(true)} className="cc-btn px-4 py-2 text-xs"
                      style={{ color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
                      <span style={{ position: "relative", zIndex: 3 }}>⛶ Focus mode</span>
                    </button>
                  </div>
                  <button onClick={handleComplete} className="cc-btn cc-btn-accent px-10 py-3 text-sm" style={{ minWidth: "150px" }}>
                    <span style={{ position: "relative", zIndex: 3 }}>✓ Complete</span>
                  </button>
                  <div>
                    <button onClick={handleStop} className="cc-btn cc-btn-danger px-8 py-2.5 text-xs" style={{ minWidth: "120px" }}>
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
                    <div className="w-full rounded-t transition-all duration-300"
                      title={`${d.date}: ${d.minutes}min (${d.sessions} sessions)`}
                      style={{
                        height: `${Math.max(2, (d.minutes / maxDayMinutes) * 64)}px`,
                        background: d.minutes > 0 ? `linear-gradient(180deg, hsla(var(--accent-h),var(--accent-s),calc(var(--accent-l)+10%),0.9), var(--accent))` : "var(--glass-fill)",
                        border: "0.5px solid var(--glass-border)",
                        opacity: d.date === format(new Date(), "yyyy-MM-dd") ? 1 : 0.65,
                        boxShadow: d.minutes > 0 ? "0 0 8px var(--accent-glow)" : "none",
                      }} />
                    <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{d.day.charAt(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: insights + recent */}
          <div className="space-y-4">
            <div className="liquid-glass rounded-[22px] p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Insights</h2>
              <div className="space-y-3">
                {[
                  { label: "Today",          value: `${todayMinutes}m`,                              color: "#5ecf95" },
                  { label: "Yesterday",      value: `${yesterdayMinutes}m`,                          color: "var(--text-secondary)" },
                  { label: "This week",      value: `${weekMinutes}m`,                               color: "#4da6ff" },
                  { label: "Daily average",  value: `${avgMinutes}m`,                                color: "#f5a623" },
                  { label: "Best time",      value: hourDistribution,                                color: "#b48eff" },
                  { label: "Total sessions", value: `${sessions.filter((s) => s.completed).length}`, color: "var(--text-secondary)" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-mono" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                    <span className="text-xs sm:text-sm font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="liquid-glass rounded-[22px] p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Recent</h2>
              {sessions.filter((s) => s.completed).length === 0 ? (
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>No sessions yet</p>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {sessions.filter((s) => s.completed).slice(0, 25).map((s) => {
                    const task        = todos.find((t) => t.id === s.todo_id);
                    const sessionDate = new Date(s.started_at);
                    const dateLabel   = isToday(sessionDate) ? "Today" : isYesterday(sessionDate) ? "Yesterday" : format(sessionDate, "MMM d");
                    const timeLabel   = format(sessionDate, "h:mma").toLowerCase();
                    return (
                      <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-[11px]"
                        style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border-subtle)" }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#5ecf95" }} />
                          <span className="text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>
                            {task ? task.title : "Free focus"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs font-mono font-medium" style={{ color: "var(--accent)" }}>{s.duration_minutes}m</span>
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{dateLabel} {timeLabel}</span>
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
    </>
  );
}
