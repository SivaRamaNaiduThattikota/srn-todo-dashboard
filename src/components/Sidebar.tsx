"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { href: "/", label: "Tasks", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: "/streaks", label: "Streaks", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
  { href: "/focus", label: "Focus", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg> },
  { href: "/notes", label: "Notes", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { href: "/board", label: "Board", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg> },
  { href: "/analytics", label: "Analytics", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="21" x2="3" y2="3"/><line x1="3" y1="21" x2="21" y2="21"/><polyline points="7,16 11,8 15,12 20,3"/></svg> },
  { href: "/review", label: "Review", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 lg:w-56 z-40 flex flex-col py-5 transition-all duration-300"
      style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border-default)", backdropFilter: "blur(20px)" }}>
      <div className="px-3 lg:px-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-muted)", border: "1px solid var(--border-default)" }}>
            <span className="font-semibold text-xs" style={{ color: "var(--accent)" }}>S</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xs font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>SRN Command</h1>
            <p className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>Center</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 lg:px-2.5 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 group"
              style={{
                background: isActive ? "var(--accent-muted)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
              }}>
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="hidden lg:block text-xs font-medium" style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-2 lg:px-2.5 mt-auto">
        <Link href="/settings" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200"
          style={{ background: pathname === "/settings" ? "var(--accent-muted)" : "transparent", color: pathname === "/settings" ? "var(--accent)" : "var(--text-muted)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <span className="hidden lg:block text-xs font-medium" style={{ color: pathname === "/settings" ? "var(--text-primary)" : "var(--text-secondary)" }}>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
