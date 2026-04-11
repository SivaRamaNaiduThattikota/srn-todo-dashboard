/**
 * ProductivityGoalCard.tsx — SRN Command Center v12.3
 * All 3 tabs (Weekly / Daily / Monthly) now use real Supabase data.
 * No more multiplier estimates.
 */

"use client";

import { useState } from "react";

interface DayBar {
  label: string;
  count: number;
  color: string;
}

interface ProductivityGoalCardProps {
  weeklyDone:   number;
  weeklyTotal:  number;
  focusMinutes: number;
  weeklyBars:   DayBar[];
  dailyBars:    DayBar[];
  monthlyBars:  DayBar[];
  periodTotals: { daily: number; weekly: number; monthly: number };
}

function formatFocus(mins: number) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ""}`.trim();
}

const TABS = ["Weekly", "Daily", "Monthly"] as const;
type Tab = typeof TABS[number];

export default function ProductivityGoalCard({
  weeklyDone,
  weeklyTotal,
  focusMinutes,
  weeklyBars,
  dailyBars,
  monthlyBars,
  periodTotals,
}: ProductivityGoalCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Weekly");

  const activeBars  = activeTab === "Weekly" ? weeklyBars : activeTab === "Daily" ? dailyBars : monthlyBars;
  const tabDone     = activeBars.reduce((s, b) => s + b.count, 0);
  // Real total per period from Supabase
  const tabTotal    = activeTab === "Weekly" ? Math.max(weeklyTotal, periodTotals.weekly)
                    : activeTab === "Daily"  ? Math.max(periodTotals.daily,   1)
                    : Math.max(periodTotals.monthly, 1);
  const tabPct      = tabTotal > 0 ? Math.round((tabDone / tabTotal) * 100) : 0;

  const maxCount = Math.max(...activeBars.map(b => b.count), 1);

  // Label for goal header
  const goalLabels: Record<Tab, string> = {
    Weekly:  "Last 7 days — one bar per day",
    Daily:   "Today — activity by time of day",
    Monthly: "This month — grouped by week",
  };

  return (
    <div style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)", borderRadius: "22px", padding: "20px", marginBottom: "14px" }}>

      {/* Segment tabs */}
      <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "4px", gap: "2px", marginBottom: "16px" }}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: "5px 14px", borderRadius: "9px", fontSize: "12px", fontWeight: 500,
              cursor: "pointer", fontFamily: "-apple-system, sans-serif",
              border: activeTab === tab ? "0.5px solid var(--accent-dim)" : "none",
              background: activeTab === tab ? "var(--accent-muted)" : "transparent",
              color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
              transition: "all 0.15s",
            }}>
            {tab === "Weekly" ? "📈 " : tab === "Daily" ? "🎯 " : "⚡ "}{tab}
          </button>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "4px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>{activeTab} Goal</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {goalLabels[activeTab]}
          </div>
        </div>
        <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "var(--accent-muted)", border: "0.5px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>◈</div>
      </div>

      {/* Progress bar — based on real tabDone vs weeklyTotal */}
      <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "99px", overflow: "hidden", margin: "14px 0 8px" }}>
        <div style={{ height: "100%", width: `${Math.min(tabPct, 100)}%`, borderRadius: "99px", background: `linear-gradient(90deg, var(--accent), var(--accent-light))`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          {tabDone} completed
        </span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>
          {tabPct}% of total
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: "0.5px", background: "var(--glass-border)", marginBottom: "16px" }} />

      {/* Activity header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
          {activeTab === "Daily" ? "Today's Activity" : activeTab === "Monthly" ? "Monthly Activity" : "Daily Activity"}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
          {formatFocus(focusMinutes)} focus
        </div>
      </div>

      {/* Big stats — weekly always shows done vs total */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "14px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Completed</div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{tabDone}</div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Total ({activeTab.toLowerCase()})</div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--text-secondary)", lineHeight: 1 }}>{tabTotal}</div>
        </div>
      </div>

      {/* Multicolor strip bar */}
      <div style={{ height: "10px", borderRadius: "99px", display: "flex", overflow: "hidden", marginBottom: "16px" }}>
        {activeBars.filter(b => b.count > 0).map((b, i) => (
          <div key={i} style={{ flex: b.count, background: b.color, height: "100%" }} />
        ))}
        {activeBars.every(b => b.count === 0) && (
          <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", height: "100%" }} />
        )}
      </div>

      {/* Bars chart */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${activeBars.length}, 1fr)`, gap: "6px", alignItems: "flex-end", marginBottom: "14px" }}>
        {activeBars.map((b, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "100%", height: "48px", background: "rgba(255,255,255,0.06)", borderRadius: "6px", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
              <div style={{ width: "100%", height: `${(b.count / maxCount) * 100}%`, background: b.color, borderRadius: "6px", transition: "height 0.5s ease", minHeight: b.count > 0 ? "4px" : "0" }} />
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>{b.label}</div>
          </div>
        ))}
      </div>

      {/* Count legend — 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
        {activeBars.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: b.color, flexShrink: 0 }} />
            <span style={{ color: "var(--text-secondary)" }}>{b.label}</span>
            <span style={{ marginLeft: "auto", fontWeight: 600, color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>{b.count}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
