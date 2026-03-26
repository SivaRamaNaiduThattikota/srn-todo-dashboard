"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Tasks", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { href: "/board", label: "Board", icon: "M3 3h5v18H3zM10 3h5v12h-5zM17 3h5v15h-5z" },
  { href: "/calendar", label: "Calendar", icon: "M8 2v4M16 2v4M3 10h18M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2z" },
  { href: "/analytics", label: "Analytics", icon: "M3 3v18h18M7 16l4-8 4 4 5-9" },
  { href: "/assistant", label: "AI Assistant", icon: "M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4zM16 14H8a4 4 0 00-4 4v2h16v-2a4 4 0 00-4-4z" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 lg:w-64 glass-heavy z-40 flex flex-col py-6 transition-all duration-500">
      <div className="px-4 lg:px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center flex-shrink-0 skeuo-raised">
            <span className="text-[var(--accent)] font-semibold text-sm">S</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-sm font-semibold text-white tracking-tight">SRN Command</h1>
            <p className="text-[10px] text-text-muted font-mono tracking-wider">CONTROL CENTER</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 lg:px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                isActive ? "liquid-glass text-white" : "text-text-muted hover:text-white hover:bg-white/5"
              }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                className={`flex-shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                <path d={item.icon} />
              </svg>
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
              {isActive && <span className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 lg:px-3 mt-auto">
        <Link href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
            pathname === "/settings" ? "liquid-glass text-white" : "text-text-muted hover:text-white hover:bg-white/5"
          }`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          <span className="hidden lg:block text-sm font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
