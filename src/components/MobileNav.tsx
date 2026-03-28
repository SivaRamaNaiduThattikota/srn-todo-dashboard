"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────────────────────
   All navigation items — every route in the app
   ───────────────────────────────────────────────────────────── */
const ALL_NAV = [
  {
    href: "/today",
    label: "Today",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: "/",
    label: "Tasks",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/streaks",
    label: "Streaks",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    href: "/focus",
    label: "Focus",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12"/>
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    href: "/notes",
    label: "Notes",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projects",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/board",
    label: "Board",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="18" rx="1.5"/>
        <rect x="10" y="3" width="5" height="12" rx="1.5"/>
        <rect x="17" y="3" width="5" height="15" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: "/assistant",
    label: "AI",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/>
        <circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none"/>
        <path d="M9 17s1 1.5 3 1.5 3-1.5 3-1.5"/>
      </svg>
    ),
  },
  {
    href: "/review",
    label: "Review",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    href: "/decisions",
    label: "Decisions",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10"/>
        <line x1="18" y1="20" x2="18" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="16"/>
      </svg>
    ),
  },
  {
    href: "/briefing",
    label: "Briefing",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
        <line x1="9" y1="18" x2="15" y2="18"/>
        <line x1="10" y1="22" x2="14" y2="22"/>
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

/* The 5 primary tabs always visible in the bottom bar */
const PRIMARY_TABS = ALL_NAV.slice(0, 4); // Today, Tasks, Streaks, Focus
const MORE_ITEMS = ALL_NAV.slice(4);      // Everything else

export function MobileNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close sheet on route change
  useEffect(() => { setSheetOpen(false); }, [pathname]);

  // Prevent body scroll when sheet open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const isMoreActive = MORE_ITEMS.some((i) => i.href === pathname);

  return (
    <>
      {/* ── Bottom Tab Bar ─────────────────────────────────────── */}
      <nav
        className="mobile-bottom-nav"
        style={{
          background: "var(--cc-glass-base)",
          borderTop: "0.5px solid var(--cc-tile-border)",
          backdropFilter: "blur(48px) saturate(2.2)",
          WebkitBackdropFilter: "blur(48px) saturate(2.2)",
          boxShadow: "0 -1px 0 var(--cc-tile-border), 0 -8px 40px rgba(0,0,0,0.12)",
          zIndex: 50,
        }}
      >
        {/* Specular top edge — same as glass cards */}
        <div style={{
          position: "absolute", top: 0, left: "8%", right: "8%", height: "0.5px",
          background: "linear-gradient(90deg, transparent 0%, var(--specular-top) 50%, transparent 100%)",
          pointerEvents: "none",
        }} />

        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-around",
            padding: "6px 4px",
            paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Primary 4 tabs */}
          {PRIMARY_TABS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <TabItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
              />
            );
          })}

          {/* "More" button — opens sheet */}
          <button
            onClick={() => setSheetOpen(true)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              padding: "4px 4px",
              borderRadius: "12px",
              background: (isMoreActive || sheetOpen)
                ? "var(--cc-glass-hover)"
                : "transparent",
              border: "0.5px solid transparent",
              cursor: "pointer",
              transition: "all 0.18s ease",
              minWidth: "52px",
              position: "relative",
            }}
          >
            {/* Active indicator dot */}
            {isMoreActive && !sheetOpen && (
              <div style={{
                position: "absolute", top: "5px",
                width: "4px", height: "4px", borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "0 0 6px var(--accent-glow)",
              }} />
            )}
            <span style={{ color: (isMoreActive || sheetOpen) ? "var(--accent)" : "var(--cc-text)", display: "flex" }}>
              {sheetOpen ? (
                /* X icon when open */
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                /* Grid / more icon */
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5"  cy="5"  r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="12" cy="5"  r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="19" cy="5"  r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="5"  cy="12" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="5"  cy="19" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="19" cy="19" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
              )}
            </span>
            <span style={{
              fontSize: "9px", fontWeight: 600,
              color: (isMoreActive || sheetOpen) ? "var(--accent)" : "var(--cc-text-muted)",
              fontFamily: "-apple-system, SF Pro Display, sans-serif",
              letterSpacing: "0.01em",
            }}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* ── "More" Bottom Sheet ─────────────────────────────────── */}
      {sheetOpen && (
        <>
          {/* Scrim */}
          <div
            onClick={() => setSheetOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 48,
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              animation: "fadeIn 0.18s ease both",
            }}
          />

          {/* Sheet */}
          <div
            style={{
              position: "fixed",
              bottom: 0, left: 0, right: 0,
              zIndex: 49,
              background: "var(--cc-glass-base)",
              backdropFilter: "blur(56px) saturate(2.4)",
              WebkitBackdropFilter: "blur(56px) saturate(2.4)",
              borderTop: "0.5px solid var(--cc-tile-border)",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -12px 48px rgba(0,0,0,0.25), 0 -1px 0 var(--specular-top)",
              paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
              animation: "slideUp 0.28s cubic-bezier(0.34,1.4,0.64,1) both",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "8px" }}>
              <div style={{
                width: "36px", height: "4px", borderRadius: "100px",
                background: "var(--cc-text-muted)", opacity: 0.4,
              }} />
            </div>

            {/* Sheet top specular */}
            <div style={{
              position: "absolute", top: 0, left: "15%", right: "15%", height: "0.5px",
              background: "linear-gradient(90deg, transparent, var(--specular-top), transparent)",
            }} />

            {/* Section label */}
            <div style={{
              padding: "4px 20px 12px",
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
              color: "var(--cc-text-muted)", textTransform: "uppercase",
              fontFamily: "-apple-system, SF Pro Display, sans-serif",
            }}>
              All Pages
            </div>

            {/* Grid of items */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
              padding: "0 16px 16px",
            }}>
              {MORE_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "14px 8px 12px",
                      borderRadius: "16px",
                      background: isActive ? "var(--cc-glass-active)" : "var(--cc-glass-base)",
                      border: isActive
                        ? "0.5px solid var(--accent)"
                        : "0.5px solid var(--cc-tile-border)",
                      boxShadow: isActive
                        ? `var(--cc-inner-shadow), 0 0 16px var(--accent-glow)`
                        : `var(--cc-inner-shadow), 0 2px 8px rgba(0,0,0,0.10)`,
                      textDecoration: "none",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.16s ease",
                    }}
                  >
                    {/* Specular dome */}
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: "50%",
                      background: "linear-gradient(180deg, var(--specular-inner) 0%, transparent 100%)",
                      borderRadius: "16px 16px 0 0",
                      pointerEvents: "none",
                      mixBlendMode: "overlay",
                    }} />
                    <span style={{ color: isActive ? "var(--accent)" : "var(--cc-text)", display: "flex", position: "relative", zIndex: 1 }}>
                      {item.icon}
                    </span>
                    <span style={{
                      fontSize: "10px", fontWeight: 600,
                      color: isActive ? "var(--accent)" : "var(--cc-text)",
                      fontFamily: "-apple-system, SF Pro Display, sans-serif",
                      letterSpacing: "-0.01em",
                      textAlign: "center",
                      lineHeight: 1.2,
                      position: "relative", zIndex: 1,
                    }}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ── Single tab item ──────────────────────────────────────── */
