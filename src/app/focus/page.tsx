"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { supabase, startFocusSession, completeFocusSession, fetchFocusSessions, type FocusSession } from "@/lib/supabase";
import { playDoneSound } from "@/lib/sounds";
import { format, isToday, subDays, eachDayOfInterval, isYesterday } from "date-fns";

const DURATIONS = [15, 25, 45, 60, 90, 120];

// ─────────────────────────────────────────────────────────────────────────────
// SPLITFLAP TILE — one number, one card, sliced in half
// ─────────────────────────────────────────────────────────────────────────────
function SplitflapTile({ digit }: { digit: string }) {
  const [current, setCurrent] = useState(digit);
  const [next,    setNext]    = useState(digit);
  const [flipping, setFlipping] = useState(false);
  const prevRef = useRef(digit);

  useEffect(() => {
    if (digit === prevRef.current) return;
    setNext(digit);
    setFlipping(true);
    const t = setTimeout(() => {
      setCurrent(digit);
      setFlipping(false);
      prevRef.current = digit;
    }, 360);
    return () => clearTimeout(t);
  }, [digit]);

  const W  = "clamp(64px, 12vw, 120px)";
  const H  = "clamp(86px, 16vw, 160px)";
  const FS = "clamp(52px, 10vw, 100px)";

  const numStyle: React.CSSProperties = {
    fontSize: FS,
    fontWeight: 800,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    lineHeight: 1,
    letterSpacing: "-0.04em",
    userSelect: "none",
    position: "absolute",
    left: 0, right: 0,
    textAlign: "center",
  };

  return (
    <div style={{ width: W, height: H, position: "relative", borderRadius: "12px", overflow: "hidden", flexShrink: 0,
      boxShadow: "0 12px 40px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)" }}>

      {/* TOP HALF — clips to show only upper portion of digit */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%",
        background: "#1d1d1d", overflow: "hidden" }}>
        <span style={{ ...numStyle, color: "#b4b4b4", top: 0, height: H,
          display: "flex", alignItems: "center", justifyContent: "center" }}>{current}</span>
      </div>

      {/* BOTTOM HALF — clips to show only lower portion of digit */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: "#151515", overflow: "hidden" }}>
        <span style={{ ...numStyle, color: "#9a9a9a", bottom: 0, height: H,
          display: "flex", alignItems: "center", justifyContent: "center" }}>{current}</span>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "14px",
          background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)", zIndex: 5 }} />
      </div>

      {/* FLIP ANIMATION */}
      {flipping && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%",
            background: "#1d1d1d", overflow: "hidden",
            transformOrigin: "bottom center", zIndex: 20,
            animation: "sfTopOut 0.18s ease-in forwards" }}>
            <span style={{ ...numStyle, color: "#b4b4b4", top: 0, height: H,
              display: "flex", alignItems: "center", justifyContent: "center" }}>{current}</span>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
            background: "#151515", overflow: "hidden",
            transformOrigin: "top center", zIndex: 19,
            animation: "sfBotIn 0.18s ease-out 0.18s forwards", opacity: 0 }}>
            <span style={{ ...numStyle, color: "#9a9a9a", bottom: 0, height: H,
              display: "flex", alignItems: "center", justifyContent: "center" }}>{next}</span>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "14px",
              background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)", zIndex: 5 }} />
          </div>
        </>
      )}

      {/* SPLIT LINE */}
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0,
        height: "3px", background: "#000", transform: "translateY(-50%)", zIndex: 30 }} />
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
        @keyframes sfTopOut {
          from { transform: perspective(500px) rotateX(0deg);   opacity: 1; }
          to   { transform: perspective(500px) rotateX(-90deg); opacity: 0; }
        }
        @keyframes sfBotIn {
          from { transform: perspective(500px) rotateX(90deg);  opacity: 0; }
          to   { transform: perspective(500px) rotateX(0deg);   opacity: 1; }
        }
        @keyframes bbcSlideIn {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,2vw,18px)" }}>
        <div style={{ display: "flex", gap: "clamp(4px,1vw,8px)" }}>
          <SplitflapTile digit={m0} />
          <SplitflapTile digit={m1} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px,2vw,16px)", alignItems: "center" }}>
          <div style={{ width: "clamp(6px,1.2vw,9px)", height: "clamp(6px,1.2vw,9px)", borderRadius: "50%",
            background: isRunning && !isPaused ? "var(--accent)" : isRunning && isPaused ? "rgba(245,166,35,0.6)" : "rgba(255,255,255,0.22)",
            boxShadow: isRunning && !isPaused ? "0 0 10px var(--accent-glow)" : "none",
            transition: "background 0.3s, box-shadow 0.3s" }} />
          <div style={{ width: "clamp(6px,1.2vw,9px)", height: "clamp(6px,1.2vw,9px)", borderRadius: "50%",
            background: isRunning && !isPaused ? "var(--accent)" : isRunning && isPaused ? "rgba(245,166,35,0.6)" : "rgba(255,255,255,0.22)",
            boxShadow: isRunning && !isPaused ? "0 0 10px var(--accent-glow)" : "none",
            transition: "background 0.3s, box-shadow 0.3s" }} />
        </div>
        <div style={{ display: "flex", gap: "clamp(4px,1vw,8px)" }}>
          <SplitflapTile digit={s0} />
          <SplitflapTile digit={s1} />
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BBC FULLSCREEN
// ─────────────────────────────────────────────────────────────────────────────
const FOCUS_ZONES = [
  { label: "Warming up", sub: "Just starting",  angle: -70 },
  { label: "Getting in", sub: "Finding rhythm", angle: -35 },
  { label: "Deep work",  sub: "Peak focus",     angle:   0 },
  { label: "Flow state", sub: "In the zone 🔥", angle:  35 },
  { label: "Done",       sub: "Almost there!",  angle:  70 },
];

