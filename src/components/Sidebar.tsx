"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

const ICON = (d: string) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);

const PRIMARY_NAV = [
  { href: "/today", label: "Today", icon: ICON("M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM12 6v6l4 2") },
  { href: "/", label: "Tasks", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { href: "/streaks", label: "Streaks", icon: ICON("M13 2L3 14h9l-1 8 10-12h-9l1-8z") },
  { href: "/focus", label: "Focus", icon: ICON("M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM12 8v4M12 16v0") },
  { href: "/notes", label: "Notes", icon: ICON("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8") },
  { href: "/projects", label: "Projects", icon: ICON("M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z") },
];

const MORE_NAV = [
  { href: "/board", label: "Board", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="5" height="15" rx="1.5"/></svg> },
  { href: "/analytics", label: "Analytics", icon: ICON("M3 21V3M3 21h18M7 16l4-8 4 4 5-9") },
  { href: "/assistant", label: "AI", icon: ICON("M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4zM6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2") },
  { href: "/review", label: "Review", icon: ICON("M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z") },
  { href: "/decisions", label: "Decisions", icon: ICON("M16 3h5v5M8 3H3v5M12 22V8M21 3l-9 9M3 3l9 9") },
  { href: "/briefing", label: "Briefing", icon: ICON("M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4") },
  { href: "/calendar", label: "Calendar", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
];

const SETTINGS_ICON = ICON("M12 2a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42");

function NavLink({ href, label, icon, pathname }: { href: string; label: string; icon: React.ReactNode; pathname: string }) {
  const isActive = pathname === href;
  return (
    <Link href={href}
      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-[13px] transition-all duration-200 relative"
      style={{
        background: isActive ? "var(--glass-fill-hover)" : "transparent",
        color: isActive ? "var(--accent)" : "var(--text-muted)",
        backdropFilter: isActive ? "blur(12px)" : "none",
        boxShadow: isActive ? "var(--shadow-sm), inset 0 0.5px 0 var(--glass-border-top)" : "none",
        border: isActive ? "0.5px solid var(--glass-border)" : "0.5px solid transparent",
      }}>
      {isActive && <div style={{ position: "absolute", left: 0, top: "25%", bottom: "25%", width: "2.5px", borderRadius: "0 2px 2px 0", background: "var(--accent)", boxShadow: "0 0 6px var(--accent-glow)" }} />}
      <span className="flex-shrink-0" style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}>{icon}</span>
      <span className="hidden lg:block text-[12px] font-medium tracking-tight truncate" style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)", fontFamily: "-apple-system, SF Pro Display, sans-serif", letterSpacing: "-0.01em" }}>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Auto-open "More" if active page is in the More group
  useEffect(() => {
    if (MORE_NAV.some((item) => item.href === pathname)) setMoreOpen(true);
  }, [pathname]);

  return (
    <aside className="glass-sidebar fixed left-0 top-0 bottom-0 w-[60px] lg:w-[220px] z-40 flex flex-col" style={{ transition: "width 0.3s cubic-bezier(0.2,0.8,0.2,1)" }}>
      {/* Logo */}
      <div className="px-3 lg:px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, var(--accent-dim) 0%, var(--accent-muted) 100%)", border: "0.5px solid var(--glass-border-hover)", boxShadow: "0 2px 10px var(--accent-glow), inset 0 0.5px 0 rgba(255,255,255,0.25)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)", borderRadius: "11px 11px 0 0" }} />
            <span className="font-bold text-sm relative z-10" style={{ color: "var(--accent)", fontFamily: "-apple-system, SF Pro Display, sans-serif" }}>S</span>
          </div>
          <div className="hidden lg:block overflow-hidden">
            <h1 className="text-[13px] font-semibold tracking-tight leading-none" style={{ color: "var(--text-primary)", fontFamily: "-apple-system, SF Pro Display, sans-serif" }}>SRN Command</h1>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>Center</p>
          </div>
        </div>
      </div>

      <div className="mx-3 lg:mx-4 mb-3" style={{ height: "0.5px", background: "var(--glass-border-subtle)" }} />

      {/* Primary nav */}
      <nav className="flex-1 px-2 overflow-y-auto overflow-x-hidden">
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => <NavLink key={item.href} {...item} pathname={pathname} />)}
        </div>

        {/* More section */}
        <div className="mt-2">
          <button onClick={() => setMoreOpen(!moreOpen)}
            className="hidden lg:flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[13px] transition-all duration-200"
            style={{ color: "var(--text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ transform: moreOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
            <span className="text-[11px] font-medium" style={{ fontFamily: "-apple-system, SF Pro Display, sans-serif", color: "var(--text-muted)" }}>More</span>
            <span className="text-[9px] font-mono ml-auto" style={{ color: "var(--text-muted)", opacity: 0.5 }}>{MORE_NAV.length}</span>
          </button>

          {/* On collapsed sidebar (mobile), always show more items as icons */}
          <div className="lg:hidden space-y-0.5 mt-1">
            {MORE_NAV.map((item) => <NavLink key={item.href} {...item} pathname={pathname} />)}
          </div>

          {/* On expanded sidebar, show/hide based on moreOpen */}
          {moreOpen && (
            <div className="hidden lg:block space-y-0.5 mt-1 animate-fade-in">
              {MORE_NAV.map((item) => <NavLink key={item.href} {...item} pathname={pathname} />)}
            </div>
          )}
        </div>
      </nav>

      <div className="mx-3 lg:mx-4 mt-2 mb-2" style={{ height: "0.5px", background: "var(--glass-border-subtle)" }} />

      {/* Settings */}
      <div className="px-2 pb-5">
        <NavLink href="/settings" label="Settings" icon={SETTINGS_ICON} pathname={pathname} />
      </div>
    </aside>
  );
}
