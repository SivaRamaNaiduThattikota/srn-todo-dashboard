"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { supabase, startFocusSession, completeFocusSession, fetchFocusSessions, type FocusSession } from "@/lib/supabase";
import { format, isToday, subDays, eachDayOfInterval, isYesterday } from "date-fns";

const DURATIONS = [15, 25, 45, 60, 90, 120];
const SESSIONS_BEFORE_LONG_BREAK = 4;

// ── Audio helpers ─────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}
function tone(freq: number, startSec: number, dur: number, vol = 0.15, type: OscillatorType = "sine") {
  const c = getAudioCtx(); if (!c) return;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, c.currentTime + startSec);
  gain.gain.setValueAtTime(vol, c.currentTime + startSec);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startSec + dur);
  osc.connect(gain); gain.connect(c.destination);
  osc.start(c.currentTime + startSec); osc.stop(c.currentTime + startSec + dur);
}
function playFocusDone() {
  tone(523, 0,    0.18, 0.22);
  tone(659, 0.20, 0.18, 0.22);
  tone(784, 0.40, 0.30, 0.22);
  tone(1047,0.72, 0.40, 0.18);
}
function playBreakDone() {
  tone(784, 0,    0.18, 0.20);
  tone(523, 0.22, 0.28, 0.20);
}

// ── Notification + vibration ──────────────────────────────────────────────────
async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}
function sendNotification(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico", silent: false });
}
function vibrate(pattern: number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
}

// ── SplitflapTile ─────────────────────────────────────────────────────────────
function SplitflapTile({ digit }: { digit: string }) {
  const prevRef = useRef(digit);
  const [old, setOld]         = useState(digit);
  const [current, setCurrent] = useState(digit);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (digit === prevRef.current) return;
    setOld(prevRef.current);
    setCurrent(digit);
    setAnimKey(k => k + 1);
    prevRef.current = digit;
  }, [digit]);

  const W = "clamp(64px, 12vw, 120px)";
  const H = "clamp(86px, 16vw, 160px)";
  const FS = "clamp(52px, 10vw, 100px)";
  const base: React.CSSProperties = {
    position: "absolute", left: 0, right: 0,
    fontSize: FS, fontWeight: 800,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    lineHeight: 1, letterSpacing: "-0.04em",
    userSelect: "none", textAlign: "center",
  };

  return (
    <div style={{ width: W, height: H, position: "relative", borderRadius: "12px", overflow: "hidden", flexShrink: 0, boxShadow: "0 12px 40px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "#151515", overflow: "hidden", zIndex: 1 }}>
        <span style={{ ...base, color: "#9a9a9a", bottom: 0, height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>{current}</span>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "12px", background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)", zIndex: 2 }} />
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "#1d1d1d", overflow: "hidden", zIndex: 2 }}>
        <span style={{ ...base, color: "#b4b4b4", top: 0, height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>{current}</span>
      </div>
      <div key={animKey} style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "#1d1d1d", overflow: "hidden", transformOrigin: "bottom center", zIndex: 3, animation: animKey > 0 ? "sfFlap 0.22s cubic-bezier(0.4,0,0.6,1) forwards" : "none", backfaceVisibility: "hidden" }}>
        <span style={{ ...base, color: "#b4b4b4", top: 0, height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>{old}</span>
      </div>
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "2px", background: "#000", transform: "translateY(-50%)", zIndex: 10 }} />
    </div>
  );
}