function BBCRow({ value, label, bg, textColor, labelColor, animKey, rowCount }: {
  value: string; label: string; bg: string;
  textColor: string; labelColor: string; animKey: number; rowCount: number;
}) {
  // Font size scaled to fit inside the row.
  // Total screen: 100vh. Used by header≈110px, dividers≈4px, compass≈96px, controls≈70px → ~280px
  // Each row gets (100vh - 280px) / rowCount height.
  // Font = 72% of that height so it fills the row without overflowing.
  const fs = `calc((100vh - 280px) / ${rowCount} * 0.72)`;

  return (
    <div style={{
      flex: 1, position: "relative", background: bg,
      overflow: "hidden", minHeight: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Label top-right */}
      <span style={{
        position: "absolute", top: "clamp(8px,1.5vw,14px)", right: "clamp(16px,3vw,40px)",
        fontSize: "clamp(11px,1.4vw,15px)", fontWeight: 400, letterSpacing: "0.08em",
        textTransform: "capitalize", color: labelColor, fontFamily: "inherit", zIndex: 2,
      }}>{label}</span>

      {/* Giant number — centered, constrained to row */}
      <span key={animKey} style={{
        fontSize: fs,
        fontWeight: 200, lineHeight: 1, letterSpacing: "-0.05em",
        color: textColor, textAlign: "center", userSelect: "none",
        fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
        animation: animKey > 0 ? "bbcSlideIn 0.30s cubic-bezier(0.2,0.8,0.2,1) both" : "none",
        display: "block", maxHeight: "100%",
      }}>{value}</span>
    </div>
  );
}

function CompassWheel({ progress }: { progress: number }) {
  const needleAngle = -70 + progress * 140;
  let activeZone = 0, minDist = Infinity;
  FOCUS_ZONES.forEach((z, i) => {
    const d = Math.abs(z.angle - needleAngle);
    if (d < minDist) { minDist = d; activeZone = i; }
  });

  return (
    <div style={{ flexShrink: 0, position: "relative", height: "clamp(72px,12vw,100px)",
      background: "#1a1a1a", overflow: "hidden" }}>
      {/* Arc */}
      <div style={{ position: "absolute",
        width: "clamp(320px,70vw,520px)", height: "clamp(320px,70vw,520px)",
        borderRadius: "50%", border: "0.5px solid rgba(255,255,255,0.14)",
        left: "50%", bottom: "clamp(-240px,-50vw,-180px)", transform: "translateX(-50%)" }} />

      {/* Zone labels */}
      {FOCUS_ZONES.map((z, i) => {
        const x = ((z.angle + 70) / 140) * 86 + 7;
        const yOffset = Math.abs(z.angle) < 20 ? "clamp(44px,8vw,60px)" : Math.abs(z.angle) < 50 ? "clamp(36px,6vw,50px)" : "clamp(18px,3vw,26px)";
        const isActive = i === activeZone;
        return (
          <div key={z.label} style={{ position: "absolute", left: `${x}%`, bottom: yOffset,
            transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none",
            transition: "all 0.5s ease" }}>
            <span style={{ display: "block",
              fontSize: isActive ? "clamp(10px,1.4vw,13px)" : "clamp(9px,1.2vw,11px)",
              fontWeight: isActive ? 600 : 400, letterSpacing: "0.04em",
              color: isActive ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.20)",
              fontFamily: "-apple-system, sans-serif", whiteSpace: "nowrap",
              transition: "all 0.5s ease" }}>{z.label}</span>
            {isActive && (
              <span style={{ display: "block", fontSize: "clamp(8px,1vw,10px)",
                color: "rgba(255,255,255,0.35)", marginTop: "2px",
                fontFamily: "-apple-system, sans-serif" }}>{z.sub}</span>
            )}
          </div>
        );
      })}

      {/* Rotating needle */}
      <div style={{ position: "absolute", left: "50%", bottom: 0,
        transformOrigin: "bottom center",
        transform: `translateX(-50%) rotate(${needleAngle}deg)`,
        transition: "transform 1s cubic-bezier(0.34,1.1,0.64,1)" }}>
        <div style={{ width: "1px", height: "clamp(36px,6vw,52px)",
          background: "rgba(255,255,255,0.55)", marginLeft: "-0.5px" }} />
        <div style={{ width: "5px", height: "5px", borderRadius: "50%",
          background: "rgba(255,255,255,0.85)", marginLeft: "-2px",
          marginTop: "-5px", boxShadow: "0 0 8px rgba(255,255,255,0.55)",
          position: "absolute", bottom: "clamp(34px,5.8vw,50px)" }} />
      </div>
    </div>
  );
}

