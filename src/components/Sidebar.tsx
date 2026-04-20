"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSidebar } from "@/components/ClientLayout";
import { fetchNotifReadIds } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
//  ICON SET — purpose-built SVGs, no two look alike, expressive + legible
//  strokeWidth 1.6 for primary nav, 1.5 for secondary
// ─────────────────────────────────────────────────────────────────────────────

const IC = (paths: React.ReactNode, w = 20, h = 20) => (
  <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const ICONS = {
  today: IC(<>
    <circle cx="12" cy="12" r="9"/>
    <polyline points="12 7 12 12 15.5 14"/>
    <line x1="12" y1="3" x2="12" y2="1"/>
    <line x1="12" y1="23" x2="12" y2="21"/>
    <line x1="3" y1="12" x2="1" y2="12"/>
    <line x1="23" y1="12" x2="21" y2="12"/>
  </>),

  tasks: IC(<>
    <rect x="4" y="5" width="3" height="3" rx="0.8"/>
    <rect x="4" y="11" width="3" height="3" rx="0.8"/>
    <rect x="4" y="17" width="3" height="3" rx="0.8"/>
    <line x1="10" y1="6.5" x2="20" y2="6.5"/>
    <line x1="10" y1="12.5" x2="20" y2="12.5"/>
    <line x1="10" y1="18.5" x2="17" y2="18.5"/>
  </>),

  streaks: IC(<>
    <path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/>
    <path d="M12 12c0 2-1.5 3-1.5 4.5a1.5 1.5 0 0 0 3 0C13.5 15 12 14 12 12z" strokeWidth="1.2"/>
  </>),

  focus: IC(<>
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    <line x1="12" y1="3" x2="12" y2="5"/>
    <line x1="12" y1="19" x2="12" y2="21"/>
    <line x1="3" y1="12" x2="5" y2="12"/>
    <line x1="19" y1="12" x2="21" y2="12"/>
  </>),

  notes: IC(<>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="13" y2="17"/>
  </>),

  projects: IC(<>
    <path d="M2 20h20"/>
    <path d="M5 20V10l7-7 7 7v10"/>
    <rect x="9" y="14" width="6" height="6" rx="0.5"/>
  </>),

  learning: IC(<>
    <path d="M12 3L2 8l10 5 10-5-10-5z"/>
    <path d="M2 8v6"/>
    <path d="M6 10.5v5.5a6 6 0 0 0 12 0v-5.5"/>
  </>),

  interview: IC(<>
    <rect x="3" y="3" width="18" height="14" rx="2"/>
    <path d="M8 21h8"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <path d="M7 8l3 3-3 3" strokeWidth="1.5"/>
    <line x1="13" y1="11" x2="17" y2="11"/>
  </>),

  board: IC(<>
    <rect x="3" y="3" width="5" height="16" rx="1.2"/>
    <rect x="10" y="3" width="5" height="10" rx="1.2"/>
    <rect x="17" y="3" width="4" height="13" rx="1.2"/>
  </>),

  notebooks: IC(<>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="9" y1="7" x2="15" y2="7"/>
    <line x1="9" y1="11" x2="15" y2="11"/>
  </>),

  analytics: IC(<>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </>),

  assistant: IC(<>
    <path d="M12 2a5 5 0 0 1 5 5c0 2.4-1.4 4.5-3.5 5.5L15 21H9l1.5-8.5C8.4 11.5 7 9.4 7 7a5 5 0 0 1 5-5z"/>
    <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none"/>
  </>),

  review: IC(<>
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    <line x1="14" y1="6" x2="18" y2="10"/>
  </>),

  decisions: IC(<>
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 8v4l3 3"/>
    <path d="M7.5 4.5l1.5 1.5"/>
    <path d="M15 4.5l1.5-1.5"/>
  </>),

  briefing: IC(<>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <line x1="8" y1="9" x2="16" y2="9"/>
    <line x1="8" y1="13" x2="13" y2="13"/>
  </>),

  notifications: IC(<>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </>),

  calendar: IC(<>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <rect x="8" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/>
  </>),

  settings: IC(<>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </>),
};

const PRIMARY_NAV = [
  { href: "/today",     label: "Today",     icon: ICONS.today     },
  { href: "/",          label: "Tasks",     icon: ICONS.tasks     },
  { href: "/streaks",   label: "Streaks",   icon: ICONS.streaks   },
  { href: "/focus",     label: "Focus",     icon: ICONS.focus     },
  { href: "/notes",     label: "Notes",     icon: ICONS.notes     },
  { href: "/projects",  label: "Projects",  icon: ICONS.projects  },
  { href: "/learning",  label: "Learning",  icon: ICONS.learning  },
  { href: "/interview", label: "Interview", icon: ICONS.interview },
];

const MORE_NAV = [
  { href: "/board",         label: "Board",         icon: ICONS.board         },
  { href: "/notebooks",     label: "Notebooks",     icon: ICONS.notebooks     },
  { href: "/analytics",     label: "Analytics",     icon: ICONS.analytics     },
  { href: "/assistant",     label: "AI Assistant",  icon: ICONS.assistant     },
  { href: "/review",        label: "Review",        icon: ICONS.review        },
  { href: "/decisions",     label: "Decisions",     icon: ICONS.decisions     },
  { href: "/briefing",      label: "Briefing",      icon: ICONS.briefing      },
  { href: "/notifications", label: "Notifications", icon: ICONS.notifications },
  { href: "/calendar",      label: "Calendar",      icon: ICONS.calendar      },
];

// ─────────────────────────────────────────────────────────────────────────────
//  NavLink — iOS 26 style: liquid pill active state, icon glow, spring hover
// ─────────────────────────────────────────────────────────────────────────────
function NavLink({ href, label, icon, pathname, showLabel, badge }: {
  href: string; label: string; icon: React.ReactNode;
  pathname: string; showLabel: boolean; badge?: number;
}) {
  const isActive = pathname === href;
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      title={!showLabel ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: showLabel ? "10px" : "0",
        justifyContent: showLabel ? "flex-start" : "center",
        height: "42px",
        padding: showLabel ? "0 10px" : "0",
        borderRadius: "14px",
        position: "relative",
        textDecoration: "none",
        flexShrink: 0,
        // Liquid glass active pill
        background: isActive
          ? "linear-gradient(135deg, var(--accent-dim) 0%, var(--accent-muted) 100%)"
          : hovered
          ? "var(--glass-fill)"
          : "transparent",
        backdropFilter: isActive || hovered ? "blur(16px) saturate(1.8)" : "none",
        WebkitBackdropFilter: isActive || hovered ? "blur(16px) saturate(1.8)" : "none",
        border: isActive
          ? "0.5px solid var(--accent-dim)"
          : hovered
          ? "0.5px solid var(--glass-border)"
          : "0.5px solid transparent",
        boxShadow: isActive
          ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 12px var(--accent-muted), 0 1px 3px rgba(0,0,0,0.15)"
          : "none",
        transition: "all 0.22s var(--sp)",
      }}
    >
      {/* Active accent left bar */}
      {isActive && (
        <div style={{
          position: "absolute", left: 0, top: "18%", bottom: "18%",
          width: "2.5px", borderRadius: "0 3px 3px 0",
          background: "var(--accent)",
          boxShadow: "0 0 10px var(--accent-glow)",
        }} />
      )}

      {/* Specular top line on active */}
      {isActive && (
        <div style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: "0.5px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
          pointerEvents: "none",
        }} />
      )}

      {/* Icon container — iOS-style rounded square on active */}
      <span style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "28px",
        borderRadius: "8px",
        position: "relative",
        // Rounded square icon background when active
        background: isActive
          ? "linear-gradient(145deg, var(--accent-dim), rgba(255,255,255,0.05))"
          : "transparent",
        boxShadow: isActive
          ? "inset 0 0.5px 0 rgba(255,255,255,0.22), 0 2px 6px var(--accent-muted)"
          : "none",
        color: isActive ? "var(--accent)" : hovered ? "var(--text-primary)" : "var(--cc-text-muted)",
        // Spring scale on hover
        transform: hovered && !isActive ? "scale(1.14)" : "scale(1)",
        transition: "all 0.22s var(--sp)",
      }}>
        {icon}

        {/* Badge — collapsed mode */}
        {!showLabel && badge && badge > 0 && (
          <span style={{
            position: "absolute", top: "-3px", right: "-3px",
            minWidth: "14px", height: "14px",
            borderRadius: "99px",
            background: "var(--accent)",
            color: "var(--bg-primary)",
            fontSize: "9px", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px", lineHeight: 1,
            boxShadow: "0 0 6px var(--accent-glow)",
          }}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>

      {/* Label — expanded mode */}
      {showLabel && (
        <span style={{
          fontSize: "13.5px",
          fontWeight: isActive ? 600 : 500,
          color: isActive ? "var(--text-primary)" : hovered ? "var(--text-primary)" : "var(--cc-text-muted)",
          fontFamily: "-apple-system, SF Pro Display, sans-serif",
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          transition: "color 0.18s ease",
        }}>
          {label}
        </span>
      )}

      {/* Badge pill — expanded mode */}
      {showLabel && badge && badge > 0 ? (
        <span style={{
          marginLeft: "auto",
          minWidth: "18px", height: "18px",
          borderRadius: "99px",
          background: "var(--accent)",
          color: "var(--bg-primary)",
          fontSize: "10px", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 5px", flexShrink: 0,
          boxShadow: "0 0 8px var(--accent-glow)",
        }}>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sidebar
// ─────────────────────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();

  const [isLg, setIsLg] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const showLabels = isLg && !collapsed;
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);

  // Load unread count — listen for real-time broadcasts from notifications page
  useEffect(() => {
    fetchNotifReadIds().catch(() => {});
    const handler = (e: Event) => { setNotifUnread((e as CustomEvent).detail?.count ?? 0); };
    window.addEventListener("srn:notif-read", handler);
    return () => window.removeEventListener("srn:notif-read", handler);
  }, []);

  useEffect(() => {
    if (MORE_NAV.some((i) => i.href === pathname)) setMoreOpen(true);
  }, [pathname]);

  const sidebarW = showLabels ? 224 : 60;

  return (
    <>
      <aside
        className="glass-sidebar"
        style={{
          position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40,
          width: `${sidebarW}px`,
          transition: "width 0.3s var(--sp)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* ── Logo / Brand ── */}
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center",
          height: "64px",
          padding: showLabels ? "0 14px" : "0",
          justifyContent: showLabels ? "flex-start" : "center",
          gap: "10px",
        }}>
          {/* Liquid glass logo mark */}
          <div style={{
            width: "36px", height: "36px", borderRadius: "11px", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
            background: "linear-gradient(135deg, var(--accent-dim), var(--accent-muted))",
            border: "0.5px solid var(--accent-dim)",
            boxShadow: "0 2px 10px var(--accent-glow), inset 0 0.5px 0 rgba(255,255,255,0.30)",
          }}>
            {/* Specular shine */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "45%",
              background: "linear-gradient(180deg,rgba(255,255,255,0.28),transparent)",
              borderRadius: "11px 11px 0 0",
            }} />
            <span style={{
              color: "var(--accent)", fontWeight: 800, fontSize: "15px",
              position: "relative", zIndex: 1,
              fontFamily: "-apple-system, sans-serif",
              letterSpacing: "-0.03em",
            }}>S</span>
          </div>

          {showLabels && (
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{
                fontSize: "14px", fontWeight: 600, color: "var(--text-primary)",
                whiteSpace: "nowrap", lineHeight: 1,
                letterSpacing: "-0.02em",
              }}>SRN Command</div>
              <div style={{
                fontSize: "10px", color: "var(--text-muted)",
                fontFamily: "monospace", marginTop: "3px",
              }}>Center v12.5</div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ flexShrink: 0, height: "0.5px", background: "var(--glass-border)", margin: "0 12px 6px" }} />

        {/* ── Nav ── */}
        <nav style={{
          flex: 1, minHeight: 0,
          overflowY: "auto", overflowX: "hidden",
          padding: "2px 8px 4px",
          scrollbarWidth: "none",
        }}>
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} showLabel={showLabels} />
          ))}

          <div style={{ height: "6px" }} />

          {/* More toggle */}
          {showLabels ? (
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", height: "36px", padding: "0 10px",
                borderRadius: "10px", border: "none",
                background: moreOpen ? "var(--glass-fill)" : "transparent",
                cursor: "pointer", color: "var(--cc-text-muted)", flexShrink: 0,
                transition: "background 0.18s ease",
              }}
            >
              <svg
                width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: moreOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.22s var(--sp)", flexShrink: 0 }}
              >
                <path d="M9 18l6-6-6-6"/>
              </svg>
              <span style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>More</span>
              <span style={{ marginLeft: "auto", fontSize: "10px", fontFamily: "monospace", opacity: 0.4 }}>{MORE_NAV.length}</span>
            </button>
          ) : (
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              title={moreOpen ? "Hide more" : "Show more"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "34px", width: "100%", borderRadius: "10px",
                cursor: "pointer",
                background: moreOpen ? "var(--glass-fill)" : "transparent",
                border: moreOpen ? "0.5px solid var(--glass-border)" : "0.5px solid transparent",
                color: "var(--cc-text-muted)", flexShrink: 0,
                transition: "all 0.18s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="5" cy="12" r="1.8"/>
                <circle cx="12" cy="12" r="1.8"/>
                <circle cx="19" cy="12" r="1.8"/>
              </svg>
            </button>
          )}

          {moreOpen && MORE_NAV.map((item) => (
            <NavLink
              key={item.href} {...item}
              pathname={pathname} showLabel={showLabels}
              badge={item.href === "/notifications" ? notifUnread : undefined}
            />
          ))}

          <div style={{ height: "8px" }} />
        </nav>

        {/* Divider */}
        <div style={{ flexShrink: 0, height: "0.5px", background: "var(--glass-border)", margin: "0 12px 4px" }} />

        {/* Settings */}
        <div style={{ flexShrink: 0, padding: "0 8px 16px" }}>
          <NavLink
            href="/settings" label="Settings" icon={ICONS.settings}
            pathname={pathname} showLabel={showLabels}
          />
        </div>
      </aside>

      {/* Collapse toggle button */}
      {isLg && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            position: "fixed",
            left: `${sidebarW - 13}px`,
            top: "48px",
            zIndex: 50,
            width: "26px", height: "26px",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-primary)",
            border: "1.5px solid var(--glass-border-hover)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.40), inset 0 0.5px 0 rgba(255,255,255,0.12)",
            transition: "left 0.3s var(--sp), transform 0.2s var(--sp)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s var(--sp)" }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
    </>
  );
}