function TabItem({
  href, label, icon, isActive,
}: {
  href: string; label: string; icon: React.ReactNode; isActive: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        padding: "4px 4px",
        borderRadius: "12px",
        background: isActive ? "var(--cc-glass-hover)" : "transparent",
        border: `0.5px solid ${isActive ? "var(--cc-tile-border)" : "transparent"}`,
        boxShadow: isActive ? "var(--cc-inner-shadow), 0 2px 8px rgba(0,0,0,0.10)" : "none",
        textDecoration: "none",
        cursor: "pointer",
        transition: "all 0.18s cubic-bezier(0.2,0.8,0.2,1)",
        minWidth: "52px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Specular top on active tab */}
      {isActive && (
        <div style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: "0.5px",
          background: "var(--specular-top)",
          pointerEvents: "none",
        }} />
      )}

      {/* Active glow dot */}
      {isActive && (
        <div style={{
          position: "absolute", top: "4px",
          width: "3px", height: "3px", borderRadius: "50%",
          background: "var(--accent)",
          boxShadow: "0 0 5px var(--accent-glow)",
        }} />
      )}

      <span style={{
        color: isActive ? "var(--accent)" : "var(--cc-text)",
        display: "flex",
        marginTop: isActive ? "6px" : "0",
        transition: "color 0.18s ease",
      }}>
        {icon}
      </span>

      <span style={{
        fontSize: "9px",
        fontWeight: 600,
        color: isActive ? "var(--accent)" : "var(--cc-text-muted)",
        fontFamily: "-apple-system, SF Pro Display, sans-serif",
        letterSpacing: "0.01em",
        transition: "color 0.18s ease",
      }}>
        {label}
      </span>
    </Link>
  );
}