function FullscreenTimer({
  timeLeft, duration, isRunning, isPaused, taskName, todayMinutes,
  onClose, onComplete, onStop, onPause, onResume,
}: {
  timeLeft: number; duration: number; isRunning: boolean; isPaused: boolean;
  taskName: string; todayMinutes: number;
  onClose: () => void; onComplete: () => void; onStop: () => void;
  onPause: () => void; onResume: () => void;
}) {
  const hours    = Math.floor(timeLeft / 3600);
  const mins     = Math.floor((timeLeft % 3600) / 60);
  const secs     = timeLeft % 60;
  const progress = Math.max(0, Math.min(1, (duration * 60 - timeLeft) / (duration * 60)));
  const now      = new Date();
  const showH    = duration >= 60;
  const rowCount = showH ? 3 : 2;

  const [mKey, setMKey] = useState(0);
  const [sKey, setSKey] = useState(0);
  const [hKey, setHKey] = useState(0);
  const pm = useRef(mins); const ps = useRef(secs); const ph = useRef(hours);
  useEffect(() => {
    if (mins  !== pm.current) { setMKey(k => k+1); pm.current = mins; }
    if (secs  !== ps.current) { setSKey(k => k+1); ps.current = secs; }
    if (hours !== ph.current) { setHKey(k => k+1); ph.current = hours; }
  }, [mins, secs, hours]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0a0a0a", display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, 'Helvetica Neue', sans-serif", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "clamp(14px,2vw,24px) clamp(20px,4vw,48px) clamp(12px,1.5vw,20px)",
        background: "#2c2c2c",
      }}>
        <div>
          <p style={{ fontSize: "clamp(14px,1.8vw,20px)", fontWeight: 500,
            color: "rgba(255,255,255,0.85)", margin: 0, letterSpacing: "-0.02em" }}>
            {taskName}
          </p>
          <p style={{ fontSize: "clamp(11px,1.2vw,13px)", color: "rgba(255,255,255,0.30)", margin: "3px 0 0" }}>
            {format(now, "EEEE, MMMM d")} · Today {todayMinutes}min
          </p>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.18)",
          color: "rgba(255,255,255,0.48)", borderRadius: "100px",
          padding: "clamp(6px,1vw,9px) clamp(14px,2vw,20px)",
          fontSize: "clamp(11px,1.2vw,13px)", cursor: "pointer", fontFamily: "inherit",
        }}>✕ Exit</button>
      </div>

      {/* Top divider */}
      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.10)", flexShrink: 0 }} />

      {/* Clock rows — each row gets equal share of remaining space */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {showH && (
          <>
            <BBCRow value={String(hours).padStart(2,"0")} label="H"
              bg="#363636" textColor="rgba(255,255,255,0.25)" labelColor="rgba(255,255,255,0.20)"
              animKey={hKey} rowCount={3} />
            <div style={{ height: "0.5px", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
          </>
        )}
        {/* Min row — cream/white = active highlighted */}
        <BBCRow value={String(mins).padStart(2,"0")} label="Min"
          bg="#eae8e2" textColor="#1a1a1a" labelColor="rgba(0,0,0,0.28)"
          animKey={mKey} rowCount={rowCount} />
        <div style={{ height: "0.5px", background: "rgba(0,0,0,0.14)", flexShrink: 0 }} />
        {/* Sec row — darkest */}
        <BBCRow value={String(secs).padStart(2,"0")} label="Sec"
          bg="#1a1a1a" textColor="rgba(255,255,255,0.92)" labelColor="rgba(255,255,255,0.22)"
          animKey={sKey} rowCount={rowCount} />
      </div>

      {/* Bottom divider */}
      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.10)", flexShrink: 0 }} />

      {/* Compass — auto-rotates */}
      <CompassWheel progress={progress} />

      {/* Controls */}
      <div style={{
        flexShrink: 0, display: "flex", gap: "10px", justifyContent: "center", alignItems: "center",
        padding: "clamp(8px,1.5vw,12px) clamp(20px,4vw,48px) clamp(14px,2vw,22px)",
        background: "#1a1a1a",
      }}>
        {isRunning ? (
          <>
            {isPaused ? (
              <button onClick={onResume} style={{
                background: "var(--accent, #f5a623)", color: "#0a0a0a",
                border: "none", borderRadius: "100px",
                padding: "clamp(10px,1.5vw,13px) clamp(28px,4vw,44px)",
                fontSize: "clamp(13px,1.4vw,15px)", fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
              }}>▶ Resume</button>
            ) : (
              <button onClick={onPause} style={{
                background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.80)",
                border: "0.5px solid rgba(255,255,255,0.25)", borderRadius: "100px",
                padding: "clamp(10px,1.5vw,13px) clamp(28px,4vw,44px)",
                fontSize: "clamp(13px,1.4vw,15px)", fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
              }}>⏸ Pause</button>
            )}
            <button onClick={onComplete} style={{
              background: "rgba(255,255,255,0.88)", color: "#0a0a0a",
              border: "none", borderRadius: "100px",
              padding: "clamp(10px,1.5vw,13px) clamp(28px,4vw,44px)",
              fontSize: "clamp(13px,1.4vw,15px)", fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>✓ Complete</button>
            <button onClick={onStop} style={{
              background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)",
              border: "0.5px solid rgba(255,255,255,0.16)", borderRadius: "100px",
              padding: "clamp(10px,1.5vw,13px) clamp(22px,3vw,36px)",
              fontSize: "clamp(12px,1.3vw,14px)", cursor: "pointer", fontFamily: "inherit",
            }}>✕ Stop</button>
          </>
        ) : (
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: 0 }}>Start a session first</p>
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
  const [isPaused, setIsPaused]               = useState(false);
  const [isStarting, setIsStarting]           = useState(false);
  const handleCompleteRef = useRef<() => void>(() => {});
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
    if (isRunning && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) { handleCompleteRef.current(); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, isPaused, timeLeft]);

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const session = await startFocusSession(selectedTodo || null, duration);
      setCurrentSession(session);
      setTimeLeft(duration * 60);
      setIsRunning(true);
      setFullscreen(true);
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("srn:toast", {
        detail: { message: err?.message || "Failed to start session — check connection", type: "error" },
      }));
    } finally {
      setIsStarting(false);
    }
  };
  const handleComplete = async () => {
    setIsRunning(false); setIsPaused(false); setFullscreen(false);
    if (currentSession) {
      await completeFocusSession(currentSession.id);
      playDoneSound();
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Focus complete! ${duration}min`, type: "success" } }));
      setSessions(await fetchFocusSessions(30));
    }
    setCurrentSession(null);
  };
  const handlePause  = () => { setIsPaused(true);  };
  const handleResume = () => { setIsPaused(false); };
  // Keep ref in sync with latest handleComplete (fixes stale closure)
  handleCompleteRef.current = handleComplete;
  const handleStop = () => {
    setIsRunning(false); setIsPaused(false); setFullscreen(false);
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

  const mins         = Math.floor(timeLeft / 60);
  const secs         = timeLeft % 60;
  const selectedTask = todos.find((t) => t.id === selectedTodo);
  const taskName     = selectedTask?.title ?? "Free focus";

  return (
    <>
      {fullscreen && (
        <FullscreenTimer
          timeLeft={timeLeft} duration={duration} isRunning={isRunning} isPaused={isPaused}
          taskName={taskName} todayMinutes={todayMinutes}
          onClose={() => setFullscreen(false)}
          onComplete={handleComplete} onStop={handleStop}
          onPause={handlePause} onResume={handleResume}
        />
      )}

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto pb-32 md:pb-10">

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
          <div className="lg:col-span-2">
            <div className="liquid-glass rounded-[24px] p-5 sm:p-8 text-center mb-4 animate-fade-in-up">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                <SplitflapClock mins={mins} secs={secs} isRunning={isRunning && !isPaused} />
                <p style={{ fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.14em",
                  textTransform: "uppercase", color: isRunning ? "var(--accent)" : "var(--text-muted)",
                  transition: "color 0.3s" }}>
                  {isRunning ? (isPaused ? "paused" : "focusing") : "ready"}
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
                  <button onClick={handleStart} disabled={isStarting}
                    className="cc-btn cc-btn-accent px-12 py-3.5 text-sm disabled:opacity-60"
                    style={{ minWidth: "160px", fontSize: "var(--text-md)" }}>
                    <span style={{ position: "relative", zIndex: 3 }}>{isStarting ? "Starting…" : "▶ Start"}</span>
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
                  <div className="flex items-center justify-center gap-2">
                    {isPaused ? (
                      <button onClick={handleResume} className="cc-btn cc-btn-accent px-8 py-3 text-sm" style={{ minWidth: "130px" }}>
                        <span style={{ position: "relative", zIndex: 3 }}>▶ Resume</span>
                      </button>
                    ) : (
                      <button onClick={handlePause} className="cc-btn px-8 py-3 text-sm" style={{ minWidth: "130px", color: "var(--text-primary)", border: "0.5px solid var(--glass-border)" }}>
                        <span style={{ position: "relative", zIndex: 3 }}>⏸ Pause</span>
                      </button>
                    )}
                    <button onClick={handleComplete} className="cc-btn cc-btn-accent px-8 py-3 text-sm" style={{ minWidth: "130px" }}>
                      <span style={{ position: "relative", zIndex: 3 }}>✓ Complete</span>
                    </button>
                  </div>
                  <div>
                    <button onClick={handleStop} className="cc-btn cc-btn-danger px-8 py-2.5 text-xs" style={{ minWidth: "120px" }}>
                      <span style={{ position: "relative", zIndex: 3 }}>✕ Stop</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

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
