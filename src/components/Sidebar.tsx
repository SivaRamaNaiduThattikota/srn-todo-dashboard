"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSidebar } from "@/components/ClientLayout";

const ICON = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const PRIMARY_NAV = [
  { href: "/today",    label: "Today",    icon: ICON("M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM12 6v6l4 2") },
  { href: "/",         label: "Tasks",    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { href: "/streaks",  label: "Streaks",  icon: ICON("M13 2L3 14h9l-1 8 10-12h-9l1-8z") },
  { href: "/focus",    label: "Focus",    icon: ICON("M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM12 8v4M12 16v0") },
  { href: "/notes",    label: "Notes",    icon: ICON("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8") },
  { href: "/projects", label: "Projects", icon: ICON("M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z") },
];

const MORE_NAV = [
  { href: "/board",     label: "Board",     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="5" height="15" rx="1.5"/></svg> },
  { href: "/analytics", label: "Analytics", icon: ICON("M3 21V3M3 21h18M7 16l4-8 4 4 5-9") },
  { href: "/assistant", label: "AI",        icon: ICON("M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4zM6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2") },
  { href: "/review",    label: "Review",    icon: ICON("M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z") },
  { href: "/decisions", label: "Decisions", icon: ICON("M16 3h5v5M8 3H3v5M12 22V8M21 3l-9 9M3 3l9 9") },
  { href: "/briefing",  label: "Briefing",  icon: ICON("M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4") },
  { href: "/calendar",  label: "Calendar",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
];

const SETTINGS_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

/* ── NavLink ── */
function NavLink({
  href, label, icon, pathname, showLabel,
}: {
  href: string; label: string; icon: React.ReactNode; pathname: string; showLabel: boolean;
}) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      title={!showLabel ? label : undefined}
      className="group flex items-center gap-3 rounded-[13px] transition-all duration-200 relative"
      style={{
        background:           isActive ? "var(--cc-glass-hover)" : "transparent",
        color:                isActive ? "var(--accent)" : "var(--cc-text)",
        backdropFilter:       isActive ? "blur(16px) saturate(1.8)" : "none",
        WebkitBackdropFilter: isActive ? "blur(16px) saturate(1.8)" : "none",
        boxShadow:            isActive ? "var(--cc-inner-shadow), 0 2px 8px rgba(0,0,0,0.10)" : "none",
        border:               isActive ? "0.5px solid var(--cc-tile-border)" : "0.5px solid transparent",
        minHeight: "40px",
        padding: showLabel ? "0 12px" : "0",
        justifyContent: showLabel ? "flex-start" : "center",
      }}
    >
      {isActive && (
        <div style={{ position: "absolute", left: 0, top: "22%", bottom: "22%", width: "2.5px", borderRadius: "0 3px 3px 0", background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }} />
      )}
      {isActive && (
        <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: "0.5px", background: "linear-gradient(90deg, transparent, var(--specular-top), transparent)", pointerEvents: "none" }} />
      )}
      <span className="flex-shrink-0" style={{ color: isActive ? "var(--accent)" : "var(--cc-text)" }}>
        {icon}
      </span>
      {showLabel && (
        <span className="font-medium tracking-tight truncate" style={{ fontSize: "13.5px", color: isActive ? "var(--text-primary)" : "var(--cc-text)", fontFamily: "-apple-system, SF Pro Display, sans-serif", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
          {label}
        </span>
      )}
    </Link>
  );
}

