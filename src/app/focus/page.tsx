"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { supabase, startFocusSession, completeFocusSession, fetchFocusSessions, type FocusSession } from "@/lib/supabase";
import { playDoneSound } from "@/lib/sounds";
import { format, isToday, subDays, eachDayOfInterval, isYesterday } from "date-fns";

const DURATIONS = [15, 25, 45, 60, 90, 120];

// ─────────────────────────────────────────────────────────────────────────────
// SPLITFLAP TILE — exactly like image 2: dark square, digit centered,
// horizontal split line through middle, flip animation on change
// ─────────────────────────────────────────────────────────────────────────────
function SplitflapTile({ digit }: { digit: string }) {
  const [cur, setCur]         = useState(digit);
  const [prev, setPrev]       = useState(digit);
  const [phase, setPhase]     = useState<"idle"|"flipping">("idle");
  const prevRef               = useRef(digit);

  useEffect(() => {
    if (digit === prevRef.current) return;
    setPrev(prevRef.current);
    setPhase("flipping");
    prevRef.current = digit;
    const t = setTimeout(() => { setCur(digit); setPhase("idle"); }, 300);
    return () => clearTimeout(t);
  }, [digit]);

  const tileW = "clamp(72px, 14vw, 130px)";
  const tileH = "clamp(96px, 18vw, 172px)";
  const fontSize = "clamp(56px, 10vw, 100px)";

  return (
    <div style={{
      width: tileW, height: tileH,
      borderRadius: "12px",
      background: "#111",
      boxShadow: "0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
      position: "relative", overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Bottom half — always shows current digit, clipped to bottom */}
      <div style={{
        position: "absolute", top: "50%", left: 0, right: 0, bottom: 0,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflow: "hidden",
        background: "#0e0e0e",
      }}>
        <span style={{
          fontSize, fontWeight: 700,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          color: "#b8b8b8",
          lineHeight: 1,
          marginTop: `calc(${tileH} * -0.5)`,
          letterSpacing: "-0.04em",
          userSelect: "none",
        }}>{cur}</span>
      </div>

      {/* Top half — shows current digit, clipped to top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: "50%",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        overflow: "hidden",
        background: "#141414",
      }}>
        <span style={{
          fontSize, fontWeight: 700,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          color: "#b8b8b8",
          lineHeight: 1,
          marginBottom: `calc(${tileH} * -0.5)`,
          letterSpacing: "-0.04em",
          userSelect: "none",
        }}>{cur}</span>
      </div>

      {/* Flip animation — top half rotates down showing previous digit */}
      {phase === "flipping" && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: "50%",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          overflow: "hidden",
          background: "#141414",
          transformOrigin: "bottom center",
          animation: "sfFlip 0.3s cubic-bezier(0.4,0,0.6,1) forwards",
          zIndex: 10,
        }}>
          <span style={{
            fontSize, fontWeight: 700,
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            color: "#b8b8b8",
            lineHeight: 1,
            marginBottom: `calc(${tileH} * -0.5)`,
            letterSpacing: "-0.04em",
            userSelect: "none",
          }}>{prev}</span>
        </div>
      )}

      {/* Center split line */}
      <div style={{
        position: "absolute", top: "50%", left: 0, right: 0,
        height: "2px",
        background: "rgba(0,0,0,0.9)",
        transform: "translateY(-50%)",
        zIndex: 20,
      }} />

      {/* Subtle inner shadow on split */}
      <div style={{
        position: "absolute", top: "calc(50% + 1px)", left: 0, right: 0,
        height: "6px",
        background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
        zIndex: 19,
      }} />
    </div>
  );
}

