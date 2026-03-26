"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  {
    href: "/today",
    label: "Today",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: "/",
    label: "Tasks",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    href: "/focus",
    label: "Focus",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        background: "var(--glass-fill-sidebar)",
        borderTop: "0.5px solid var(--glass-border)",
        backdropFilter: "blur(40px) saturate(1.8)",
        WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        boxShadow: "0 -1px 0 var(--glass-border-subtle), 0 -8px 32px rgba(0,0,0,0.15)",
      }}
    >
      {/* Top highlight line — glass specular */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "10%",
          right: "10%",
          height: "0.5px",
          background: "linear-gradient(90deg, transparent, var(--glass-border-top), transparent)",
          pointerEvents: "none",
        }}
      />

      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-[14px] transition-all duration-200 relative"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                background: isActive ? "var(--glass-fill-hover)" : "transparent",
                border: isActive ? "0.5px solid var(--glass-border)" : "0.5px solid transparent",
                boxShadow: isActive ? "var(--shadow-sm)" : "none",
                backdropFilter: isActive ? "blur(12px)" : "none",
                minWidth: "52px",
              }}
            >
              {/* Active glow dot */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: "6px",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    boxShadow: "0 0 6px var(--accent-glow)",
                  }}
                />
              )}

              <span style={{ marginTop: isActive ? "8px" : "0" }}>
                {item.icon}
              </span>

              <span
                className="text-[9px] font-medium"
                style={{
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  fontFamily: "-apple-system, SF Pro Display, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