/* ── Sidebar ── */
export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();

  /* lg breakpoint — label visibility */
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* Labels shown only on desktop + not collapsed */
  const showLabels = isLg && !collapsed;

  /*
    More-section open state.
    KEY FIX: moreOpen is INDEPENDENT of showLabels.
    When collapsed (icon mode), More items are NOT auto-shown —
    they stay hidden and the user can still collapse/expand More separately.
  */
  const [moreOpen, setMoreOpen] = useState(false);

  /* Auto-open More only if current path is in More nav — but only set it once */
  useEffect(() => {
    if (MORE_NAV.some((item) => item.href === pathname)) {
      setMoreOpen(true);
    }
  }, [pathname]);

  /* Sidebar pixel width */
  const sidebarWidth = showLabels ? "224px" : "60px";

  return (
    <aside
      className="glass-sidebar fixed left-0 top-0 bottom-0 z-40 flex flex-col"
      style={{ width: sidebarWidth, transition: "width 0.28s cubic-bezier(0.2,0.8,0.2,1)", overflow: "hidden" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center flex-shrink-0 pt-5 pb-3"
        style={{ paddingLeft: "12px", paddingRight: "8px", minHeight: "64px", gap: "10px" }}
      >
        {/* Logo */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-[11px] flex items-center justify-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--accent-dim) 0%, var(--accent-muted) 100%)", border: "0.5px solid var(--cc-tile-border)", boxShadow: "0 2px 10px var(--accent-glow), inset 0 0.5px 0 rgba(255,255,255,0.30)" }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, transparent 100%)", borderRadius: "11px 11px 0 0" }} />
          <span className="font-bold text-sm relative z-10" style={{ color: "var(--accent)", fontFamily: "-apple-system, SF Pro Display, sans-serif" }}>S</span>
        </div>

        {/* Title text — only when expanded */}
        {showLabels && (
          <div className="flex-1 overflow-hidden">
            <h1 className="font-semibold tracking-tight leading-none whitespace-nowrap" style={{ fontSize: "14px", color: "var(--text-primary)", fontFamily: "-apple-system, SF Pro Display, sans-serif" }}>SRN Command</h1>
            <p className="font-mono mt-0.5 whitespace-nowrap" style={{ fontSize: "11px", color: "var(--text-muted)" }}>Center</p>
          </div>
        )}

        {/* ── Collapse/expand toggle — ALWAYS visible on lg ── */}
        {isLg && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex-shrink-0 rounded-[10px] flex items-center justify-center transition-all hover:scale-105"
            style={{
              width: "28px", height: "28px",
              marginLeft: showLabels ? "0" : "auto",
              marginRight: showLabels ? "0" : "auto",
              background: "var(--cc-glass-base)",
              border: "0.5px solid var(--cc-tile-border)",
              color: "var(--cc-text-muted)",
              cursor: "pointer",
              /* When collapsed, this button IS the only header element after logo, so center it */
              alignSelf: "center",
            }}
          >
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.28s ease" }}
            >
              {/* Left-pointing chevron — rotates to right-pointing when collapsed */}
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="flex-shrink-0" style={{ height: "0.5px", background: "var(--cc-tile-border)", margin: "0 12px 8px" }} />

      {/* ── Scrollable nav ── */}
      <nav className="flex-1 min-h-0 px-2 overflow-y-auto overflow-x-hidden flex flex-col" style={{ scrollbarWidth: "none" }}>

        {/* Primary */}
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} showLabel={showLabels} />
          ))}
        </div>

        {/* More section */}
        <div className="mt-1 space-y-0.5">
          {/*
            More section header / toggle.
            - Expanded sidebar: show "More" label button with arrow
            - Collapsed sidebar: show a small separator dot so the user knows there are more items,
              and clicking it expands the More section in-place
          */}
          {showLabels ? (
            /* Expanded: text toggle */
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-[13px] transition-all"
              style={{ color: "var(--cc-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                style={{ transform: moreOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
              <span className="font-medium" style={{ fontSize: "13px", fontFamily: "-apple-system, SF Pro Display, sans-serif" }}>More</span>
              <span className="font-mono ml-auto" style={{ opacity: 0.45, fontSize: "11px" }}>{MORE_NAV.length}</span>
            </button>
          ) : (
            /* Collapsed: small icon-only toggle showing "..." */
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              title={moreOpen ? "Hide more" : "Show more pages"}
              className="flex items-center justify-center w-full rounded-[13px] transition-all"
              style={{
                height: "32px",
                background: moreOpen ? "var(--cc-glass-base)" : "transparent",
                border: moreOpen ? "0.5px solid var(--cc-tile-border)" : "0.5px solid transparent",
                cursor: "pointer",
                color: "var(--cc-text-muted)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="5"  cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </button>
          )}

          {/* More nav items — shown only when moreOpen, regardless of collapsed state */}
          {moreOpen && (
            <div className="space-y-0.5 animate-fade-in">
              {MORE_NAV.map((item) => (
                <NavLink key={item.href} {...item} pathname={pathname} showLabel={showLabels} />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />
      </nav>

      {/* Divider */}
      <div className="flex-shrink-0" style={{ height: "0.5px", background: "var(--cc-tile-border)", margin: "4px 12px" }} />

      {/* Settings — always pinned at bottom */}
      <div className="px-2 pb-4 flex-shrink-0">
        <NavLink href="/settings" label="Settings" icon={SETTINGS_ICON} pathname={pathname} showLabel={showLabels} />
      </div>
    </aside>
  );
}
