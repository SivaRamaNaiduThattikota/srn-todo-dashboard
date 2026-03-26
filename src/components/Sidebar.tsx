"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  {
    href: "/today",
    label: "Today",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: "/",
    label: "Tasks",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    href: "/focus",
    label: "Focus",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  {
    href: "/notes",
    label: "Notes",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/board",
    label: "Board",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="21" x2="3" y2="3"/>
        <line x1="3" y1="21" x2="21" y2="21"/>
        <polyline points="7,16 11,8 15,12 20,3"/>
      </svg>
    ),
  },
  {
    href: "/assistant",
    label: "AI",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/>
        <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      </svg>
    ),
  },
  {
    href: "/review",
    label: "Review",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
];

const SETTINGS_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="glass-sidebar fixed left-0 top-0 bottom-0 w-[60px] lg:w-[220px] z-40 flex flex-col"
      style={{ transition: "width 0.3s cubic-bezier(0.2,0.8,0.2,1)" }}
    >
      {/* Logo / Brand */}
      <div className="px-3 lg:px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div
            className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--accent-dim) 0%, var(--accent-muted) 100%)",
              border: "0.5px solid var(--glass-border-hover)",
              boxShadow: "0 2px 10px var(--accent-glow), inset 0 0.5px 0 rgba(255,255,255,0.25)",
            }}
          >
            {/* Shine */}
            <div
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: "45%",
                background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)",
                borderRadius: "11px 11px 0 0",
              }}
            />
            <span
              className="font-bold text-sm relative z-10"
              style={{ color: "var(--accent)", fontFamily: "-apple-system, SF Pro Display, sans-serif", letterSpacing: "-0.02em" }}
            >
              S
            </span>
          </div>

          {/* Title — hidden on narrow sidebar */}
          <div className="hidden lg:block overflow-hidden">
            <h1
              className="text-[13px] font-semibold tracking-tight leading-none"
              style={{ color: "var(--text-primary)", fontFamily: "-apple-system, SF Pro Display, sans-serif", letterSpacing: "-0.02em" }}
            >
              SRN Command
            </h1>
            <p
              className="text-[10px] font-mono mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              Center
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-3 lg:mx-4 mb-3"
        style={{ height: "0.5px", background: "var(--glass-border-subtle)" }}
      />

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-2.5 px-2.5 py-2 rounded-[13px] transition-all duration-200 relative"
              style={{
                background: isActive
                  ? "var(--glass-fill-hover)"
                  : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                backdropFilter: isActive ? "blur(12px)" : "none",
                boxShadow: isActive ? "var(--shadow-sm), inset 0 0.5px 0 var(--glass-border-top)" : "none",
                border: isActive ? "0.5px solid var(--glass-border)" : "0.5px solid transparent",
              }}
            >
              {/* Active accent bar */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "25%",
                    bottom: "25%",
                    width: "2.5px",
                    borderRadius: "0 2px 2px 0",
                    background: "var(--accent)",
                    boxShadow: "0 0 6px var(--accent-glow)",
                  }}
                />
              )}

              {/* Icon */}
              <span
                className="flex-shrink-0 transition-colors duration-200"
                style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
              >
                {item.icon}
              </span>

              {/* Label */}
              <span
                className="hidden lg:block text-[12px] font-medium tracking-tight truncate transition-colors duration-200"
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  fontFamily: "-apple-system, SF Pro Display, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div
        className="mx-3 lg:mx-4 mt-3 mb-2"
        style={{ height: "0.5px", background: "var(--glass-border-subtle)" }}
      />

      {/* Settings */}
      <div className="px-2 pb-5">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[13px] transition-all duration-200 relative"
          style={{
            background: pathname === "/settings" ? "var(--glass-fill-hover)" : "transparent",
            color: pathname === "/settings" ? "var(--accent)" : "var(--text-muted)",
            border: pathname === "/settings" ? "0.5px solid var(--glass-border)" : "0.5px solid transparent",
            boxShadow: pathname === "/settings" ? "var(--shadow-sm)" : "none",
          }}
        >
          <span style={{ color: pathname === "/settings" ? "var(--accent)" : "var(--text-muted)" }}>
            {SETTINGS_ICON}
          </span>
          <span
            className="hidden lg:block text-[12px] font-medium tracking-tight"
            style={{
              color: pathname === "/settings" ? "var(--text-primary)" : "var(--text-secondary)",
              fontFamily: "-apple-system, SF Pro Display, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Settings
          </span>
        </Link>
      </div>
    </aside>
  );
}
