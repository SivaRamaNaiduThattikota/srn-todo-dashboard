"use client";

import { useTheme } from "@/components/ThemeProvider";

const ACCENTS = [
  { id: "green" as const, label: "Emerald", color: "hsl(160, 70%, 68%)" },
  { id: "blue" as const, label: "Ocean", color: "hsl(217, 91%, 60%)" },
  { id: "purple" as const, label: "Violet", color: "hsl(270, 76%, 65%)" },
  { id: "orange" as const, label: "Sunset", color: "hsl(25, 95%, 55%)" },
  { id: "pink" as const, label: "Rose", color: "hsl(330, 80%, 60%)" },
  { id: "cyan" as const, label: "Arctic", color: "hsl(190, 90%, 50%)" },
];

export default function SettingsPage() {
  const { accent, mode, setAccent, toggleMode } = useTheme();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Settings</h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>Customize your command center</p>
      </header>

      {/* Dark/Light Toggle */}
      <div className="glass rounded-2xl p-5 sm:p-6 mb-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Appearance</h2>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              Currently: {mode === "dark" ? "Dark mode" : "Light mode"}
            </p>
          </div>
          <button
            onClick={toggleMode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
          >
            {mode === "dark" ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
                Switch to light
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                Switch to dark
              </>
            )}
          </button>
        </div>
      </div>

      {/* Accent Color Picker */}
      <div className="glass rounded-2xl p-5 sm:p-6 mb-4 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Accent color</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ACCENTS.map((t) => (
            <button key={t.id} onClick={() => setAccent(t.id)}
              className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all duration-200"
              style={{
                background: accent === t.id ? "var(--bg-card-hover)" : "transparent",
                border: accent === t.id ? "1px solid var(--border-hover)" : "1px solid transparent",
              }}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: t.color,
                  boxShadow: accent === t.id ? `0 0 16px ${t.color}40` : "none",
                  transform: accent === t.id ? "scale(1.1)" : "scale(1)",
                }} />
              <span className="text-[10px] sm:text-xs font-mono" style={{ color: "var(--text-muted)" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Keyboard shortcuts</h3>
          <div className="space-y-2.5 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
            {[["New task", "N"], ["Search", "/"], ["Board view", "B"], ["Analytics", "A"], ["Tasks", "T"], ["AI assistant", "I"]].map(([label, key]) => (
              <div key={label} className="flex justify-between items-center">
                <span>{label}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px]" style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}>{key}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>About</h3>
          <div className="space-y-2.5 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
            {[["Version", "2.0.0"], ["Database", "Supabase PostgreSQL"], ["Hosting", "Vercel"], ["Realtime", "WebSocket"], ["UI", "Glassmorphism"], ["Built by", "SRN"]].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span>{label}</span>
                <span style={{ color: label === "Built by" ? "var(--accent)" : "var(--text-primary)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