function SplitflapClock({ mins, secs, isRunning, accentColor }: { mins: number; secs: number; isRunning: boolean; accentColor?: string }) {
  const ac = accentColor ?? "var(--accent)";
  return (
    <>
      <style>{`
        @keyframes sfFlap { 0% { transform: perspective(500px) rotateX(0deg); opacity: 1; } 100% { transform: perspective(500px) rotateX(-90deg); opacity: 0; } }
        @keyframes bbcSlideIn { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,2vw,18px)" }}>
        <div style={{ display: "flex", gap: "clamp(4px,1vw,8px)" }}>
          <SplitflapTile digit={String(Math.floor(mins / 10))} />
          <SplitflapTile digit={String(mins % 10)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px,2vw,16px)", alignItems: "center" }}>
          <div style={{ width: "clamp(6px,1.2vw,9px)", height: "clamp(6px,1.2vw,9px)", borderRadius: "50%", background: isRunning ? ac : "rgba(255,255,255,0.22)", boxShadow: isRunning ? `0 0 10px ${ac}` : "none", transition: "background 0.3s, box-shadow 0.3s" }} />
          <div style={{ width: "clamp(6px,1.2vw,9px)", height: "clamp(6px,1.2vw,9px)", borderRadius: "50%", background: isRunning ? ac : "rgba(255,255,255,0.22)", boxShadow: isRunning ? `0 0 10px ${ac}` : "none", transition: "background 0.3s, box-shadow 0.3s" }} />
        </div>
        <div style={{ display: "flex", gap: "clamp(4px,1vw,8px)" }}>
          <SplitflapTile digit={String(Math.floor(secs / 10))} />
          <SplitflapTile digit={String(secs % 10)} />
        </div>
      </div>
    </>
  );
}

// ── Session dots ──────────────────────────────────────────────────────────────
function SessionDots({ completed, total = 4, color = "#5ecf95" }: { completed: number; total?: number; color?: string }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i < completed ? "10px" : "8px", height: i < completed ? "10px" : "8px", borderRadius: "50%", background: i < completed ? color : "rgba(255,255,255,0.18)", boxShadow: i < completed ? `0 0 8px ${color}` : "none", transition: "all 0.3s ease" }} />
      ))}
    </div>
  );
}

// ── Compass ───────────────────────────────────────────────────────────────────
const FOCUS_ZONES = [
  { label: "Warming up", sub: "Just starting",  angle: -70 },
  { label: "Getting in", sub: "Finding rhythm", angle: -35 },
  { label: "Deep work",  sub: "Peak focus",     angle:   0 },
  { label: "Flow state", sub: "In the zone 🔥", angle:  35 },
  { label: "Done",       sub: "Almost there!",  angle:  70 },
];
function CompassWheel({ progress }: { progress: number }) {
  const needleAngle = -70 + progress * 140;
  let activeZone = 0, minDist = Infinity;
  FOCUS_ZONES.forEach((z, i) => { const d = Math.abs(z.angle - needleAngle); if (d < minDist) { minDist = d; activeZone = i; } });
  return (
    <div style={{ flexShrink: 0, position: "relative", height: "clamp(72px,12vw,100px)", background: "#1a1a1a", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: "clamp(320px,70vw,520px)", height: "clamp(320px,70vw,520px)", borderRadius: "50%", border: "0.5px solid rgba(255,255,255,0.14)", left: "50%", bottom: "clamp(-240px,-50vw,-180px)", transform: "translateX(-50%)" }} />
      {FOCUS_ZONES.map((z, i) => {
        const x = ((z.angle + 70) / 140) * 86 + 7;
        const yOffset = Math.abs(z.angle) < 20 ? "clamp(44px,8vw,60px)" : Math.abs(z.angle) < 50 ? "clamp(36px,6vw,50px)" : "clamp(18px,3vw,26px)";
        const isActive = i === activeZone;
        return (
          <div key={z.label} style={{ position: "absolute", left: `${x}%`, bottom: yOffset, transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none", transition: "all 0.5s ease" }}>
            <span style={{ display: "block", fontSize: isActive ? "clamp(10px,1.4vw,13px)" : "clamp(9px,1.2vw,11px)", fontWeight: isActive ? 600 : 400, color: isActive ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.20)", fontFamily: "-apple-system, sans-serif", whiteSpace: "nowrap", transition: "all 0.5s ease" }}>{z.label}</span>
            {isActive && <span style={{ display: "block", fontSize: "clamp(8px,1vw,10px)", color: "rgba(255,255,255,0.35)", marginTop: "2px", fontFamily: "-apple-system, sans-serif" }}>{z.sub}</span>}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: "50%", bottom: 0, transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${needleAngle}deg)`, transition: "transform 1s cubic-bezier(0.34,1.1,0.64,1)" }}>
        <div style={{ width: "1px", height: "clamp(36px,6vw,52px)", background: "rgba(255,255,255,0.55)", marginLeft: "-0.5px" }} />
        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,0.85)", marginLeft: "-2px", marginTop: "-5px", boxShadow: "0 0 8px rgba(255,255,255,0.55)", position: "absolute", bottom: "clamp(34px,5.8vw,50px)" }} />
      </div>
    </div>
  );
}

function BBCRow({ value, label, bg, textColor, labelColor, animKey, rowCount }: { value: string; label: string; bg: string; textColor: string; labelColor: string; animKey: number; rowCount: number }) {
  const fs = `calc((100vh - 280px) / ${rowCount} * 0.72)`;
  return (
    <div style={{ flex: 1, position: "relative", background: bg, overflow: "hidden", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ position: "absolute", top: "clamp(8px,1.5vw,14px)", right: "clamp(16px,3vw,40px)", fontSize: "clamp(11px,1.4vw,15px)", fontWeight: 400, letterSpacing: "0.08em", textTransform: "capitalize", color: labelColor, fontFamily: "inherit", zIndex: 2 }}>{label}</span>
      <span key={animKey} style={{ fontSize: fs, fontWeight: 200, lineHeight: 1, letterSpacing: "-0.05em", color: textColor, textAlign: "center", userSelect: "none", fontFamily: "-apple-system, 'Helvetica Neue', sans-serif", animation: animKey > 0 ? "bbcSlideIn 0.30s cubic-bezier(0.2,0.8,0.2,1) both" : "none", display: "block", maxHeight: "100%" }}>{value}</span>
    </div>
  );
}

// ── FULLSCREEN TIMER ──────────────────────────────────────────────────────────
type FullscreenMode = "focus" | "break-ready" | "break-running";

