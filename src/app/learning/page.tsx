"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchLearningPhases, fetchLearningProgress, fetchLearningWeekProgress,
  toggleLearningTopic, toggleLearningWeek,
  upsertLearningPhase, deleteLearningPhase,
  type LearningPhase, type LearningProgress, type LearningWeekProgress,
  type LearningResource, type LearningTrack, type LearningWeek, type LearningPractice,
} from "@/lib/supabase";
import { RecycleBinModal } from "@/components/RecycleBinModal";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
type DoneMap = Record<string, boolean>;
type WeekMap = Record<string, boolean>;

const topicKey = (phaseId: number, ti: number, i: number) => `${phaseId}-${ti}-${i}`;
const weekKey  = (phaseId: number, wi: number)             => `${phaseId}-${wi}`;

function phasePct(phase: LearningPhase, done: DoneMap) {
  let total = 0, count = 0;
  phase.tracks.forEach((t, ti) => t.topics.forEach((_, i) => {
    total++;
    if (done[topicKey(phase.id, ti, i)]) count++;
  }));
  return total === 0 ? 0 : Math.round((count / total) * 100);
}
function overallPct(phases: LearningPhase[], done: DoneMap) {
  let total = 0, count = 0;
  phases.forEach((p) => p.tracks.forEach((t, ti) => t.topics.forEach((_, i) => {
    total++;
    if (done[topicKey(p.id, ti, i)]) count++;
  })));
  return total === 0 ? 0 : Math.round((count / total) * 100);
}
function weeksDonePct(phases: LearningPhase[], weeks: WeekMap) {
  let total = 0, count = 0;
  phases.forEach((p) => p.weeks.forEach((_, wi) => {
    total++;
    if (weeks[weekKey(p.id, wi)]) count++;
  }));
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// REALISTIC TIMELINE DATA
// phaseId maps each row to its DB learning_phase id
// ─────────────────────────────────────────────────────────────────────────────
const TIMELINE_ROWS = [
  { phase: "SQL + Data Engineering",   time: "3–4 weeks",  priority: "Start now",         dot: "#f87171", phaseId: 7  },
  { phase: "Stats + Probability",      time: "3–4 weeks",  priority: "High",              dot: "#f87171", phaseId: 8  },
  { phase: "Core ML",                  time: "8 weeks",    priority: "High",              dot: "#f87171", phaseId: 3  },
  { phase: "DSA for Interviews",       time: "15 months",  priority: "Never stop",        dot: "#f87171", phaseId: 2  },
  { phase: "Deep Learning",            time: "8 weeks",    priority: "Medium",            dot: "#fbbf24", phaseId: 4  },
  { phase: "Cloud — AWS / GCP",        time: "4–6 weeks",  priority: "Medium",            dot: "#fbbf24", phaseId: 9  },
  { phase: "MLOps + ML System Design", time: "6–8 weeks",  priority: "Medium",            dot: "#fbbf24", phaseId: 5  },
  { phase: "NLP / LLMs Expanded",      time: "4–6 weeks",  priority: "Medium",            dot: "#fbbf24", phaseId: 10 },
  { phase: "Portfolio + Interviews",   time: "6 weeks",    priority: "Last stretch",      dot: "#5ecf95", phaseId: 6  },
  { phase: "Python for ML",            time: "4 weeks",    priority: "Foundation",        dot: "#534AB7", phaseId: 1  },
];

// ─────────────────────────────────────────────────────────────────────────────
// REALISTIC TIMELINE MODAL  — click ⏱ in header
// ─────────────────────────────────────────────────────────────────────────────
function TimelineModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[62] flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[26px] flex flex-col animate-slide-up overflow-hidden"
        style={{
          background: "var(--cc-glass-base)",
          border: "0.5px solid rgba(94,207,149,0.30)",
          backdropFilter: "blur(56px) saturate(2.4)",
          boxShadow: "var(--shadow-xl), 0 0 80px rgba(94,207,149,0.10)",
          maxHeight: "92dvh",
        }}
      >
        <div className="flex justify-center pt-3 flex-shrink-0 sm:hidden">
          <div style={{ width: "36px", height: "4px", borderRadius: "100px", background: "#5ecf95", opacity: 0.4 }} />
        </div>
        <div style={{ height: "2.5px", background: "linear-gradient(90deg, #5ecf95, #5ecf9500)", flexShrink: 0 }} />

        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "#5ecf95" }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Realistic Timeline</h2>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>18–22 months → Google · Microsoft · Amazon</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ color: "var(--cc-text-muted)", fontSize: "18px", background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-5" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-0">
            <div className="contents">
              {["Phase", "Time needed", "Priority"].map((h) => (
                <div key={h} className="pb-2 mb-1" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</span>
                </div>
              ))}
            </div>
            {TIMELINE_ROWS.map((row, i) => (
              <div key={i} className="contents">
                <div className="py-2.5 flex items-center" style={{ borderBottom: i < TIMELINE_ROWS.length - 1 ? "0.5px solid var(--glass-border-subtle)" : "none" }}>
                  <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{row.phase}</span>
                </div>
                <div className="py-2.5 flex items-center justify-end" style={{ borderBottom: i < TIMELINE_ROWS.length - 1 ? "0.5px solid var(--glass-border-subtle)" : "none" }}>
                  <span className="text-[11px] font-mono whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{row.time}</span>
                </div>
                <div className="py-2.5 flex items-center gap-1.5 justify-end" style={{ borderBottom: i < TIMELINE_ROWS.length - 1 ? "0.5px solid var(--glass-border-subtle)" : "none" }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.dot }} />
                  <span className="text-[11px] font-mono whitespace-nowrap" style={{ color: row.dot }}>{row.priority}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 px-3 py-2.5 rounded-[12px]" style={{ background: "rgba(94,207,149,0.07)", border: "0.5px solid rgba(94,207,149,0.20)" }}>
            <p className="text-[10px] font-mono" style={{ color: "#5ecf95", lineHeight: 1.6 }}>
              💡 Start SQL now — your Power BI background means you are already close. 3–4 weeks gets you interview-ready.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: "0.5px solid var(--glass-border-subtle)" }}>
          <button onClick={onClose} className="w-full py-3 text-sm font-medium rounded-[16px] transition-all"
            style={{ background: "rgba(94,207,149,0.12)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.28)" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE INFO MODAL  — click ⓘ on any phase card
// Shows: progress ring · milestone · stats · tracks · week plan ·
//        FULL realistic timeline (current phase highlighted) · resources
// ─────────────────────────────────────────────────────────────────────────────
interface PhaseInfoModalProps {
  phase: LearningPhase;
  phaseIndex: number;
  pct: number;
  doneTopics: number;
  totalTopics: number;
  doneWeeks: number;
  totalWeeks: number;
  onClose: () => void;
}

function PhaseInfoModal({ phase, phaseIndex, pct, doneTopics, totalTopics, doneWeeks, totalWeeks, onClose }: PhaseInfoModalProps) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div
      className="fixed inset-0 z-[62] flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[26px] flex flex-col animate-slide-up overflow-hidden"
        style={{
          background: "var(--cc-glass-base)",
          border: `0.5px solid ${phase.accent_color}45`,
          backdropFilter: "blur(56px) saturate(2.4)",
          boxShadow: `var(--shadow-xl), 0 0 80px ${phase.accent_color}18`,
          maxHeight: "92dvh",
        }}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 flex-shrink-0 sm:hidden">
          <div style={{ width: "36px", height: "4px", borderRadius: "100px", background: phase.accent_color, opacity: 0.35 }} />
        </div>

        {/* Top accent stripe */}
        <div style={{ height: "2.5px", background: `linear-gradient(90deg, ${phase.accent_color}, ${phase.accent_color}00)`, flexShrink: 0 }} />

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: phase.bg_color, color: phase.text_color, border: `0.5px solid ${phase.accent_color}35` }}>
                  Phase {phaseIndex + 1}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "var(--glass-fill-deep)", color: "var(--text-muted)", border: "0.5px solid var(--glass-border-subtle)" }}>
                  {phase.duration}
                </span>
                {pct === 100 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(94,207,149,0.14)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.28)" }}>
                    ✓ Completed
                  </span>
                )}
              </div>
              <h2 className="text-[18px] font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{phase.title}</h2>
            </div>

            {/* Circular progress ring */}
            <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
              <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)", display: "block" }}>
                <circle cx="44" cy="44" r={r} fill="none" stroke={`${phase.accent_color}1a`} strokeWidth="6" />
                <circle cx="44" cy="44" r={r} fill="none" stroke={phase.accent_color} strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-bold font-mono leading-none" style={{ color: phase.accent_color }}>{pct}%</span>
                <span className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>topics</span>
              </div>
            </div>
          </div>

          {/* Milestone banner */}
          <div className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-[14px]"
            style={{ background: phase.bg_color, border: `0.5px solid ${phase.accent_color}28` }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
              style={{ color: phase.text_color, flexShrink: 0 }}>
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
            <span className="text-[11px] font-medium" style={{ color: phase.text_color }}>Milestone: {phase.milestone}</span>
          </div>
        </div>

        {/* Stats chips */}
        <div className="grid grid-cols-4 gap-1.5 px-5 mb-3 flex-shrink-0">
          {[
            { label: "Topics", val: `${doneTopics}/${totalTopics}`, color: phase.accent_color },
            { label: "Weeks",  val: `${doneWeeks}/${totalWeeks}`,   color: "#5ecf95" },
            { label: "Tracks", val: `${phase.tracks.length}`,       color: phase.text_color },
            { label: "Links",  val: `${phase.resources.length}`,    color: "#d4924a" },
          ].map((s) => (
            <div key={s.label} className="rounded-[13px] px-2 py-2.5 text-center"
              style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
              <div className="text-[15px] font-bold font-mono leading-none" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5" style={{ WebkitOverflowScrolling: "touch" }}>

          {/* Tracks */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Topics by track</p>
            <div className="space-y-1.5">
              {phase.tracks.map((track, ti) => (
                <div key={ti} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5"
                  style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phase.accent_color, opacity: 0.7 }} />
                  <span className="text-[11px] font-medium flex-1 truncate" style={{ color: phase.text_color }}>{track.label}</span>
                  <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {track.topics.length} topics
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Week timeline */}
          {phase.weeks.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Week-by-week plan</p>
              <div className="space-y-2">
                {phase.weeks.map((week, wi) => (
                  <div key={wi} className="rounded-[13px] overflow-hidden"
                    style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                    <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold font-mono"
                        style={{ background: `${phase.accent_color}1a`, color: phase.text_color, border: `0.5px solid ${phase.accent_color}35` }}>
                        {wi + 1}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>{week.label}</span>
                    </div>
                    <div className="px-3 py-2 space-y-1">
                      {week.goals.map((goal, gi) => (
                        <div key={gi} className="flex items-start gap-2">
                          <span className="text-[10px] mt-0.5 flex-shrink-0" style={{ color: phase.accent_color }}>›</span>
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)", lineHeight: 1.55 }}>{goal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Realistic Timeline — full table, current phase highlighted ── */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ color: "var(--text-muted)" }}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Realistic Timeline — where this phase fits
              </p>
            </div>
            <div className="rounded-[14px] overflow-hidden"
              style={{ border: `0.5px solid ${phase.accent_color}35`, background: "var(--glass-fill-deep)" }}>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2"
                style={{ borderBottom: "0.5px solid var(--glass-border-subtle)", background: "var(--glass-fill)" }}>
                {["Phase", "Time needed", "Priority"].map((h) => (
                  <span key={h} className="text-[9px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}>{h}</span>
                ))}
              </div>
              {/* All rows — current phase highlighted with accent bar + bg */}
              {TIMELINE_ROWS.map((row, i) => {
                const isThis = row.phaseId === phase.id;
                return (
                  <div key={i}
                    className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2.5 items-center"
                    style={{
                      borderBottom: i < TIMELINE_ROWS.length - 1 ? "0.5px solid var(--glass-border-subtle)" : "none",
                      background: isThis ? `${phase.accent_color}18` : "transparent",
                    }}>
                    {/* Phase name + highlight bar */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-[3px] rounded-full flex-shrink-0"
                        style={{ height: "18px", background: isThis ? phase.accent_color : "transparent" }} />
                      <span className="text-[11px] font-mono truncate"
                        style={{ color: isThis ? phase.text_color : "var(--text-secondary)", fontWeight: isThis ? 600 : 400 }}>
                        {row.phase}
                      </span>
                    </div>
                    {/* Time */}
                    <span className="text-[10px] font-mono whitespace-nowrap text-right"
                      style={{ color: isThis ? "var(--text-secondary)" : "var(--text-muted)" }}>
                      {row.time}
                    </span>
                    {/* Priority dot + label */}
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: row.dot }} />
                      <span className="text-[10px] font-mono whitespace-nowrap font-medium" style={{ color: row.dot }}>
                        {row.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resources */}
          {phase.resources.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Resources & links</p>
              <div className="flex flex-wrap gap-1.5">
                {phase.resources.map((r) => (
                  r.url
                    ? <a key={r.label} href={r.url} target="_blank" rel="noopener"
                        className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-2 rounded-[11px] transition-all hover:opacity-75"
                        style={{ background: `${phase.accent_color}14`, color: phase.text_color, border: `0.5px solid ${phase.accent_color}30`, textDecoration: "none" }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        {r.label}
                      </a>
                    : <span key={r.label} className="text-[10px] font-mono px-3 py-2 rounded-[11px]"
                        style={{ background: "var(--glass-fill-deep)", color: "var(--text-muted)", border: "0.5px solid var(--glass-border-subtle)" }}>
                        {r.label}
                      </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer close button */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: "0.5px solid var(--glass-border-subtle)" }}>
          <button onClick={onClose}
            className="w-full py-3 text-sm font-medium rounded-[16px] transition-all"
            style={{ background: `${phase.accent_color}16`, color: phase.text_color, border: `0.5px solid ${phase.accent_color}32` }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT PHASE MODAL
// ─────────────────────────────────────────────────────────────────────────────
const ACCENT_PRESETS = [
  { accent: "#534AB7", bg: "rgba(83,74,183,0.13)",  text: "#a09aee" },
  { accent: "#185FA5", bg: "rgba(24,95,165,0.13)",  text: "#6aaee8" },
  { accent: "#0F6E56", bg: "rgba(15,110,86,0.13)",  text: "#4ecfa0" },
  { accent: "#993C1D", bg: "rgba(153,60,29,0.13)",  text: "#e8895a" },
  { accent: "#854F0B", bg: "rgba(133,79,11,0.13)",  text: "#d4924a" },
  { accent: "#993556", bg: "rgba(153,53,86,0.13)",  text: "#e07fa0" },
  { accent: "#1D6B8C", bg: "rgba(29,107,140,0.13)", text: "#56c3e8" },
  { accent: "#5A3B8C", bg: "rgba(90,59,140,0.13)",  text: "#b088ef" },
];

interface EditPhaseModalProps {
  phase: Partial<LearningPhase> | null;
  onSave: (p: Partial<LearningPhase>) => Promise<void>;
  onClose: () => void;
}

function EditPhaseModal({ phase, onSave, onClose }: EditPhaseModalProps) {
  const isNew = !phase?.id;
  const [saving, setSaving] = useState(false);
  const [title, setTitle]         = useState(phase?.title ?? "");
  const [duration, setDuration]   = useState(phase?.duration ?? "");
  const [milestone, setMilestone] = useState(phase?.milestone ?? "");
  const [accentColor, setAccentColor] = useState(phase?.accent_color ?? "#534AB7");
  const [bgColor, setBgColor]     = useState(phase?.bg_color ?? "rgba(83,74,183,0.13)");
  const [textColor, setTextColor] = useState(phase?.text_color ?? "#a09aee");
  const [resources, setResources]     = useState<LearningResource[]>(phase?.resources ?? []);
  const [newResLabel, setNewResLabel] = useState("");
  const [newResUrl, setNewResUrl]     = useState("");
  const [tracks, setTracks]     = useState<LearningTrack[]>(phase?.tracks ?? [{ label: "", topics: [] }]);
  const [weeks, setWeeks]       = useState<LearningWeek[]>(phase?.weeks ?? [{ label: "", goals: [] }]);
  const [practice, setPractice] = useState<LearningPractice[]>(phase?.practice ?? [{ title: "", problems: [] }]);
  const [modalTab, setModalTab] = useState<"basic" | "topics" | "weeks" | "practice">("basic");

  const applyPreset = (p: typeof ACCENT_PRESETS[0]) => { setAccentColor(p.accent); setBgColor(p.bg); setTextColor(p.text); };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ ...(phase?.id ? { id: phase.id } : {}), title: title.trim(), duration: duration.trim(), milestone: milestone.trim(), accent_color: accentColor, bg_color: bgColor, text_color: textColor, resources, tracks: tracks.filter((t) => t.label.trim()), weeks: weeks.filter((w) => w.label.trim()), practice: practice.filter((p) => p.title.trim()) });
      onClose();
    } catch { setSaving(false); }
  };

  const addTrack = () => setTracks((p) => [...p, { label: "", topics: [] }]);
  const removeTrack = (i: number) => setTracks((p) => p.filter((_, idx) => idx !== i));
  const updateTrackLabel = (i: number, v: string) => setTracks((p) => p.map((t, idx) => idx === i ? { ...t, label: v } : t));
  const addTopic = (ti: number, v: string) => { if (!v.trim()) return; setTracks((p) => p.map((t, idx) => idx === ti ? { ...t, topics: [...t.topics, v.trim()] } : t)); };
  const removeTopic = (ti: number, i: number) => setTracks((p) => p.map((t, idx) => idx === ti ? { ...t, topics: t.topics.filter((_, ii) => ii !== i) } : t));
  const addWeek = () => setWeeks((p) => [...p, { label: "", goals: [] }]);
  const removeWeek = (i: number) => setWeeks((p) => p.filter((_, idx) => idx !== i));
  const updateWeekLabel = (i: number, v: string) => setWeeks((p) => p.map((w, idx) => idx === i ? { ...w, label: v } : w));
  const addGoal = (wi: number, v: string) => { if (!v.trim()) return; setWeeks((p) => p.map((w, idx) => idx === wi ? { ...w, goals: [...w.goals, v.trim()] } : w)); };
  const removeGoal = (wi: number, gi: number) => setWeeks((p) => p.map((w, idx) => idx === wi ? { ...w, goals: w.goals.filter((_, ii) => ii !== gi) } : w));
  const addPracticeSet = () => setPractice((p) => [...p, { title: "", problems: [] }]);
  const removePracticeSet = (i: number) => setPractice((p) => p.filter((_, idx) => idx !== i));
  const updatePracticeTitle = (i: number, v: string) => setPractice((p) => p.map((s, idx) => idx === i ? { ...s, title: v } : s));
  const addProblem = (si: number, v: string) => { if (!v.trim()) return; setPractice((p) => p.map((s, idx) => idx === si ? { ...s, problems: [...s.problems, v.trim()] } : s)); };
  const removeProblem = (si: number, pi: number) => setPractice((p) => p.map((s, idx) => idx === si ? { ...s, problems: s.problems.filter((_, ii) => ii !== pi) } : s));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-2xl rounded-t-[28px] sm:rounded-[24px] flex flex-col animate-slide-up"
        style={{ background: "var(--cc-glass-base)", border: "0.5px solid var(--cc-tile-border)", backdropFilter: "blur(48px) saturate(2.2)", boxShadow: "var(--shadow-xl)", maxHeight: "92dvh", overflow: "hidden" }}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div style={{ width: "36px", height: "4px", borderRadius: "100px", background: "var(--cc-text-muted)", opacity: 0.4 }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{isNew ? "Add new phase" : `Edit — ${phase?.title}`}</h3>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>Saved to Supabase</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ color: "var(--cc-text-muted)", fontSize: "18px", background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>×</button>
        </div>
        <div className="flex gap-1 px-5 pt-3 flex-shrink-0">
          {(["basic", "topics", "weeks", "practice"] as const).map((t) => (
            <button key={t} onClick={() => setModalTab(t)}
              className="px-3 py-2 text-[11px] font-medium rounded-xl capitalize transition-all"
              style={{ background: modalTab === t ? `${accentColor}22` : "transparent", color: modalTab === t ? accentColor : "var(--text-muted)", border: `0.5px solid ${modalTab === t ? accentColor + "44" : "transparent"}` }}>
              {t}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4" style={{ WebkitOverflowScrolling: "touch" }}>
          {modalTab === "basic" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Phase title *</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Python for ML" className="w-full rounded-[14px] px-3 py-2.5 text-sm focus:outline-none font-mono" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Duration</label>
                  <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. ~4 weeks" className="w-full rounded-[14px] px-3 py-2.5 text-sm focus:outline-none font-mono" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Milestone</label>
                <input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="e.g. Solve 30 LeetCode Easy" className="w-full rounded-[14px] px-3 py-2.5 text-sm focus:outline-none font-mono" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Color theme</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {ACCENT_PRESETS.map((p) => (
                    <button key={p.accent} onClick={() => applyPreset(p)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                      style={{ background: p.accent, boxShadow: accentColor === p.accent ? `0 0 0 2px white, 0 0 0 3px ${p.accent}` : "none", transform: accentColor === p.accent ? "scale(1.15)" : "scale(1)" }}>
                      {accentColor === p.accent && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-5"/></svg>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Resources</label>
                <div className="space-y-1.5 mb-2">
                  {resources.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-[12px]" style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                      <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                      <span className="text-[10px] font-mono truncate max-w-[120px]" style={{ color: "var(--text-muted)" }}>{r.url || "no url"}</span>
                      <button onClick={() => setResources((p) => p.filter((_, ii) => ii !== i))} style={{ color: "#f87171", fontSize: "14px", flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newResLabel} onChange={(e) => setNewResLabel(e.target.value)} placeholder="Label" className="flex-1 rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
                  <input value={newResUrl} onChange={(e) => setNewResUrl(e.target.value)} placeholder="URL (optional)" className="flex-1 rounded-[12px] px-3 py-2 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}
                    onKeyDown={(e) => { if (e.key === "Enter" && newResLabel.trim()) { setResources((p) => [...p, { label: newResLabel.trim(), url: newResUrl.trim() }]); setNewResLabel(""); setNewResUrl(""); } }} />
                  <button onClick={() => { if (!newResLabel.trim()) return; setResources((p) => [...p, { label: newResLabel.trim(), url: newResUrl.trim() }]); setNewResLabel(""); setNewResUrl(""); }}
                    disabled={!newResLabel.trim()} className="px-3 py-2 text-xs font-medium rounded-[12px] flex-shrink-0 disabled:opacity-30"
                    style={{ background: `${accentColor}22`, color: accentColor, border: `0.5px solid ${accentColor}44` }}>+ Add</button>
                </div>
              </div>
            </>
          )}
          {modalTab === "topics" && (
            <div className="space-y-4">
              {tracks.map((track, ti) => (
                <div key={ti} className="rounded-[16px] overflow-hidden" style={{ border: "0.5px solid var(--glass-border-subtle)", background: "var(--glass-fill-deep)" }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                    <input value={track.label} onChange={(e) => updateTrackLabel(ti, e.target.value)} placeholder="Track name..." className="flex-1 bg-transparent text-xs font-semibold focus:outline-none" style={{ color: accentColor }} />
                    {tracks.length > 1 && <button onClick={() => removeTrack(ti)} style={{ color: "#f87171", fontSize: "14px" }}>×</button>}
                  </div>
                  <div className="px-4 py-2 space-y-1">
                    {track.topics.map((topic, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accentColor + "80" }} />
                        <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{topic}</span>
                        <button onClick={() => removeTopic(ti, i)} style={{ color: "#f87171", fontSize: "13px", flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                    <InlineAdder placeholder="Add topic (Enter)" accentColor={accentColor} onAdd={(v) => addTopic(ti, v)} />
                  </div>
                </div>
              ))}
              <button onClick={addTrack} className="w-full py-2.5 text-xs font-medium rounded-[14px]"
                style={{ background: `${accentColor}12`, color: accentColor, border: `0.5px solid ${accentColor}35` }}>+ Add track</button>
            </div>
          )}
          {modalTab === "weeks" && (
            <div className="space-y-3">
              {weeks.map((week, wi) => (
                <div key={wi} className="rounded-[16px] overflow-hidden" style={{ border: "0.5px solid var(--glass-border-subtle)", background: "var(--glass-fill-deep)" }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                    <input value={week.label} onChange={(e) => updateWeekLabel(wi, e.target.value)} placeholder="Week label..." className="flex-1 bg-transparent text-xs font-semibold focus:outline-none" style={{ color: accentColor }} />
                    {weeks.length > 1 && <button onClick={() => removeWeek(wi)} style={{ color: "#f87171", fontSize: "14px" }}>×</button>}
                  </div>
                  <div className="px-4 py-2 space-y-1">
                    {week.goals.map((goal, gi) => (
                      <div key={gi} className="flex items-start gap-2 py-1">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: accentColor + "80" }} />
                        <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{goal}</span>
                        <button onClick={() => removeGoal(wi, gi)} style={{ color: "#f87171", fontSize: "13px", flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                    <InlineAdder placeholder="Add goal (Enter)" accentColor={accentColor} onAdd={(v) => addGoal(wi, v)} />
                  </div>
                </div>
              ))}
              <button onClick={addWeek} className="w-full py-2.5 text-xs font-medium rounded-[14px]"
                style={{ background: `${accentColor}12`, color: accentColor, border: `0.5px solid ${accentColor}35` }}>+ Add week</button>
            </div>
          )}
          {modalTab === "practice" && (
            <div className="space-y-4">
              {practice.map((set, si) => (
                <div key={si} className="rounded-[16px] overflow-hidden" style={{ border: "0.5px solid var(--glass-border-subtle)", background: "var(--glass-fill-deep)" }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                    <input value={set.title} onChange={(e) => updatePracticeTitle(si, e.target.value)} placeholder="Set name..." className="flex-1 bg-transparent text-xs font-semibold focus:outline-none" style={{ color: accentColor }} />
                    {practice.length > 1 && <button onClick={() => removePracticeSet(si)} style={{ color: "#f87171", fontSize: "14px" }}>×</button>}
                  </div>
                  <div className="px-4 py-2 space-y-1">
                    {set.problems.map((prob, pi) => (
                      <div key={pi} className="flex items-start gap-2 py-1">
                        <span className="text-[10px] font-mono w-4 text-right flex-shrink-0 mt-0.5" style={{ color: accentColor + "80" }}>{pi + 1}.</span>
                        <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{prob}</span>
                        <button onClick={() => removeProblem(si, pi)} style={{ color: "#f87171", fontSize: "13px", flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                    <InlineAdder placeholder="Add problem (Enter)" accentColor={accentColor} onAdd={(v) => addProblem(si, v)} />
                  </div>
                </div>
              ))}
              <button onClick={addPracticeSet} className="w-full py-2.5 text-xs font-medium rounded-[14px]"
                style={{ background: `${accentColor}12`, color: accentColor, border: `0.5px solid ${accentColor}35` }}>+ Add practice set</button>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop: "0.5px solid var(--glass-border-subtle)" }}>
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="flex-1 py-3 text-sm font-medium rounded-[16px] disabled:opacity-30 transition-all"
            style={{ background: accentColor, color: "#fff" }}>
            {saving ? "Saving…" : isNew ? "Create phase" : "Save changes"}
          </button>
          <button onClick={onClose} className="px-5 py-3 text-xs rounded-[16px]"
            style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function InlineAdder({ placeholder, accentColor, onAdd }: { placeholder: string; accentColor: string; onAdd: (v: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => { if (!val.trim()) return; onAdd(val); setVal(""); };
  return (
    <div className="flex gap-1.5 mt-2">
      <input value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder={placeholder}
        className="flex-1 rounded-[10px] px-3 py-2 text-xs font-mono focus:outline-none"
        style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
      <button onClick={submit} disabled={!val.trim()}
        className="px-3 py-2 text-[10px] font-medium rounded-[10px] flex-shrink-0 disabled:opacity-30"
        style={{ background: `${accentColor}18`, color: accentColor, border: `0.5px solid ${accentColor}35` }}>+</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function LearningPage() {
  const [phases, setPhases]       = useState<LearningPhase[]>([]);
  const [done, setDone]           = useState<DoneMap>({});
  const [weeksMap, setWeeksMap]   = useState<WeekMap>({});
  const [loading, setLoading]     = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [openPhase, setOpenPhase]   = useState<number | null>(null);
  const initialLoadDone = useRef(false); // prevents auto-opening Python on every loadAll() call
  const [tabMap, setTabMap]         = useState<Record<number, "topics" | "weeks" | "practice">>({});
  const [editPhase, setEditPhase]   = useState<Partial<LearningPhase> | null | false>(false);
  const [infoPhase, setInfoPhase]   = useState<LearningPhase | null>(null);
  const [showBin, setShowBin]         = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const [deleteStep, setDeleteStep]       = useState<Record<number, 1 | 2>>({});
  const [pendingDelete, setPendingDelete] = useState<LearningPhase | null>(null);
  const [undoProgress, setUndoProgress]   = useState(100);
  const deleteTimerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const deleteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    const [p, tp, wp] = await Promise.all([fetchLearningPhases(), fetchLearningProgress(), fetchLearningWeekProgress()]);
    setPhases(p);
    const dm: DoneMap = {};
    tp.forEach((r: LearningProgress) => { if (r.is_done) dm[topicKey(r.phase_id, r.track_index, r.topic_index)] = true; });
    setDone(dm);
    const wm: WeekMap = {};
    wp.forEach((r: LearningWeekProgress) => { if (r.is_done) wm[weekKey(r.phase_id, r.week_index)] = true; });
    setWeeksMap(wm);
    // Only on the very first load — start with everything collapsed, let the user open what they want
    if (!initialLoadDone.current && p.length > 0) {
      setOpenPhase(null);
      initialLoadDone.current = true;
    }
  }, []); // eslint-disable-line

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, [loadAll]);

  const handleTopicToggle = useCallback(async (phaseId: number, ti: number, i: number) => {
    const key = topicKey(phaseId, ti, i);
    const cur = !!done[key];
    setDone((p) => ({ ...p, [key]: !cur }));
    setSavingKey(key);
    try { await toggleLearningTopic(phaseId, ti, i, cur); }
    catch { setDone((p) => ({ ...p, [key]: cur })); window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Save failed", type: "error" } })); }
    finally { setSavingKey(null); }
  }, [done]);

  const handleWeekToggle = useCallback(async (phaseId: number, wi: number) => {
    const key = weekKey(phaseId, wi);
    const cur = !!weeksMap[key];
    setWeeksMap((p) => ({ ...p, [key]: !cur }));
    setSavingKey(key);
    try { await toggleLearningWeek(phaseId, wi, cur); }
    catch { setWeeksMap((p) => ({ ...p, [key]: cur })); window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Save failed", type: "error" } })); }
    finally { setSavingKey(null); }
  }, [weeksMap]);

  const handleSavePhase = async (payload: Partial<LearningPhase>) => {
    // New phase — assign sort_order = max existing + 1 so it always goes to the END of the list
    if (!payload.id) {
      const maxOrder = phases.length > 0 ? Math.max(...phases.map((p) => p.sort_order ?? 0)) : 0;
      payload = { ...payload, sort_order: maxOrder + 1 };
    }
    await upsertLearningPhase(payload);
    await loadAll();
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: payload.id ? "Phase updated" : "Phase created", type: "success" } }));
  };

  const handleDeleteStep1 = (phase: LearningPhase) => {
    if (deleteStep[phase.id] === 1) { setDeleteStep((p) => { const n = { ...p }; delete n[phase.id]; return n; }); return; }
    clearDeleteTimers(); setPendingDelete(null); setDeleteStep({ [phase.id]: 1 });
  };
  const handleDeleteStep2 = (phase: LearningPhase) => {
    clearDeleteTimers(); setPendingDelete(phase); setDeleteStep((p) => ({ ...p, [phase.id]: 2 })); setUndoProgress(100);
    let pct = 100;
    deleteIntervalRef.current = setInterval(() => { pct -= 2; setUndoProgress(Math.max(0, pct)); if (pct <= 0 && deleteIntervalRef.current) clearInterval(deleteIntervalRef.current); }, 100);
    deleteTimerRef.current = setTimeout(async () => {
      clearDeleteTimers(); await deleteLearningPhase(phase.id); setPendingDelete(null);
      setDeleteStep((p) => { const n = { ...p }; delete n[phase.id]; return n; });
      await loadAll();
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `"${phase.title}" deleted`, type: "success" } }));
    }, 5000);
  };
  const handleDeleteUndo = () => {
    clearDeleteTimers();
    if (pendingDelete) setDeleteStep((p) => { const n = { ...p }; delete n[pendingDelete.id]; return n; });
    setPendingDelete(null); setUndoProgress(100);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Delete cancelled", type: "success" } }));
  };
  const handleCancelDelete = (phaseId: number) => {
    clearDeleteTimers(); setPendingDelete(null); setUndoProgress(100);
    setDeleteStep((p) => { const n = { ...p }; delete n[phaseId]; return n; });
  };
  const clearDeleteTimers = () => {
    if (deleteTimerRef.current)    clearTimeout(deleteTimerRef.current);
    if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
    deleteTimerRef.current = null; deleteIntervalRef.current = null;
  };

  const getTab = (id: number) => tabMap[id] ?? "topics";
  const setPhaseTab = (id: number, t: "topics" | "weeks" | "practice") => setTabMap((p) => ({ ...p, [id]: t }));

  const overall    = overallPct(phases, done);
  const wksDone    = weeksDonePct(phases, weeksMap);
  const totalTopics = phases.reduce((s, p) => s + p.tracks.reduce((ss, t) => ss + t.topics.length, 0), 0);
  const doneTopics  = Object.values(done).filter(Boolean).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">

      {/* ── HEADER ── */}
      <header className="mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              ML/DS Learning Roadmap
            </h1>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              {phases.length} phases · Python + ML + DSA + MLOps → Top MNC
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex items-baseline gap-1.5 mr-1">
              <span className="text-xl sm:text-2xl font-bold font-mono leading-none" style={{ color: "var(--accent)" }}>{overall}%</span>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{doneTopics}/{totalTopics}</span>
            </div>
            <button onClick={() => setShowTimeline(true)} className="cc-btn px-3 py-2 text-xs flex-shrink-0" title="Realistic timeline">
              <span style={{ position: "relative", zIndex: 3 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
            </button>
            <button onClick={() => setShowBin(true)} className="cc-btn px-3 py-2 text-xs flex-shrink-0" title="Recycle bin">
              <span style={{ position: "relative", zIndex: 3 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </span>
            </button>
            <button onClick={() => setEditPhase(null)} className="cc-btn cc-btn-accent px-3 py-2 text-xs flex-shrink-0">
              <span style={{ position: "relative", zIndex: 3 }}>+ Phase</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono w-16 flex-shrink-0" style={{ color: "var(--text-muted)" }}>Topics</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${overall}%`, background: `linear-gradient(90deg, var(--accent), hsl(var(--accent-h),var(--accent-s),calc(var(--accent-l)+14%)))` }} />
            </div>
            <span className="text-[10px] font-mono w-8 text-right flex-shrink-0" style={{ color: "var(--accent)" }}>{overall}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono w-16 flex-shrink-0" style={{ color: "var(--text-muted)" }}>Weeks</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${wksDone}%`, background: "#5ecf95" }} />
            </div>
            <span className="text-[10px] font-mono w-8 text-right flex-shrink-0" style={{ color: "#5ecf95" }}>{wksDone}%</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {phases.map((p) => {
            const pct = phasePct(p, done);
            const isActive = openPhase === p.id;
            return (
              <button key={p.id} onClick={() => setOpenPhase(isActive ? null : p.id)}
                className="flex items-center gap-1.5 rounded-full text-[10px] font-mono transition-all"
                style={{ padding: "4px 10px", background: isActive ? p.bg_color : "var(--glass-fill)", border: `0.5px solid ${isActive ? p.accent_color + "55" : "var(--glass-border)"}`, color: isActive ? p.text_color : "var(--text-muted)" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: pct === 100 ? p.accent_color : pct > 0 ? p.accent_color + "88" : "var(--glass-border)", display: "inline-block", flexShrink: 0 }} />
                <span className="hidden sm:inline">{p.title.split(" ")[0]}</span>
                <span className="sm:hidden">{p.id}</span>
                <span style={{ opacity: 0.65 }}>{pct}%</span>
              </button>
            );
          })}
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-20 animate-fade-in">
          <div className="glass rounded-2xl px-8 py-6 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-transparent mx-auto mb-3 animate-spin"
              style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent-dim)" }} />
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading your roadmap…</p>
          </div>
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {phases.map((phase, pi) => {
            const pct         = phasePct(phase, done);
            const isOpen      = openPhase === phase.id;
            const activeTab   = getTab(phase.id);
            const dStep       = deleteStep[phase.id];
            const isCountdown = dStep === 2 && pendingDelete?.id === phase.id;

            return (
              <div key={phase.id}
                className="liquid-glass rounded-[22px] overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${pi * 35}ms`, border: isOpen ? `0.5px solid ${phase.accent_color}40` : undefined }}>

                <div style={{ height: "2px", background: `linear-gradient(90deg,${phase.accent_color},transparent)` }} />

                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4">
                  <button onClick={() => setOpenPhase(isOpen ? null : phase.id)}
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold font-mono"
                    style={{ background: phase.bg_color, color: phase.text_color, border: `0.5px solid ${phase.accent_color}40` }}>
                    {pi + 1}
                  </button>

                  <button className="flex-1 min-w-0 text-left" onClick={() => setOpenPhase(isOpen ? null : phase.id)}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{phase.title}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline"
                        style={{ background: phase.bg_color, color: phase.text_color, border: `0.5px solid ${phase.accent_color}30` }}>
                        {phase.duration}
                      </span>
                      {pct === 100 && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "rgba(94,207,149,0.14)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.30)" }}>✓ Done</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: phase.accent_color }} />
                      </div>
                      <span className="text-[10px] font-mono flex-shrink-0" style={{ color: phase.text_color }}>{pct}%</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setInfoPhase(phase)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                      title="Phase overview"
                      style={{ color: "var(--text-muted)", background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                      </svg>
                    </button>
                    <button onClick={() => setEditPhase(phase)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                      style={{ color: "var(--text-muted)", background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDeleteStep1(phase)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                      style={{ color: dStep ? "#f87171" : "var(--text-muted)", background: dStep ? "rgba(248,65,65,0.10)" : "var(--glass-fill)", border: `0.5px solid ${dStep ? "rgba(248,65,65,0.28)" : "var(--glass-border)"}` }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                    <button onClick={() => setOpenPhase(isOpen ? null : phase.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl"
                      style={{ color: "var(--text-muted)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.22s ease" }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {dStep === 1 && (
                  <div className="mx-3 sm:mx-4 mb-3 rounded-[14px] p-3 animate-fade-in"
                    style={{ background: "rgba(248,65,65,0.07)", border: "0.5px solid rgba(248,65,65,0.22)" }}>
                    <p className="text-xs font-mono mb-0.5" style={{ color: "#f87171" }}>Delete phase "{phase.title}"?</p>
                    <p className="text-[10px] font-mono mb-3" style={{ color: "var(--text-muted)" }}>All topic + week progress erased. You'll have 5 seconds to undo.</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteStep2(phase)} className="flex-1 py-2.5 text-xs font-medium rounded-[10px]"
                        style={{ background: "rgba(248,65,65,0.18)", color: "#f87171", border: "0.5px solid rgba(248,65,65,0.30)" }}>Yes, delete</button>
                      <button onClick={() => handleCancelDelete(phase.id)} className="flex-1 py-2.5 text-xs rounded-[10px]"
                        style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>Cancel</button>
                    </div>
                  </div>
                )}

                {isCountdown && (
                  <div className="mx-3 sm:mx-4 mb-3 rounded-[14px] overflow-hidden animate-fade-in"
                    style={{ border: "0.5px solid rgba(248,65,65,0.35)" }}>
                    <div style={{ height: "3px", background: "rgba(248,65,65,0.15)" }}>
                      <div style={{ height: "100%", background: "#f87171", width: `${undoProgress}%`, transition: "width 0.1s linear" }} />
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: "rgba(248,65,65,0.07)" }}>
                      <span className="text-xs font-mono flex-1" style={{ color: "#f87171" }}>
                        Deleting "{phase.title}" in {Math.max(1, Math.ceil(undoProgress / 20))}s…
                      </span>
                      <button onClick={handleDeleteUndo} className="px-3 py-1.5 text-xs font-semibold rounded-xl flex-shrink-0"
                        style={{ background: "rgba(94,207,149,0.14)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.32)" }}>Undo</button>
                      <button onClick={() => handleCancelDelete(phase.id)} className="w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0"
                        style={{ color: "var(--text-muted)", fontSize: "16px" }}>×</button>
                    </div>
                  </div>
                )}

                {isOpen && (
                  <div className="animate-fade-in" style={{ borderTop: `0.5px solid ${phase.accent_color}20` }}>
                    <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5" style={{ background: phase.bg_color }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        style={{ color: phase.text_color, flexShrink: 0 }}>
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                      </svg>
                      <span className="text-[11px] font-medium" style={{ color: phase.text_color }}>Milestone: {phase.milestone}</span>
                    </div>

                    <div className="flex items-center gap-1 px-3 sm:px-5 pt-3 pb-0 flex-wrap gap-y-2">
                      {(["topics", "weeks", "practice"] as const).map((t) => (
                        <button key={t} onClick={() => setPhaseTab(phase.id, t)}
                          className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] font-medium rounded-xl capitalize transition-all"
                          style={{ background: activeTab === t ? phase.bg_color : "transparent", color: activeTab === t ? phase.text_color : "var(--text-muted)", border: `0.5px solid ${activeTab === t ? phase.accent_color + "40" : "transparent"}` }}>
                          {t}
                        </button>
                      ))}
                      <div className="ml-auto flex flex-wrap gap-1 items-center">
                        {phase.resources.slice(0, 4).map((r) => (
                          r.url
                            ? <a key={r.label} href={r.url} target="_blank" rel="noopener"
                                className="text-[9px] font-mono px-2 py-1 rounded-full transition-all hover:opacity-80"
                                style={{ background: `${phase.accent_color}18`, color: phase.text_color, border: `0.5px solid ${phase.accent_color}35`, textDecoration: "none" }}>
                                {r.label} ↗
                              </a>
                            : <span key={r.label} className="text-[9px] font-mono px-2 py-1 rounded-full"
                                style={{ background: "var(--glass-fill-deep)", color: "var(--text-muted)", border: "0.5px solid var(--glass-border-subtle)" }}>
                                {r.label}
                              </span>
                        ))}
                        {phase.resources.length > 4 && (
                          <button onClick={() => setInfoPhase(phase)}
                            className="text-[9px] font-mono px-2 py-1 rounded-full"
                            style={{ background: `${phase.accent_color}12`, color: phase.text_color, border: `0.5px solid ${phase.accent_color}30` }}>
                            +{phase.resources.length - 4} more ↗
                          </button>
                        )}
                      </div>
                    </div>

                    {activeTab === "topics" && (
                      <div className="px-3 sm:px-5 pt-3 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {phase.tracks.map((track, ti) => (
                          <div key={ti} className="rounded-[16px] overflow-hidden"
                            style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                            <div className="px-4 py-3" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: phase.text_color }}>{track.label}</span>
                            </div>
                            <div className="px-4 py-2">
                              {track.topics.map((topic, i) => {
                                const key    = topicKey(phase.id, ti, i);
                                const isDone = !!done[key];
                                const isSave = savingKey === key;
                                return (
                                  <button key={i} onClick={() => handleTopicToggle(phase.id, ti, i)} disabled={isSave}
                                    className="w-full flex items-start gap-3 py-2.5 text-left rounded-xl px-2 -mx-2 transition-all"
                                    style={{ opacity: isSave ? 0.6 : 1 }}>
                                    <div className="flex-shrink-0 flex items-center justify-center transition-all duration-200"
                                      style={{ width: "18px", height: "18px", borderRadius: "5px", marginTop: "1px", background: isDone ? phase.accent_color : "var(--bg-input)", border: `1.5px solid ${isDone ? phase.accent_color : "var(--glass-border)"}`, boxShadow: isDone ? `0 0 8px ${phase.accent_color}44` : "none" }}>
                                      {isDone && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-5"/></svg>}
                                    </div>
                                    <span className="text-xs leading-relaxed" style={{ color: isDone ? "var(--text-muted)" : "var(--text-secondary)", textDecoration: isDone ? "line-through" : "none" }}>
                                      {topic}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "weeks" && (
                      <div className="px-3 sm:px-5 pt-3 pb-5 space-y-2">
                        {phase.weeks.map((week, wi) => {
                          const wKey   = weekKey(phase.id, wi);
                          const isDone = !!weeksMap[wKey];
                          const isSave = savingKey === wKey;
                          return (
                            <div key={wi} className="rounded-[16px] overflow-hidden animate-fade-in-up"
                              style={{ animationDelay: `${wi * 25}ms`, background: isDone ? `${phase.accent_color}0d` : "var(--glass-fill-deep)", border: `0.5px solid ${isDone ? phase.accent_color + "35" : "var(--glass-border-subtle)"}`, transition: "background 0.3s, border-color 0.3s" }}>
                              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                                <button onClick={() => handleWeekToggle(phase.id, wi)} disabled={isSave}
                                  className="flex-shrink-0 flex items-center justify-center transition-all duration-200"
                                  style={{ width: "18px", height: "18px", borderRadius: "5px", background: isDone ? phase.accent_color : "var(--bg-input)", border: `1.5px solid ${isDone ? phase.accent_color : "var(--glass-border)"}`, boxShadow: isDone ? `0 0 8px ${phase.accent_color}44` : "none", opacity: isSave ? 0.6 : 1 }}>
                                  {isDone && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-5"/></svg>}
                                </button>
                                <span className="text-[11px] font-semibold flex-1" style={{ color: isDone ? phase.text_color : "var(--text-secondary)" }}>{week.label}</span>
                                {isDone && <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${phase.accent_color}18`, color: phase.text_color }}>done</span>}
                              </div>
                              <div className="px-4 py-3 space-y-1.5">
                                {week.goals.map((goal, gi) => (
                                  <div key={gi} className="flex items-start gap-2.5">
                                    <div className="w-[3px] h-[3px] rounded-full flex-shrink-0 mt-[6px]" style={{ background: phase.accent_color + "80" }} />
                                    <span className="text-xs" style={{ color: isDone ? "var(--text-muted)" : "var(--text-secondary)", lineHeight: 1.5 }}>{goal}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeTab === "practice" && (
                      <div className="px-3 sm:px-5 pt-3 pb-5 space-y-4">
                        {phase.practice.map((set, si) => (
                          <div key={si} className="rounded-[16px] overflow-hidden animate-fade-in-up"
                            style={{ animationDelay: `${si * 35}ms`, background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: phase.accent_color }} />
                              <span className="text-[11px] font-semibold" style={{ color: phase.text_color }}>{set.title}</span>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              {set.problems.map((prob, pi2) => (
                                <div key={pi2} className="flex items-start gap-3">
                                  <span className="text-[10px] font-mono flex-shrink-0 w-5 text-right mt-0.5" style={{ color: phase.accent_color + "80" }}>{pi2 + 1}.</span>
                                  <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{prob}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {phases.length === 0 && !loading && (
            <div className="glass rounded-[22px] p-10 text-center animate-fade-in">
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No phases yet</p>
              <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>Run the SQL migration first, then click "+ Phase" to add manually.</p>
              <button onClick={() => setEditPhase(null)} className="cc-btn cc-btn-accent px-4 py-2 text-xs">
                <span style={{ position: "relative", zIndex: 3 }}>+ Add first phase</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      {editPhase !== false && (
        <EditPhaseModal phase={editPhase} onSave={handleSavePhase} onClose={() => setEditPhase(false)} />
      )}

      {infoPhase && (() => {
        const pi = phases.findIndex((p) => p.id === infoPhase.id);
        const pct = phasePct(infoPhase, done);
        const phaseTopicTotal = infoPhase.tracks.reduce((s, t) => s + t.topics.length, 0);
        const phaseTopicDone  = infoPhase.tracks.reduce((s, t, ti) =>
          s + t.topics.filter((_, i) => done[topicKey(infoPhase.id, ti, i)]).length, 0);
        const phaseWeekTotal  = infoPhase.weeks.length;
        const phaseWeekDone   = infoPhase.weeks.filter((_, wi) => weeksMap[weekKey(infoPhase.id, wi)]).length;
        return (
          <PhaseInfoModal
            phase={infoPhase}
            phaseIndex={pi}
            pct={pct}
            doneTopics={phaseTopicDone}
            totalTopics={phaseTopicTotal}
            doneWeeks={phaseWeekDone}
            totalWeeks={phaseWeekTotal}
            onClose={() => setInfoPhase(null)}
          />
        );
      })()}

      {showTimeline && <TimelineModal onClose={() => setShowTimeline(false)} />}
      {showBin && <RecycleBinModal table="learning_phases" onClose={() => setShowBin(false)} onRestored={loadAll} />}
    </div>
  );
}
