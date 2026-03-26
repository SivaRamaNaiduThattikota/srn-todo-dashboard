"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/today", label: "Today" },
  { href: "/", label: "Tasks" },
  { href: "/streaks", label: "Streaks" },
  { href: "/focus", label: "Focus" },
  { href: "/notes", label: "Notes" },
];

const ICONS: Record<string, string> = {
  "/today": "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM12 6v6l4 2",
  "/": "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  "/streaks": "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  "/focus": "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM12 8v4M12 16v0",
  "/notes": "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8",
};

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border-default)", backdropFilter: "blur(20px)" }}>
      <div className="flex items-center justify-around px-1 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200"
              style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={ICONS[item.href]} />
              </svg>
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