function FullscreenTimer({
  timeLeft, duration, isRunning, isPaused, taskName, todayMinutes,
  mode, breakType, sessionsDone,
  shortBreakMins, longBreakMins,
  onClose, onComplete, onStop, onPause, onResume,
  onStartBreak, onSkipBreak, onEndBreak,
}: {
  timeLeft: number; duration: number; isRunning: boolean; isPaused: boolean;
  taskName: string; todayMinutes: number;
  mode: FullscreenMode; breakType: "short" | "long"; sessionsDone: number;
  shortBreakMins: number; longBreakMins: number;
  onClose: () => void; onComplete: () => void; onStop: () => void;
  onPause: () => void; onResume: () => void;
  onStartBreak: () => void; onSkipBreak: () => void; onEndBreak: () => void;
}) {
  const hours = Math.floor(timeLeft / 3600);
  const mins  = Math.floor((timeLeft % 3600) / 60);
  const secs  = timeLeft % 60;
  const progress = Math.max(0, Math.min(1, (duration * 60 - timeLeft) / (duration * 60)));
  const now = new Date();
  const showH = duration >= 60;
  const rowCount = showH ? 3 : 2;
  const isBreak = mode === "break-running";
  const isBreakReady = mode === "break-ready";
  const breakAcc = breakType === "long" ? "#34d399" : "#5ecf95";

  const [mKey, setMKey] = useState(0); const [sKey, setSKey] = useState(0); const [hKey, setHKey] = useState(0);
  const pm = useRef(mins); const ps = useRef(secs); const ph = useRef(hours);
  useEffect(() => {
    if (mins  !== pm.current) { setMKey(k => k + 1); pm.current = mins; }
    if (secs  !== ps.current) { setSKey(k => k + 1); ps.current = secs; }
    if (hours !== ph.current) { setHKey(k => k + 1); ph.current = hours; }
  }, [mins, secs, hours]);

  const minBg    = isBreak ? (isPaused ? "#1a2a1e" : "#1a2e22") : (isPaused ? "#2a2a1a" : "#eae8e2");
  const minText  = isBreak ? (isPaused ? `${breakAcc}80` : breakAcc) : (isPaused ? "rgba(245,166,35,0.7)" : "#1a1a1a");
  const minLabel = isBreak ? `${breakAcc}55` : (isPaused ? "rgba(245,166,35,0.35)" : "rgba(0,0,0,0.28)");
  const secText  = isBreak ? (isPaused ? `${breakAcc}60` : `${breakAcc}cc`) : (isPaused ? "rgba(245,166,35,0.5)" : "rgba(255,255,255,0.92)");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: isBreak ? "#091810" : "#0a0a0a", display: "flex", flexDirection: "column", fontFamily: "-apple-system, 'Helvetica Neue', sans-serif", overflow: "hidden", transition: "background 0.6s ease" }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "clamp(14px,2vw,24px) clamp(20px,4vw,48px) clamp(12px,1.5vw,20px)", background: isBreak ? "#0f2318" : "#2c2c2c", transition: "background 0.6s" }}>
        <div>
          <p style={{ fontSize: "clamp(14px,1.8vw,20px)", fontWeight: 500, color: isBreak ? breakAcc : "rgba(255,255,255,0.85)", margin: 0, letterSpacing: "-0.02em" }}>
            {isBreakReady ? `Session ${sessionsDone} complete!` : isBreak ? `${breakType === "long" ? "Long" : "Short"} break` : taskName}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
            <p style={{ fontSize: "clamp(11px,1.2vw,13px)", color: "rgba(255,255,255,0.30)", margin: 0 }}>
              {format(now, "EEEE, MMMM d")} · Today {todayMinutes}min
              {isPaused && !isBreakReady && <span style={{ color: "#f5a623", marginLeft: "8px" }}>· ⏸ Paused</span>}
            </p>
            <SessionDots completed={sessionsDone % SESSIONS_BEFORE_LONG_BREAK} color={isBreak ? breakAcc : "var(--accent)"} />
          </div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.48)", borderRadius: "100px", padding: "clamp(6px,1vw,9px) clamp(14px,2vw,20px)", fontSize: "clamp(11px,1.2vw,13px)", cursor: "pointer", fontFamily: "inherit" }}>✕ Exit</button>
      </div>
      <div style={{ height: "0.5px", background: isBreak ? `${breakAcc}33` : "rgba(255,255,255,0.10)", flexShrink: 0 }} />

      {/* Break-ready state */}
      {isBreakReady ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "32px", padding: "40px", background: isBreak ? "#091810" : "#0a0a0a" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(48px,8vw,80px)", marginBottom: "16px" }}>{breakType === "long" ? "🌿" : "☕"}</div>
            <p style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 300, color: breakAcc, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
              {breakType === "long" ? "Long break time!" : "Short break time!"}
            </p>
            <p style={{ fontSize: "clamp(13px,1.5vw,16px)", color: "rgba(255,255,255,0.35)", margin: 0 }}>
              {breakType === "long"
                ? `You've completed ${SESSIONS_BEFORE_LONG_BREAK} sessions — excellent work!`
                : "Take a breather before the next session."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={onStartBreak} style={{ background: breakAcc, color: "#0a0a0a", border: "none", borderRadius: "100px", padding: "clamp(12px,2vw,16px) clamp(32px,5vw,56px)", fontSize: "clamp(14px,1.6vw,17px)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {breakType === "long" ? `🌿 Start ${longBreakMins}-min break` : `☕ Start ${shortBreakMins}-min break`}
            </button>
            <button onClick={onSkipBreak} style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)", border: "0.5px solid rgba(255,255,255,0.16)", borderRadius: "100px", padding: "clamp(12px,2vw,16px) clamp(24px,3vw,40px)", fontSize: "clamp(13px,1.4vw,15px)", cursor: "pointer", fontFamily: "inherit" }}>Skip break →</button>
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)", margin: 0 }}>Adjust break durations in ⚙ Settings on the focus page</p>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {showH && (
              <>
                <BBCRow value={String(hours).padStart(2, "0")} label="H" bg="#363636" textColor="rgba(255,255,255,0.25)" labelColor="rgba(255,255,255,0.20)" animKey={hKey} rowCount={3} />
                <div style={{ height: "0.5px", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
              </>
            )}
            <BBCRow value={String(mins).padStart(2, "0")} label="Min" bg={minBg} textColor={minText} labelColor={minLabel} animKey={mKey} rowCount={rowCount} />
            <div style={{ height: "0.5px", background: "rgba(0,0,0,0.14)", flexShrink: 0 }} />
            <BBCRow value={String(secs).padStart(2, "0")} label="Sec" bg={isBreak ? "#0f1f15" : "#1a1a1a"} textColor={secText} labelColor="rgba(255,255,255,0.22)" animKey={sKey} rowCount={rowCount} />
          </div>
          <div style={{ height: "0.5px", background: "rgba(255,255,255,0.10)", flexShrink: 0 }} />
          {!isBreak && <CompassWheel progress={progress} />}
          <div style={{ flexShrink: 0, display: "flex", gap: "10px", justifyContent: "center", alignItems: "center", padding: "clamp(8px,1.5vw,12px) clamp(20px,4vw,48px) clamp(14px,2vw,22px)", background: isBreak ? "#0f2318" : "#1a1a1a", transition: "background 0.6s" }}>
            {isBreak ? (
              <button onClick={onEndBreak} style={{ background: breakAcc, color: "#0a0a0a", border: "none", borderRadius: "100px", padding: "clamp(10px,1.5vw,13px) clamp(28px,4vw,44px)", fontSize: "clamp(13px,1.4vw,15px)", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>✓ End break early</button>
            ) : isRunning ? (
              <>
                {isPaused ? (
                  <button onClick={onResume} style={{ background: "rgba(245,166,35,0.9)", color: "#0a0a0a", border: "none", borderRadius: "100px", padding: "clamp(10px,1.5vw,13px) clamp(28px,4vw,44px)", fontSize: "clamp(13px,1.4vw,15px)", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>▶ Resume</button>
                ) : (
                  <button onClick={onPause} style={{ background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.80)", border: "0.5px solid rgba(255,255,255,0.25)", borderRadius: "100px", padding: "clamp(10px,1.5vw,13px) clamp(28px,4vw,44px)", fontSize: "clamp(13px,1.4vw,15px)", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>⏸ Pause</button>
                )}
                <button onClick={onComplete} style={{ background: "rgba(255,255,255,0.88)", color: "#0a0a0a", border: "none", borderRadius: "100px", padding: "clamp(10px,1.5vw,13px) clamp(28px,4vw,44px)", fontSize: "clamp(13px,1.4vw,15px)", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>✓ Complete</button>
                <button onClick={onStop} style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)", border: "0.5px solid rgba(255,255,255,0.16)", borderRadius: "100px", padding: "clamp(10px,1.5vw,13px) clamp(22px,3vw,36px)", fontSize: "clamp(12px,1.3vw,14px)", cursor: "pointer", fontFamily: "inherit" }}>✕ Stop</button>
              </>
            ) : (
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: 0 }}>Start a session first</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function FocusPage() {
  const { todos } = useRealtimeTodos();

  const [duration, setDuration]             = useState(25);
  const [timeLeft, setTimeLeft]             = useState(25 * 60);
  const [isRunning, setIsRunning]           = useState(false);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [selectedTodo, setSelectedTodo]     = useState("");
  const [sessions, setSessions]             = useState<FocusSession[]>([]);
  const [fullscreen, setFullscreen]         = useState(false);
  const [isPaused, setIsPaused]             = useState(false);
  const [isStarting, setIsStarting]         = useState(false);

  // Pomodoro
  const [sessionsDone, setSessionsDone]     = useState(0);
  const [fullscreenMode, setFullscreenMode] = useState<FullscreenMode>("focus");
  const [shortBreakMins, setShortBreakMins] = useState(5);
  const [longBreakMins, setLongBreakMins]   = useState(15);
  const [breakTimeLeft, setBreakTimeLeft]   = useState(5 * 60);
  const [isBreakRunning, setIsBreakRunning] = useState(false);
  const [showSettings, setShowSettings]     = useState(false);

  // Manual log
  const [showManual, setShowManual]           = useState(false);
  const [manualDate, setManualDate]           = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualHour, setManualHour]           = useState("09");
  const [manualDuration, setManualDuration]   = useState(25);
  const [manualTodo, setManualTodo]           = useState("");
  const [manualCustomDur, setManualCustomDur] = useState("");
  const [savingManual, setSavingManual]       = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  // Refs
  const startedAtRef          = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);
  const totalMs               = useRef<number>(0);
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleCompleteRef     = useRef<() => void>(() => {});
  const breakStartedAtRef     = useRef<number>(0);
  const breakTotalMs          = useRef<number>(0);
  const breakIntervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleBreakDoneRef    = useRef<() => void>(() => {});

  useEffect(() => {
    fetchFocusSessions(30).then(setSessions).catch(() => {});
    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
    else setNotifPermission("unsupported");
  }, []);

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
    sessions.filter((s) => s.completed).forEach((s) => { const h = new Date(s.started_at).getHours(); hrs[h] = (hrs[h] || 0) + s.duration_minutes; });
    const best = Object.entries(hrs).sort(([, a], [, b]) => b - a)[0];
    return best ? `${Number(best[0]) % 12 || 12}${Number(best[0]) >= 12 ? "PM" : "AM"}` : "—";
  }, [sessions]);

  // ── Focus timer ────────────────────────────────────────────────────────────
  const startTicking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    startedAtRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed   = elapsedBeforePauseRef.current + (Date.now() - startedAtRef.current);
      const remaining = Math.max(0, totalMs.current - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) { clearInterval(intervalRef.current!); handleCompleteRef.current(); }
    }, 250);
  }, []);

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const session = await startFocusSession(selectedTodo || null, duration);
      setCurrentSession(session);
      totalMs.current = duration * 60 * 1000;
      elapsedBeforePauseRef.current = 0;
      setTimeLeft(duration * 60);
      setIsRunning(true);
      setFullscreenMode("focus");
      setFullscreen(true);
      startTicking();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: err?.message || "Failed to start — check connection", type: "error" } }));
    } finally { setIsStarting(false); }
  };

  const handleComplete = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false); setIsPaused(false);
    if (currentSession) {
      await completeFocusSession(currentSession.id);
      setSessions(await fetchFocusSessions(30));
    }
    setCurrentSession(null);
    const newDone = sessionsDone + 1;
    setSessionsDone(newDone);
    playFocusDone();
    vibrate([300, 100, 300, 100, 500]);
    const bType = newDone % SESSIONS_BEFORE_LONG_BREAK === 0 ? "long" : "short";
    const bMins = bType === "long" ? longBreakMins : shortBreakMins;
    sendNotification("Focus session complete! 🎯", bType === "long" ? `Long break (${longBreakMins}m) ready!` : `Short break (${shortBreakMins}m) ready!`);
    setBreakTimeLeft(bMins * 60);
    setFullscreenMode("break-ready");
  }, [currentSession, sessionsDone, shortBreakMins, longBreakMins]);

  handleCompleteRef.current = handleComplete;

  const handlePause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    elapsedBeforePauseRef.current += Date.now() - startedAtRef.current;
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => { setIsPaused(false); startTicking(); }, [startTicking]);

  const handleStop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false); setIsPaused(false); setFullscreen(false);
    setFullscreenMode("focus");
    elapsedBeforePauseRef.current = 0;
    setTimeLeft(duration * 60);
    setCurrentSession(null);
  }, [duration]);

  // ── Break timer ────────────────────────────────────────────────────────────
  const breakType: "short" | "long" = (sessionsDone + 1) % SESSIONS_BEFORE_LONG_BREAK === 0 ? "long" : "short";
  const currentBreakDuration = sessionsDone % SESSIONS_BEFORE_LONG_BREAK === 0 && sessionsDone > 0 ? longBreakMins : shortBreakMins;

  const startBreakTicking = useCallback(() => {
    if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
    breakStartedAtRef.current = Date.now();
    breakIntervalRef.current = setInterval(() => {
      const elapsed   = Date.now() - breakStartedAtRef.current;
      const remaining = Math.max(0, breakTotalMs.current - elapsed);
      setBreakTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) { clearInterval(breakIntervalRef.current!); handleBreakDoneRef.current(); }
    }, 250);
  }, []);

  const handleStartBreak = useCallback(() => {
    const bMins = sessionsDone % SESSIONS_BEFORE_LONG_BREAK === 0 && sessionsDone > 0 ? longBreakMins : shortBreakMins;
    breakTotalMs.current = bMins * 60 * 1000;
    setBreakTimeLeft(bMins * 60);
    setIsBreakRunning(true);
    setFullscreenMode("break-running");
    startBreakTicking();
  }, [sessionsDone, shortBreakMins, longBreakMins, startBreakTicking]);

  const handleBreakDone = useCallback(() => {
    if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
    setIsBreakRunning(false);
    setFullscreenMode("focus");
    playBreakDone();
    vibrate([500, 100, 200]);
    sendNotification("Break over! 💪", "Ready to focus again?");
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Break complete — ready to go! 💪", type: "success" } }));
    setTimeLeft(duration * 60);
    elapsedBeforePauseRef.current = 0;
  }, [duration]);

  handleBreakDoneRef.current = handleBreakDone;

  const handleSkipBreak = useCallback(() => {
    if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
    setIsBreakRunning(false);
    setFullscreenMode("focus");
    setTimeLeft(duration * 60);
    elapsedBeforePauseRef.current = 0;
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Break skipped!", type: "success" } }));
  }, [duration]);

  const handleEndBreakEarly = useCallback(() => {
    if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
    setIsBreakRunning(false);
    setFullscreenMode("focus");
    playBreakDone();
    setTimeLeft(duration * 60);
    elapsedBeforePauseRef.current = 0;
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Break ended — let's focus!", type: "success" } }));
  }, [duration]);

  const displayTimeLeft    = fullscreenMode === "break-running" ? breakTimeLeft : timeLeft;
  const displayDuration    = fullscreenMode === "break-running" ? currentBreakDuration : duration;
  const breakTypeForScreen: "short" | "long" = sessionsDone % SESSIONS_BEFORE_LONG_BREAK === 0 && sessionsDone > 0 ? "long" : "short";
  const mins = Math.floor(displayTimeLeft / 60);
  const secs = displayTimeLeft % 60;
  const selectedTask = todos.find((t) => t.id === selectedTodo);
  const taskName = selectedTask?.title ?? "Free focus";

  const handleManualLog = async () => {
    if (savingManual) return;
    const m = manualCustomDur ? parseInt(manualCustomDur) : manualDuration;
    if (!m || m < 1 || m > 480) { window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Duration must be 1–480 mins", type: "error" } })); return; }
    setSavingManual(true);
    try {
      const startedAt = new Date(`${manualDate}T${manualHour}:00:00`).toISOString();
      const endedAt   = new Date(new Date(`${manualDate}T${manualHour}:00:00`).getTime() + m * 60 * 1000).toISOString();
      const { error } = await supabase.from("focus_sessions").insert({ todo_id: manualTodo || null, duration_minutes: m, completed: true, started_at: startedAt, ended_at: endedAt });
      if (error) throw error;
      setSessions(await fetchFocusSessions(30));
      setShowManual(false); setManualCustomDur(""); setManualTodo("");
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Logged ${m}min session`, type: "success" } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: err?.message || "Failed to log", type: "error" } }));
    } finally { setSavingManual(false); }
  };

  return (
    <>
      {fullscreen && (
        <FullscreenTimer
          timeLeft={displayTimeLeft} duration={displayDuration}
          isRunning={isRunning} isPaused={isPaused}
          taskName={taskName} todayMinutes={todayMinutes}
          mode={fullscreenMode} breakType={breakTypeForScreen}
          sessionsDone={sessionsDone}
          shortBreakMins={shortBreakMins} longBreakMins={longBreakMins}
          onClose={() => { if (!isRunning && !isBreakRunning && fullscreenMode === "focus") setFullscreen(false); }}
          onComplete={handleComplete} onStop={handleStop}
          onPause={handlePause} onResume={handleResume}
          onStartBreak={handleStartBreak} onSkipBreak={handleSkipBreak}
          onEndBreak={handleEndBreakEarly}
        />
      )}

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto pb-32 md:pb-10">
        <header className="mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>Focus timer</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Today: {todayMinutes}min ({todaySessions} sessions) · Week: {weekMinutes}min</p>
                {sessionsDone > 0 && <SessionDots completed={sessionsDone % SESSIONS_BEFORE_LONG_BREAK} />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isRunning && (
                <button onClick={() => setFullscreen(true)} className="cc-btn px-3 py-2 text-xs" style={{ color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
                  <span style={{ position: "relative", zIndex: 3 }}>⛶ Focus mode</span>
                </button>
              )}
              <button onClick={() => setShowSettings(!showSettings)} className="cc-btn px-3 py-2 text-xs" style={{ color: showSettings ? "var(--accent)" : "var(--cc-text)" }}>
                <span style={{ position: "relative", zIndex: 3 }}>⚙ Settings</span>
              </button>
              <button onClick={() => setShowManual(!showManual)} className="cc-btn px-3 py-2 text-xs" style={{ color: showManual ? "var(--accent)" : "var(--cc-text)" }}>
                <span style={{ position: "relative", zIndex: 3 }}>{showManual ? "✕" : "+ Log past"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Settings panel */}
        {showSettings && (
          <div className="liquid-glass rounded-[22px] p-4 sm:p-5 mb-4 animate-slide-up">
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Pomodoro settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Short break — after each session</label>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {[3, 5, 7, 10].map((m) => (
                    <button key={m} onClick={() => setShortBreakMins(m)} className="px-3 py-2 text-xs font-mono rounded-[10px] transition-all"
                      style={{ background: shortBreakMins === m ? "var(--accent-muted)" : "var(--glass-fill)", color: shortBreakMins === m ? "var(--accent)" : "var(--text-muted)", border: `0.5px solid ${shortBreakMins === m ? "var(--accent-dim)" : "var(--glass-border)"}` }}>{m}m</button>
                  ))}
                  <input type="number" min="1" max="30" placeholder="custom"
                    className="w-16 rounded-[10px] px-2 py-2 text-xs font-mono focus:outline-none"
                    style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}
                    onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= 30) setShortBreakMins(v); }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Long break — after every 4 sessions</label>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {[10, 15, 20, 30].map((m) => (
                    <button key={m} onClick={() => setLongBreakMins(m)} className="px-3 py-2 text-xs font-mono rounded-[10px] transition-all"
                      style={{ background: longBreakMins === m ? "var(--accent-muted)" : "var(--glass-fill)", color: longBreakMins === m ? "var(--accent)" : "var(--text-muted)", border: `0.5px solid ${longBreakMins === m ? "var(--accent-dim)" : "var(--glass-border)"}` }}>{m}m</button>
                  ))}
                  <input type="number" min="5" max="60" placeholder="custom"
                    className="w-16 rounded-[10px] px-2 py-2 text-xs font-mono focus:outline-none"
                    style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}
                    onChange={(e) => { const v = parseInt(e.target.value); if (v >= 5 && v <= 60) setLongBreakMins(v); }} />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: "0.5px solid var(--glass-border-subtle)" }}>
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Browser notifications</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>Alerts when sessions end — works even in background tabs</p>
              </div>
              {notifPermission === "unsupported" && <span className="text-[10px] font-mono px-3 py-1.5 rounded-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>Not supported</span>}
              {notifPermission === "granted"     && <span className="text-[10px] font-mono px-3 py-1.5 rounded-[10px]" style={{ background: "rgba(94,207,149,0.12)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.25)" }}>✓ Enabled</span>}
              {notifPermission === "denied"      && <span className="text-[10px] font-mono px-3 py-1.5 rounded-[10px]" style={{ background: "rgba(248,65,65,0.10)", color: "#f87171" }}>Blocked in browser</span>}
              {notifPermission === "default"     && <button onClick={async () => { const ok = await requestNotificationPermission(); setNotifPermission(ok ? "granted" : "denied"); }} className="cc-btn cc-btn-accent px-4 py-2 text-xs"><span style={{ position: "relative", zIndex: 3 }}>Enable</span></button>}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Session counter</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {sessionsDone} done · {sessionsDone % SESSIONS_BEFORE_LONG_BREAK === 0 && sessionsDone > 0 ? "Long break due next" : `${SESSIONS_BEFORE_LONG_BREAK - (sessionsDone % SESSIONS_BEFORE_LONG_BREAK)} until long break`}
                </p>
              </div>
              <button onClick={() => setSessionsDone(0)} className="text-[10px] font-mono px-3 py-1.5 rounded-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>Reset</button>
            </div>
          </div>
        )}

        {/* Manual log */}
        {showManual && (
          <div className="liquid-glass rounded-[22px] p-4 sm:p-5 mb-4 animate-slide-up">
            <h2 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Log a past session</h2>
            <p className="text-[10px] font-mono mb-4" style={{ color: "var(--text-muted)" }}>Forgot to start the timer? Add any session from the past here.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Date</span>
                <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} max={format(new Date(), "yyyy-MM-dd")} className="w-full rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Time (hour)</span>
                <select value={manualHour} onChange={(e) => setManualHour(e.target.value)} className="w-full rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}>
                  {Array.from({ length: 24 }, (_, i) => { const h = String(i).padStart(2, "0"); return <option key={h} value={h}>{i === 0 ? 12 : i > 12 ? i - 12 : i}:00 {i < 12 ? "AM" : "PM"}</option>; })}
                </select>
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Duration</span>
                <div className="grid grid-cols-3 sm:flex gap-1">
                  {[25, 45, 60, 90, 120, 180].map((d) => (
                    <button key={d} onClick={() => { setManualDuration(d); setManualCustomDur(""); }} className="py-2 text-[9px] font-mono rounded-[10px] transition-all" style={{ background: manualDuration === d && !manualCustomDur ? "var(--accent-muted)" : "var(--bg-input)", color: manualDuration === d && !manualCustomDur ? "var(--accent)" : "var(--text-muted)", border: `0.5px solid ${manualDuration === d && !manualCustomDur ? "var(--accent-dim)" : "var(--glass-border)"}` }}>{d >= 60 ? `${d / 60}h` : `${d}m`}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Custom (mins)</span>
                <input type="number" min="1" max="480" value={manualCustomDur} onChange={(e) => setManualCustomDur(e.target.value)} placeholder="e.g. 110" className="w-full rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
              </div>
            </div>
            <div className="mb-3">
              <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Task (optional)</span>
              <select value={manualTodo} onChange={(e) => setManualTodo(e.target.value)} className="w-full rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <option value="">Free focus (no task)</option>
                {activeTodos.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                Logging: <span style={{ color: "var(--accent)" }}>{manualCustomDur ? `${manualCustomDur}m` : manualDuration >= 60 ? `${manualDuration / 60}h` : `${manualDuration}m`}</span>
                {" "}on <span style={{ color: "var(--text-secondary)" }}>{manualDate === format(new Date(), "yyyy-MM-dd") ? "today" : manualDate === format(subDays(new Date(), 1), "yyyy-MM-dd") ? "yesterday" : manualDate}</span>
                {" "}at <span style={{ color: "var(--text-secondary)" }}>{parseInt(manualHour) === 0 ? "12" : parseInt(manualHour) > 12 ? parseInt(manualHour) - 12 : parseInt(manualHour)}:00 {parseInt(manualHour) < 12 ? "AM" : "PM"}</span>
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
                <SplitflapClock mins={mins} secs={secs} isRunning={(isRunning || isBreakRunning) && !isPaused} accentColor={isBreakRunning ? "#5ecf95" : undefined} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <p style={{ fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase", color: isBreakRunning ? "#5ecf95" : isRunning ? (isPaused ? "#f5a623" : "var(--accent)") : "var(--text-muted)", transition: "color 0.3s", margin: 0 }}>
                    {isBreakRunning ? "on break" : isRunning ? (isPaused ? "paused" : "focusing") : "ready"}
                  </p>
                  {sessionsDone > 0 && <SessionDots completed={sessionsDone % SESSIONS_BEFORE_LONG_BREAK} />}
                </div>
              </div>

              {!isRunning && !isBreakRunning ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 sm:flex gap-2 justify-center mx-auto" style={{ maxWidth: "360px" }}>
                    {DURATIONS.map((d) => (
                      <button key={d} onClick={() => { setDuration(d); setTimeLeft(d * 60); }} className="cc-chip py-2.5 text-xs sm:text-sm relative z-10 px-3" style={{ color: duration === d ? "var(--accent)" : "var(--text-secondary)" }} data-active={duration === d}>
                        <span style={{ position: "relative", zIndex: 3 }}>{d >= 60 ? `${d / 60}h` : `${d}m`}</span>
                      </button>
                    ))}
                  </div>
                  <select value={selectedTodo} onChange={(e) => setSelectedTodo(e.target.value)} className="rounded-[14px] px-4 py-2.5 focus:outline-none w-full max-w-sm mx-auto block" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)", fontSize: "var(--text-sm)" }}>
                    <option value="">Free focus (no task)</option>
                    {activeTodos.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                  <button onClick={handleStart} disabled={isStarting} className="cc-btn cc-btn-accent px-12 py-3.5 text-sm disabled:opacity-60" style={{ minWidth: "160px", fontSize: "var(--text-md)" }}>
                    <span style={{ position: "relative", zIndex: 3 }}>{isStarting ? "Starting…" : "▶ Start"}</span>
                  </button>
                  {sessionsDone > 0 && (
                    <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                      Session {sessionsDone + 1} · Next break: {breakType === "long" ? `Long (${longBreakMins}m)` : `Short (${shortBreakMins}m)`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <button onClick={() => setFullscreen(true)} className="cc-btn px-4 py-2 text-xs" style={{ color: isBreakRunning ? "#5ecf95" : "var(--accent)", border: `0.5px solid ${isBreakRunning ? "rgba(94,207,149,0.35)" : "var(--accent-dim)"}` }}>
                      <span style={{ position: "relative", zIndex: 3 }}>⛶ {isBreakRunning ? "Break mode" : "Focus mode"}</span>
                    </button>
                  </div>
                  {isRunning && (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        {isPaused ? (
                          <button onClick={handleResume} className="cc-btn cc-btn-accent px-8 py-3 text-sm" style={{ minWidth: "130px" }}><span style={{ position: "relative", zIndex: 3 }}>▶ Resume</span></button>
                        ) : (
                          <button onClick={handlePause} className="cc-btn px-8 py-3 text-sm" style={{ minWidth: "130px", color: "var(--text-primary)", border: "0.5px solid var(--glass-border)" }}><span style={{ position: "relative", zIndex: 3 }}>⏸ Pause</span></button>
                        )}
                        <button onClick={handleComplete} className="cc-btn cc-btn-accent px-8 py-3 text-sm" style={{ minWidth: "130px" }}><span style={{ position: "relative", zIndex: 3 }}>✓ Complete</span></button>
                      </div>
                      <div><button onClick={handleStop} className="cc-btn cc-btn-danger px-8 py-2.5 text-xs" style={{ minWidth: "120px" }}><span style={{ position: "relative", zIndex: 3 }}>✕ Stop</span></button></div>
                    </>
                  )}
                  {isBreakRunning && (
                    <button onClick={handleEndBreakEarly} className="cc-btn px-8 py-3 text-sm" style={{ minWidth: "130px", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.35)" }}><span style={{ position: "relative", zIndex: 3 }}>✓ End break early</span></button>
                  )}
                </div>
              )}
            </div>

            <div className="liquid-glass rounded-[22px] p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Last 14 days</h2>
              <div className="flex items-end gap-1" style={{ height: "80px" }}>
                {dailyStats.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t transition-all duration-300" title={`${d.date}: ${d.minutes}min (${d.sessions} sessions)`} style={{ height: `${Math.max(2, (d.minutes / maxDayMinutes) * 64)}px`, background: d.minutes > 0 ? `linear-gradient(180deg, hsla(var(--accent-h),var(--accent-s),calc(var(--accent-l)+10%),0.9), var(--accent))` : "var(--glass-fill)", border: "0.5px solid var(--glass-border)", opacity: d.date === format(new Date(), "yyyy-MM-dd") ? 1 : 0.65, boxShadow: d.minutes > 0 ? "0 0 8px var(--accent-glow)" : "none" }} />
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
                  { label: "Today",          value: todayMinutes >= 60 ? `${Math.floor(todayMinutes/60)}h${todayMinutes%60>0?` ${todayMinutes%60}m`:""}` : `${todayMinutes}m`,         color: "#5ecf95" },
                  { label: "Yesterday",      value: yesterdayMinutes >= 60 ? `${Math.floor(yesterdayMinutes/60)}h${yesterdayMinutes%60>0?` ${yesterdayMinutes%60}m`:""}` : `${yesterdayMinutes}m`, color: "var(--text-secondary)" },
                  { label: "This week",      value: weekMinutes >= 60 ? `${Math.floor(weekMinutes/60)}h${weekMinutes%60>0?` ${weekMinutes%60}m`:""}` : `${weekMinutes}m`,             color: "#4da6ff" },
                  { label: "Daily average",  value: avgMinutes >= 60 ? `${Math.floor(avgMinutes/60)}h${avgMinutes%60>0?` ${avgMinutes%60}m`:""}` : `${avgMinutes}m`,               color: "#f5a623" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-mono" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                    <span className="text-xs sm:text-sm font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="liquid-glass rounded-[22px] p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Pomodoro</h2>
              <div className="space-y-2.5">
                {[
                  { label: "Short break", value: `${shortBreakMins}m`, color: "#5ecf95" },
                  { label: "Long break",  value: `${longBreakMins}m`,  color: "#4da6ff" },
                  { label: "Cycle",       value: `${SESSIONS_BEFORE_LONG_BREAK} sessions`, color: "var(--text-secondary)" },
                  { label: "This run",    value: `${sessionsDone} done`, color: sessionsDone > 0 ? "var(--accent)" : "var(--text-muted)" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                    <span className="text-xs font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
                {sessionsDone > 0 && (
                  <div className="pt-2" style={{ borderTop: "0.5px solid var(--glass-border-subtle)" }}>
                    <SessionDots completed={sessionsDone % SESSIONS_BEFORE_LONG_BREAK} />
                    <p className="text-[9px] font-mono mt-1.5" style={{ color: "var(--text-muted)" }}>
                      {SESSIONS_BEFORE_LONG_BREAK - (sessionsDone % SESSIONS_BEFORE_LONG_BREAK)} session{SESSIONS_BEFORE_LONG_BREAK - (sessionsDone % SESSIONS_BEFORE_LONG_BREAK) !== 1 ? "s" : ""} until long break
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="liquid-glass rounded-[22px] p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Recent</h2>
              {sessions.filter((s) => s.completed).length === 0 ? (
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>No sessions yet</p>
              ) : (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {sessions.filter((s) => s.completed).slice(0, 25).map((s) => {
                    const task = todos.find((t) => t.id === s.todo_id);
                    const sd = new Date(s.started_at);
                    const dateLabel = isToday(sd) ? "Today" : isYesterday(sd) ? "Yesterday" : format(sd, "MMM d");
                    return (
                      <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-[11px]" style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border-subtle)" }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#5ecf95" }} />
                          <span className="text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>{task ? task.title : "Free focus"}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs font-mono font-medium" style={{ color: "var(--accent)" }}>{s.duration_minutes}m</span>
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{dateLabel} {format(sd, "h:mma").toLowerCase()}</span>
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
