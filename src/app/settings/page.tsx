"use client";

import { useTheme } from "@/components/ThemeProvider";

const THEMES = [
  { id: "green" as const, label: "Emerald", color: "hsl(160, 70%, 68%)" },
  { id: "blue" as const, label: "Ocean", color: "hsl(217, 91%, 60%)" },
  { id: "purple" as const, label: "Violet", color: "hsl(270, 76%, 65%)" },
  { id: "orange" as const, label: "Sunset", color: "hsl(25, 95%, 55%)" },
  { id: "pink" as const, label: "Rose", color: "hsl(330, 80%, 60%)" },
  { id: "cyan" as const, label: "Arctic", color: "hsl(190, 90%, 50%)" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-xs sm:text-sm text-text-muted font-mono mt-1">Customize your command center</p>
      </header>

      {/* Theme Picker */}
      <div className="glass rounded-2xl p-5 sm:p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <h2 className="text-sm font-medium text-white mb-4">Accent color</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all duration-300 ${
                theme === t.id
                  ? "glass-heavy ring-2 ring-white/20 scale-105"
                  : "hover:bg-white/5"
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-300 ${
                  theme === t.id ? "scale-110 shadow-lg" : ""
                }`}
                style={{
                  backgroundColor: t.color,
                  boxShadow: theme === t.id ? `0 0 20px ${t.color}40` : "none",
                }}
              />
              <span className="text-[10px] sm:text-xs font-mono text-text-muted">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <h3 className="text-sm font-medium text-white mb-2">Keyboard shortcuts</h3>
          <div className="space-y-2 text-xs font-mono text-text-muted">
            <div className="flex justify-between"><span>New task</span><span className="glass px-2 py-0.5 rounded text-text-secondary">N</span></div>
            <div className="flex justify-between"><span>Search</span><span className="glass px-2 py-0.5 rounded text-text-secondary">/</span></div>
            <div className="flex justify-between"><span>Board view</span><span className="glass px-2 py-0.5 rounded text-text-secondary">B</span></div>
            <div className="flex justify-between"><span>Analytics</span><span className="glass px-2 py-0.5 rounded text-text-secondary">A</span></div>
            <div className="flex justify-between"><span>Tasks</span><span className="glass px-2 py-0.5 rounded text-text-secondary">T</span></div>
            <div className="flex justify-between"><span>AI assistant</span><span className="glass px-2 py-0.5 rounded text-text-secondary">I</span></div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <h3 className="text-sm font-medium text-white mb-2">About</h3>
          <div className="space-y-2 text-xs font-mono text-text-muted">
            <div className="flex justify-between"><span>Version</span><span>2.0.0</span></div>
            <div className="flex justify-between"><span>Database</span><span>Supabase PostgreSQL</span></div>
            <div className="flex justify-between"><span>Hosting</span><span>Vercel</span></div>
            <div className="flex justify-between"><span>Realtime</span><span>WebSocket</span></div>
            <div className="flex justify-between"><span>UI</span><span>Glassmorphism + Liquid</span></div>
            <div className="flex justify-between"><span>Built by</span><span className="text-[var(--accent)]">SRN</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