function SplitflapClock({ mins, secs, isRunning }: { mins: number; secs: number; isRunning: boolean }) {
  const m0 = String(Math.floor(mins / 10));
  const m1 = String(mins % 10);
  const s0 = String(Math.floor(secs / 10));
  const s1 = String(secs % 10);

  return (
    <>
      <style>{`
        @keyframes sfFlip {
          0%   { transform: perspective(600px) rotateX(0deg);    opacity: 1; }
          100% { transform: perspective(600px) rotateX(-90deg);  opacity: 0.4; }
        }
        @keyframes bbcIn {
          from { transform: translateY(45px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: "clamp(6px,1.5vw,14px)" }}>
        {/* MM tiles */}
        <SplitflapTile digit={m0} />
        <SplitflapTile digit={m1} />

        {/* Colon dots */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px,1.5vw,14px)", margin: "0 2px" }}>
          <div style={{
            width: "clamp(6px,1vw,10px)", height: "clamp(6px,1vw,10px)",
            borderRadius: "50%",
            background: isRunning ? "var(--accent)" : "rgba(255,255,255,0.25)",
            boxShadow: isRunning ? "0 0 8px var(--accent-glow)" : "none",
          }} />
          <div style={{
            width: "clamp(6px,1vw,10px)", height: "clamp(6px,1vw,10px)",
            borderRadius: "50%",
            background: isRunning ? "var(--accent)" : "rgba(255,255,255,0.25)",
            boxShadow: isRunning ? "0 0 8px var(--accent-glow)" : "none",
          }} />
        </div>

        {/* SS tiles */}
        <SplitflapTile digit={s0} />
        <SplitflapTile digit={s1} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BBC FULLSCREEN — exactly like image 1:
// left-aligned giant numbers, label top-right each row, alternating row bg,
// thin dividers, compass wheel at bottom
// ─────────────────────────────────────────────────────────────────────────────
function BBCRow({
  value, label, bg, animKey
}: { value: string; label: string; bg: string; animKey: number }) {
  return (
    <div style={{
      position: "relative",
      background: bg,
      padding: "0 clamp(20px,5vw,72px)",
      display: "flex", alignItems: "flex-end",
      flex: 1, overflow: "hidden",
      minHeight: 0,
    }}>
      {/* Label — top right */}
      <span style={{
        position: "absolute",
        top: "clamp(8px,2vw,18px)",
        right: "clamp(20px,5vw,72px)",
        fontSize: "clamp(12px,1.8vw,20px)",
        fontWeight: 400,
        letterSpacing: "0.06em",
        color: "rgba(255,255,255,0.30)",
        fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
        textTransform: "uppercase",
      }}>{label}</span>

      {/* Giant number */}
      <span key={animKey} style={{
        fontSize: "clamp(5.5rem,24vw,20rem)",
        fontWeight: 200,
        fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
        color: "rgba(255,255,255,0.90)",
        lineHeight: 0.88,
        letterSpacing: "-0.04em",
        paddingBottom: "clamp(4px,1vw,12px)",
        animation: animKey > 0 ? "bbcIn 0.32s cubic-bezier(0.2,0.8,0.2,1) both" : "none",
        userSelect: "none",
      }}>{value}</span>
    </div>
  );
}

function CompassWheel({ progress }: { progress: number }) {
  // Thin curved dial at bottom — like the world map/compass in image 1
  const labels = ["SRN", "Focus", "Deep", "Work", "Flow", "Zone", "Peak", "Done"];
  const angle = progress * 360;

  return (
    <div style={{
      position: "relative",
      height: "clamp(60px,10vw,100px)",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Arc background */}
      <div style={{
        position: "absolute",
        left: "50%", bottom: "-clamp(100px,15vw,160px)",
        transform: "translateX(-50%)",
        width: "clamp(320px,60vw,700px)",
        height: "clamp(320px,60vw,700px)",
        borderRadius: "50%",
        border: "0.5px solid rgba(255,255,255,0.12)",
        boxSizing: "border-box",
      }} />

      {/* Tick marks around the arc (bottom portion visible) */}
      {labels.map((label, i) => {
        const totalAngle = 180;
        const startAngle = -90;
        const step = totalAngle / (labels.length - 1);
        const a = startAngle + i * step;
        const rad = (a * Math.PI) / 180;
        const r = 42; // % from center
        const x = 50 + r * Math.cos(rad);
        const y = 100 + r * Math.sin(rad) * 0.6;
        return (
          <span key={label} style={{
            position: "absolute",
            left: `${x}%`, top: `${Math.min(y, 95)}%`,
            transform: "translate(-50%, -50%)",
            fontSize: "clamp(9px,1.2vw,13px)",
            color: i === Math.floor((labels.length - 1) * progress)
              ? "rgba(255,255,255,0.70)"
              : "rgba(255,255,255,0.22)",
            fontFamily: "-apple-system, sans-serif",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            transition: "color 0.5s ease",
          }}>{label}</span>
        );
      })}

      {/* Center pointer line */}
      <div style={{
        position: "absolute",
        left: "50%", bottom: 0,
        width: "1px", height: "clamp(20px,4vw,40px)",
        background: "rgba(255,255,255,0.50)",
        transform: "translateX(-50%)",
      }} />
      <div style={{
        position: "absolute",
        left: "50%", bottom: "clamp(18px,3.5vw,36px)",
        width: "6px", height: "6px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.80)",
        transform: "translateX(-50%)",
        boxShadow: "0 0 8px rgba(255,255,255,0.5)",
      }} />
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
  const progress = (duration * 60 - timeLeft) / (duration * 60);
  const now      = new Date();

  const [hKey, setHKey]   = useState(0);
  const [mKey, setMKey]   = useState(0);
  const [sKey, setSKey]   = useState(0);
  const prevH = useRef(hours); const prevM = useRef(mins); const prevS = useRef(secs);

  useEffect(() => {
    if (hours !== prevH.current) { setHKey((k) => k + 1); prevH.current = hours; }
    if (mins  !== prevM.current) { setMKey((k) => k + 1); prevM.current = mins;  }
    if (secs  !== prevS.current) { setSKey((k) => k + 1); prevS.current = secs;  }
  }, [hours, mins, secs]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0a0a0a",
      display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes sfFlip {
          0%   { transform: perspective(600px) rotateX(0deg);   opacity: 1; }
          100% { transform: perspective(600px) rotateX(-90deg); opacity: 0.3; }
        }
        @keyframes bbcIn {
          from { transform: translateY(45px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "clamp(14px,2.5vw,28px) clamp(20px,5vw,72px) 0",
      }}>
        <div>
          <p style={{ fontSize: "clamp(15px,2vw,22px)", fontWeight: 500, color: "rgba(255,255,255,0.82)", margin: 0, letterSpacing: "-0.02em" }}>
            {taskName}
          </p>
          <p style={{ fontSize: "clamp(11px,1.3vw,14px)", color: "rgba(255,255,255,0.28)", margin: "3px 0 0", fontWeight: 400 }}>
            {format(now, "EEEE, MMMM d")} · Today {todayMinutes}min
          </p>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.07)",
          border: "0.5px solid rgba(255,255,255,0.14)",
          color: "rgba(255,255,255,0.45)",
          borderRadius: "100px",
          padding: "clamp(6px,1vw,10px) clamp(14px,2vw,22px)",
          fontSize: "clamp(11px,1.2vw,13px)",
          cursor: "pointer", fontFamily: "inherit",
        }}>✕ Exit</button>
      </div>

      {/* ── Top divider ── */}
      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.08)", margin: "clamp(10px,1.5vw,18px) 0 0", flexShrink: 0 }} />

      {/* ── Clock rows ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {duration >= 60 && (
          <>
            <BBCRow value={String(hours).padStart(2, "0")} label="H"   bg="#111111" animKey={hKey} />
            <div style={{ height: "0.5px", background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
          </>
        )}
        <BBCRow value={String(mins).padStart(2, "0")} label="Min" bg={duration >= 60 ? "#0e0e0e" : "#111111"} animKey={mKey} />
        <div style={{ height: "0.5px", background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
        <BBCRow value={String(secs).padStart(2, "0")} label="Sec" bg="#0b0b0b" animKey={sKey} />
      </div>

      {/* ── Bottom divider ── */}
      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

      {/* ── Compass wheel ── */}
      <CompassWheel progress={progress} />

      {/* ── Controls ── */}
      <div style={{
        flexShrink: 0,
        display: "flex", gap: "10px", justifyContent: "center", alignItems: "center",
        padding: "clamp(8px,1.5vw,14px) clamp(20px,5vw,72px) clamp(16px,3vw,32px)",
      }}>
        {isRunning ? (
          <>
            <button onClick={onComplete} style={{
              background: "rgba(255,255,255,0.88)", color: "#0a0a0a",
              border: "none", borderRadius: "100px",
              padding: "clamp(10px,1.5vw,13px) clamp(28px,4vw,44px)",
              fontSize: "clamp(13px,1.4vw,15px)", fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em",
            }}>✓ Complete</button>
            <button onClick={onStop} style={{
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.50)",
              border: "0.5px solid rgba(255,255,255,0.14)", borderRadius: "100px",
              padding: "clamp(10px,1.5vw,13px) clamp(22px,3vw,36px)",
              fontSize: "clamp(12px,1.3vw,14px)",
              cursor: "pointer", fontFamily: "inherit",
            }}>✕ Stop</button>
          </>
        ) : (
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: 0 }}>
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
  const [duration, setDuration]               = useState(25);
  const [timeLeft, setTimeLeft]               = useState(25 * 60);
  const [isRunning, setIsRunning]             = useState(false);
  const [currentSession, setCurrentSession]   = useState<FocusSession | null>(null);
  const [selectedTodo, setSelectedTodo]       = useState("");
  const [sessions, setSessions]               = useState<FocusSession[]>([]);
  const [showManual, setShowManual]           = useState(false);
  const [fullscreen, setFullscreen]           = useState(false);
  const [manualDate, setManualDate]           = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualHour, setManualHour]           = useState("09");
  const [manualDuration, setManualDuration]   = useState(25);
  const [manualTodo, setManualTodo]           = useState("");
  const [manualCustomDur, setManualCustomDur] = useState("");
  const [savingManual, setSavingManual]       = useState(false);
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
    const hrs: Record<number, number> = {};
    sessions.filter((s) => s.completed).forEach((s) => {
      const h = new Date(s.started_at).getHours();
      hrs[h] = (hrs[h] || 0) + s.duration_minutes;
    });
    const best = Object.entries(hrs).sort(([, a], [, b]) => b - a)[0];
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

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const selectedTask = todos.find((t) => t.id === selectedTodo);
  const taskName     = selectedTask?.title ?? "Free focus";

  return (
    <>
      {fullscreen && (
        <FullscreenTimer
          timeLeft={timeLeft} duration={duration} isRunning={isRunning}
          taskName={taskName} todayMinutes={todayMinutes}
          onClose={() => setFullscreen(false)}
          onComplete={handleComplete} onStop={handleStop}
        />
      )}

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

              {/* Splitflap clock */}
              <div className="flex flex-col items-center mb-6">
                <SplitflapClock mins={mins} secs={secs} isRunning={isRunning} />
                <p className="text-[10px] font-mono mt-4 uppercase tracking-widest"
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
                  <div className="flex items-center justify-center gap-2 mb-1">
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
