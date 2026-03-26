"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  {
    href: "/", label: "Tasks",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    href: "/board", label: "Board",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>,
  },
  {
    href: "/calendar", label: "Calendar",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    href: "/analytics", label: "Analytics",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="21" x2="3" y2="3"/><line x1="3" y1="21" x2="21" y2="21"/><polyline points="7,16 11,8 15,12 20,3"/></svg>,
  },
  {
    href: "/assistant", label: "AI Assistant",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 lg:w-64 z-40 flex flex-col py-6 transition-all duration-300"
      style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border-default)", backdropFilter: "blur(20px)" }}>

      {/* Logo */}
      <div className="px-4 lg:px-5 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-muted)", border: "1px solid var(--border-default)" }}>
            <span className="font-semibold text-sm" style={{ color: "var(--accent)" }}>S</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>SRN Command</h1>
            <p className="text-[10px] font-mono tracking-wider" style={{ color: "var(--text-muted)" }}>CONTROL CENTER</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 lg:px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
              style={{
                background: isActive ? "var(--accent-muted)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                border: isActive ? "1px solid hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.15)" : "1px solid transparent",
              }}>
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="hidden lg:block text-sm font-medium" style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                {item.label}
              </span>
              {isActive && <span className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="px-2 lg:px-3 mt-auto">
        <Link href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
          style={{
            background: pathname === "/settings" ? "var(--accent-muted)" : "transparent",
            color: pathname === "/settings" ? "var(--accent)" : "var(--text-muted)",
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span className="hidden lg:block text-sm font-medium" style={{ color: pathname === "/settings" ? "var(--text-primary)" : "var(--text-secondary)" }}>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
