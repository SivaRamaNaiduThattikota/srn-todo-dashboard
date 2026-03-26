"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Tasks", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { href: "/board", label: "Board", icon: "M3 3h5v18H3zM10 3h5v12h-5zM17 3h5v15h-5z" },
  { href: "/calendar", label: "Calendar", icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" },
  { href: "/analytics", label: "Stats", icon: "M3 3v18h18M7 16l4-8 4 4 5-9" },
  { href: "/assistant", label: "AI", icon: "M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4zM16 14H8a4 4 0 00-4 4v2h16v-2a4 4 0 00-4-4z" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav glass-heavy">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? "text-[var(--accent)] scale-110"
                  : "text-text-muted"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-4 h-0.5 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
