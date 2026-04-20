"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

const IC = (paths: React.ReactNode, size = 22) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const ICONS: Record<string, React.ReactNode> = {
  today: IC(<><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/><line x1="12" y1="3" x2="12" y2="1"/><line x1="12" y1="23" x2="12" y2="21"/><line x1="3" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="21" y2="12"/></>),
  tasks: IC(<><rect x="4" y="5" width="3" height="3" rx="0.8"/><rect x="4" y="11" width="3" height="3" rx="0.8"/><rect x="4" y="17" width="3" height="3" rx="0.8"/><line x1="10" y1="6.5" x2="20" y2="6.5"/><line x1="10" y1="12.5" x2="20" y2="12.5"/><line x1="10" y1="18.5" x2="17" y2="18.5"/></>),
  streaks: IC(<><path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/><path d="M12 12c0 2-1.5 3-1.5 4.5a1.5 1.5 0 0 0 3 0C13.5 15 12 14 12 12z" strokeWidth="1.2"/></>),
  focus: IC(<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21" y2="12"/></>),
  notes: IC(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></>),
  projects: IC(<><path d="M2 20h20"/><path d="M5 20V10l7-7 7 7v10"/><rect x="9" y="14" width="6" height="6" rx="0.5"/></>),
  learning: IC(<><path d="M12 3L2 8l10 5 10-5-10-5z"/><path d="M2 8v6"/><path d="M6 10.5v5.5a6 6 0 0 0 12 0v-5.5"/></>),
  interview: IC(<><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 8l3 3-3 3" strokeWidth="1.5"/><line x1="13" y1="11" x2="17" y2="11"/></>),
  board: IC(<><rect x="3" y="3" width="5" height="16" rx="1.2"/><rect x="10" y="3" width="5" height="10" rx="1.2"/><rect x="17" y="3" width="4" height="13" rx="1.2"/></>),
  notebooks: IC(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></>),
  analytics: IC(<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>),
  assistant: IC(<><path d="M12 2a5 5 0 0 1 5 5c0 2.4-1.4 4.5-3.5 5.5L15 21H9l1.5-8.5C8.4 11.5 7 9.4 7 7a5 5 0 0 1 5-5z"/><circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none"/></>),
  review: IC(<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/><line x1="14" y1="6" x2="18" y2="10"/></>),
  decisions: IC(<><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/><path d="M7.5 4.5l1.5 1.5"/><path d="M15 4.5l1.5-1.5"/></>),
  briefing: IC(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></>),
  notifications: IC(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>),
  calendar: IC(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><rect x="8" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/></>),
  settings: IC(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>),
};

const ALL_NAV = [
  { href: "/today",         label: "Today",        iconKey: "today"         },
  { href: "/",              label: "Tasks",         iconKey: "tasks"         },
  { href: "/streaks",       label: "Streaks",       iconKey: "streaks"       },
  { href: "/focus",         label: "Focus",         iconKey: "focus"         },
  { href: "/learning",      label: "Learning",      iconKey: "learning"      },
  { href: "/interview",     label: "Interview",     iconKey: "interview"     },
  { href: "/notes",         label: "Notes",         iconKey: "notes"         },
  { href: "/projects",      label: "Projects",      iconKey: "projects"      },
  { href: "/board",         label: "Board",         iconKey: "board"         },
  { href: "/notebooks",     label: "Notebooks",     iconKey: "notebooks"     },
  { href: "/analytics",     label: "Analytics",     iconKey: "analytics"     },
  { href: "/assistant",     label: "AI Assistant",  iconKey: "assistant"     },
  { href: "/review",        label: "Review",        iconKey: "review"        },
  { href: "/decisions",     label: "Decisions",     iconKey: "decisions"     },
  { href: "/briefing",      label: "Briefing",      iconKey: "briefing"      },
  { href: "/notifications", label: "Notifications", iconKey: "notifications" },
  { href: "/calendar",      label: "Calendar",      iconKey: "calendar"      },
  { href: "/settings",      label: "Settings",      iconKey: "settings"      },
];

const PRIMARY_TABS = ALL_NAV.slice(0, 4);
const MORE_ITEMS   = ALL_NAV.slice(4);

// ── Full-size tab item (expanded mode) ────────────────────────────────────────
function TabItem({ href, label, iconKey, isActive }: {
  href: string; label: string; iconKey: string; isActive: boolean;
}) {
  return (
    <Link href={href} style={{
      flex: 1,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "3px", padding: "4px",
      borderRadius: "12px",
      background: isActive ? "var(--accent-muted)" : "transparent",
      border: `0.5px solid ${isActive ? "var(--accent-dim)" : "transparent"}`,
      boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px var(--accent-muted)" : "none",
      textDecoration: "none",
      cursor: "pointer",
      transition: "all 0.22s var(--sp)",
      minWidth: "52px",
      position: "relative",
      overflow: "hidden",
    }}>
      {isActive && <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: "0.5px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", pointerEvents: "none" }} />}
      {isActive && <div style={{ position: "absolute", top: "4px", width: "3px", height: "3px", borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 5px var(--accent-glow)" }} />}
      <span style={{ color: isActive ? "var(--accent)" : "var(--cc-text)", display: "flex", marginTop: isActive ? "5px" : "0", transform: isActive ? "scale(1.08)" : "scale(1)", transition: "all 0.22s var(--sp)" }}>
        {ICONS[iconKey]}
      </span>
      <span style={{ fontSize: "9px", fontWeight: 600, color: isActive ? "var(--accent)" : "var(--cc-text-muted)", fontFamily: "-apple-system, SF Pro Display, sans-serif", letterSpacing: "0.01em", transition: "color 0.18s ease" }}>
        {label}
      </span>
    </Link>
  );
}

// ── Compact icon button (collapsed pill mode) ─────────────────────────────────
function PillIcon({ href, iconKey, isActive, onClick }: {
  href?: string; iconKey?: string; isActive: boolean;
  onClick?: () => void;
}) {
  const style: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "40px", height: "40px",
    borderRadius: "50%",
    background: isActive ? "var(--accent-muted)" : "transparent",
    border: `0.5px solid ${isActive ? "var(--accent-dim)" : "transparent"}`,
    color: isActive ? "var(--accent)" : "var(--cc-text-muted)",
    flexShrink: 0,
    transition: "all 0.22s var(--sp)",
    cursor: "pointer",
    textDecoration: "none",
  };

  if (href) {
    return (
      <Link href={href} style={style}>
        <span style={{ display: "flex", color: "inherit" }}>
          {iconKey && ICONS[iconKey]}
        </span>
      </Link>
    );
  }
  return (
    <button style={{ ...style, background: isActive ? "var(--accent-muted)" : "transparent" }} onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <circle cx="5"  cy="12" r="1.8"/>
        <circle cx="12" cy="12" r="1.8"/>
        <circle cx="19" cy="12" r="1.8"/>
      </svg>
    </button>
  );
}

// ── MobileNav ─────────────────────────────────────────────────────────────────
export function MobileNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  // ── Scroll-reactive: collapse → floating pill on scroll down,
  //    expand back to full bar on scroll up ──────────────────────────
  useEffect(() => {
    let lastY = 0;
    let ticking = false;

    const handle = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (delta > 8 && y > 60)  setNavCollapsed(true);
        if (delta < -4)            setNavCollapsed(false);
        // Always expand near bottom of page
        if (window.innerHeight + y >= document.body.scrollHeight - 40)
          setNavCollapsed(false);
        lastY = y;
        ticking = false;
      });
    };

    // touchmove catches iOS momentum before scroll fires
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove  = (e: TouchEvent) => {
      const dy = touchStartY - e.touches[0].clientY;
      if (dy > 10 && window.scrollY > 60) setNavCollapsed(true);
      if (dy < -6)                         setNavCollapsed(false);
    };

    window.addEventListener("scroll",     handle,       { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: true });
    return () => {
      window.removeEventListener("scroll",     handle);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
    };
  }, []);

  // Expand on route change or sheet open
  useEffect(() => { setNavCollapsed(false); }, [pathname]);
  useEffect(() => { if (sheetOpen) setNavCollapsed(false); }, [sheetOpen]);

  useEffect(() => { setSheetOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const isMoreActive = MORE_ITEMS.some((i) => i.href === pathname);

  return (
    <>
      {/* ── Bottom nav bar ── */}
      <nav
        className="mobile-bottom-nav"
        style={{
          zIndex: 50,
          backdropFilter: "blur(48px) saturate(2.2)",
          WebkitBackdropFilter: "blur(48px) saturate(2.2)",
          transition: "all 0.36s var(--sp)",
          // COLLAPSED: float up as a compact pill in the center
          ...(navCollapsed ? {
            bottom: "16px",
            left: "50%",
            right: "auto",
            width: "auto",
            transform: "translateX(-50%)",
            borderRadius: "99px",
            background: "var(--cc-glass-base)",
            border: "0.5px solid var(--glass-border)",
            borderTop: "0.5px solid var(--glass-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
            padding: "0",
          } : {
            // EXPANDED: full-width bar at very bottom
            bottom: "0",
            left: "0",
            right: "0",
            width: "auto",
            transform: "none",
            borderRadius: "0",
            background: "var(--cc-glass-base)",
            borderTop: "0.5px solid var(--cc-tile-border)",
            borderLeft: "none",
            borderRight: "none",
            borderBottom: "none",
            boxShadow: "0 -1px 0 var(--cc-tile-border), 0 -8px 40px rgba(0,0,0,0.12)",
            padding: "0",
          }),
        }}
      >
        {/* Top specular — expanded only */}
        {!navCollapsed && (
          <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: "0.5px", background: "linear-gradient(90deg, transparent, var(--specular-top), transparent)", pointerEvents: "none" }} />
        )}

        {navCollapsed ? (
          // ── COLLAPSED: compact floating pill ──────────────────────
          <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "6px 8px" }}>
            {PRIMARY_TABS.map((item) => (
              <PillIcon
                key={item.href}
                href={item.href}
                iconKey={item.iconKey}
                isActive={pathname === item.href}
              />
            ))}
            {/* Divider */}
            <div style={{ width: "0.5px", height: "20px", background: "var(--glass-border)", margin: "0 2px", flexShrink: 0 }} />
            <PillIcon isActive={isMoreActive || sheetOpen} onClick={() => setSheetOpen(true)} />
          </div>
        ) : (
          // ── EXPANDED: full bar with labels ─────────────────────────
          <div style={{
            display: "flex", alignItems: "stretch", justifyContent: "space-around",
            padding: "6px 4px",
            paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
          }}>
            {PRIMARY_TABS.map((item) => (
              <TabItem
                key={item.href}
                href={item.href}
                label={item.label}
                iconKey={item.iconKey}
                isActive={pathname === item.href}
              />
            ))}

            {/* More button */}
            <button
              onClick={() => setSheetOpen(true)}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px", padding: "4px",
                borderRadius: "12px", minWidth: "52px",
                background: (isMoreActive || sheetOpen) ? "var(--accent-muted)" : "transparent",
                border: `0.5px solid ${(isMoreActive || sheetOpen) ? "var(--accent-dim)" : "transparent"}`,
                cursor: "pointer",
                transition: "all 0.22s var(--sp)",
                position: "relative",
              }}
            >
              {isMoreActive && !sheetOpen && (
                <div style={{ position: "absolute", top: "4px", width: "3px", height: "3px", borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 5px var(--accent-glow)" }} />
              )}
              <span style={{ color: (isMoreActive || sheetOpen) ? "var(--accent)" : "var(--cc-text)", display: "flex", marginTop: (isMoreActive || sheetOpen) ? "5px" : "0", transition: "all 0.22s var(--sp)" }}>
                {sheetOpen
                  ? IC(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>)
                  : IC(<><circle cx="5" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="1.5" fill="currentColor" stroke="none"/></>)
                }
              </span>
              <span style={{ fontSize: "9px", fontWeight: 600, color: (isMoreActive || sheetOpen) ? "var(--accent)" : "var(--cc-text-muted)", fontFamily: "-apple-system, SF Pro Display, sans-serif", letterSpacing: "0.01em" }}>
                More
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* ── More sheet ── */}
      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 48, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", animation: "fadeIn 0.18s ease both" }} />

          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 49, background: "var(--cc-glass-base)", backdropFilter: "blur(56px) saturate(2.4)", WebkitBackdropFilter: "blur(56px) saturate(2.4)", borderTop: "0.5px solid var(--cc-tile-border)", borderRadius: "24px 24px 0 0", boxShadow: "0 -12px 48px rgba(0,0,0,0.25)", paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))", animation: "slideUp 0.3s var(--sp) both" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "8px" }}>
              <div style={{ width: "36px", height: "4px", borderRadius: "100px", background: "var(--cc-text-muted)", opacity: 0.4 }} />
            </div>
            <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "0.5px", background: "linear-gradient(90deg, transparent, var(--specular-top), transparent)" }} />
            <div style={{ padding: "0 20px 12px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", color: "var(--text-muted)", textTransform: "uppercase", fontFamily: "-apple-system, SF Pro Display, sans-serif" }}>
              All Pages
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", padding: "0 16px 16px" }}>
              {MORE_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", padding: "14px 8px 12px", borderRadius: "16px", background: isActive ? "var(--accent-muted)" : "var(--cc-glass-base)", border: isActive ? "0.5px solid var(--accent-dim)" : "0.5px solid var(--cc-tile-border)", boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 0 16px var(--accent-muted)" : "var(--cc-inner-shadow), 0 2px 8px rgba(0,0,0,0.10)", textDecoration: "none", position: "relative", overflow: "hidden", transition: "all 0.2s var(--sp)" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)", borderRadius: "16px 16px 0 0", pointerEvents: "none" }} />
                    <span style={{ color: isActive ? "var(--accent)" : "var(--cc-text)", display: "flex", position: "relative", zIndex: 1 }}>{ICONS[item.iconKey]}</span>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: isActive ? "var(--accent)" : "var(--cc-text)", fontFamily: "-apple-system, SF Pro Display, sans-serif", letterSpacing: "-0.01em", textAlign: "center", lineHeight: 1.2, position: "relative", zIndex: 1 }}>{item.label}</span>
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
