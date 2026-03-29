"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useState, useEffect } from "react";
import { fetchTemplates, addTemplate, deleteTemplate, createTodoFromTemplate, type TaskTemplate, type TodoPriority } from "@/lib/supabase";
import { RecycleBinModal, type BinTable } from "@/components/RecycleBinModal";

const ACCENTS = [
  { id: "green"  as const, label: "Emerald", color: "hsl(160, 70%, 68%)" },
  { id: "blue"   as const, label: "Ocean",   color: "hsl(217, 91%, 60%)" },
  { id: "purple" as const, label: "Violet",  color: "hsl(270, 76%, 65%)" },
  { id: "orange" as const, label: "Sunset",  color: "hsl(25, 95%, 55%)"  },
  { id: "pink"   as const, label: "Rose",    color: "hsl(330, 80%, 60%)" },
  { id: "cyan"   as const, label: "Arctic",  color: "hsl(190, 90%, 50%)" },
];

const BIN_ENTRIES: { table: BinTable; label: string; icon: string; color: string }[] = [
  { table: "todos",           label: "Tasks",          icon: "☑",  color: "#6ee7b7" },
  { table: "notes",           label: "Notes",          icon: "📝", color: "#60a5fa" },
  { table: "projects",        label: "Projects",       icon: "🚀", color: "#a78bfa" },
  { table: "decisions",       label: "Decisions",      icon: "⚖️", color: "#f59e0b" },
  { table: "learning_phases", label: "Learning Phases", icon: "📚", color: "#f87171" },
];

export default function SettingsPage() {
  const { accent, mode, setAccent, toggleMode } = useTheme();
  const [templates, setTemplates]               = useState<TaskTemplate[]>([]);
  const [showNewTemplate, setShowNewTemplate]   = useState(false);
  const [newTitle, setNewTitle]                 = useState("");
  const [newPriority, setNewPriority]           = useState<TodoPriority>("medium");
  const [newRecurrence, setNewRecurrence]       = useState<"daily" | "weekly" | "monthly" | "">("");
  const [templateError, setTemplateError]       = useState<string | null>(null);
  const [calendarCopied, setCalendarCopied]     = useState(false);
  const [activeBin, setActiveBin]               = useState<BinTable | null>(null);

  useEffect(() => { fetchTemplates().then(setTemplates).catch(() => {}); }, []);

  const handleAddTemplate = async () => {
    if (!newTitle.trim()) return;
    try {
      const t = await addTemplate({ title: newTitle.trim(), priority: newPriority, recurrence: newRecurrence || null });
      setTemplates((prev) => [t, ...prev]);
      setNewTitle(""); setShowNewTemplate(false); setTemplateError(null);
    } catch (err: any) { setTemplateError(err.message); }
  };

  const handleUseTemplate = async (t: TaskTemplate) => {
    await createTodoFromTemplate(t);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Created: ${t.title}`, type: "success" } }));
  };

  const calendarUrl  = typeof window !== "undefined" ? `${window.location.origin}/api/export-calendar` : "";
  const downloadUrl  = typeof window !== "undefined" ? `${window.location.origin}/api/export-calendar?download=true` : "";

  const copyCalendarUrl = () => {
    navigator.clipboard.writeText(calendarUrl);
    setCalendarCopied(true);
    setTimeout(() => setCalendarCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto pb-32 md:pb-10">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Settings</h1>
      </header>

      <div className="space-y-4">
        {/* Appearance */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Appearance</h2>
            <button onClick={toggleMode}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}>
              {mode === "dark" ? "☀ Light" : "🌙 Dark"}
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {ACCENTS.map((t) => (
              <button key={t.id} onClick={() => setAccent(t.id)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
                style={{ background: accent === t.id ? "var(--glass-fill-hover)" : "transparent", border: accent === t.id ? "0.5px solid var(--glass-border)" : "0.5px solid transparent" }}>
                <div className="w-7 h-7 rounded-full" style={{ backgroundColor: t.color, boxShadow: accent === t.id ? `0 0 12px ${t.color}40` : "none" }} />
                <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recycle Bins */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "20ms" }}>
          <h2 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>🗑 Recycle Bins</h2>
          <p className="text-[10px] font-mono mb-4" style={{ color: "var(--text-muted)" }}>
            Deleted items are soft-deleted and recoverable. Open any bin to restore or permanently delete.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BIN_ENTRIES.map((bin) => (
              <button key={bin.table} onClick={() => setActiveBin(bin.table)}
                className="flex items-center gap-3 p-3 rounded-[14px] text-left transition-all hover-lift"
                style={{ background: "var(--bg-card)", border: "0.5px solid var(--glass-border)" }}>
                <span className="text-lg flex-shrink-0">{bin.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium block" style={{ color: "var(--text-primary)" }}>{bin.label}</span>
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>View & restore deleted {bin.label.toLowerCase()}</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Google Calendar Sync */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
          <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Google Calendar</h2>
          <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>
            Tasks with due dates appear as all-day events. Priority shown as colored dots. Reminders set for critical and high tasks.
          </p>

          <div className="p-3 rounded-xl mb-3" style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Auto-sync (subscribe once)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg" style={{ background: "rgba(110,231,183,0.1)", color: "#6ee7b7" }}>Recommended</span>
            </div>
            <p className="text-[10px] font-mono mb-2" style={{ color: "var(--text-muted)" }}>
              Google Calendar auto-refreshes every few hours. Add this URL once and forget.
            </p>
            <div className="flex gap-2">
              <input type="text" readOnly value={calendarUrl}
                className="flex-1 rounded-lg px-3 py-1.5 text-[10px] font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-secondary)" }} />
              <button onClick={copyCalendarUrl}
                className="px-3 py-1.5 text-[10px] font-mono rounded-lg shrink-0 transition-all"
                style={{ background: calendarCopied ? "rgba(110,231,183,0.15)" : "var(--accent-muted)", color: calendarCopied ? "#6ee7b7" : "var(--accent)" }}>
                {calendarCopied ? "Copied!" : "Copy URL"}
              </button>
            </div>
            <p className="text-[9px] font-mono mt-1.5" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
              Google Calendar → Settings → Add calendar → From URL
            </p>
          </div>

          <div className="p-3 rounded-xl" style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Instant sync</span>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Download .ics and open in Google Calendar to update now
                </p>
              </div>
              <a href={downloadUrl}
                className="px-3 py-1.5 text-[10px] font-mono rounded-lg shrink-0 transition-all"
                style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                Download .ics
              </a>
            </div>
          </div>
        </div>

        {/* Task Templates */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Task templates</h2>
            <button onClick={() => setShowNewTemplate(!showNewTemplate)}
              className="text-xs font-mono px-3 py-1.5 rounded-lg"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
              {showNewTemplate ? "Cancel" : "+ New"}
            </button>
          </div>

          {showNewTemplate && (
            <div className="mb-4 p-3 rounded-xl space-y-2" style={{ background: "var(--bg-input)" }}>
              {templateError && <p className="text-xs font-mono" style={{ color: "#f87171" }}>{templateError}</p>}
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Template title…"
                className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-card)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}
                onKeyDown={(e) => e.key === "Enter" && handleAddTemplate()} />
              <div className="flex gap-2">
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TodoPriority)}
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none"
                  style={{ background: "var(--bg-card)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select value={newRecurrence} onChange={(e) => setNewRecurrence(e.target.value as any)}
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none"
                  style={{ background: "var(--bg-card)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}>
                  <option value="">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button onClick={handleAddTemplate} className="px-3 py-1.5 text-xs font-medium rounded-lg"
                  style={{ background: "var(--accent)", color: "#0a0a0b" }}>Add</button>
              </div>
            </div>
          )}

          {templates.length === 0 ? (
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              No templates yet. Create reusable task blueprints.
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "var(--bg-card)" }}>
                  <div>
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</span>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{t.priority}</span>
                      {t.recurrence && <span className="text-[10px] font-mono" style={{ color: "var(--accent)" }}>{t.recurrence}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleUseTemplate(t)}
                      className="px-2 py-1 text-[10px] font-mono rounded-lg"
                      style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>Use</button>
                    <button onClick={() => deleteTemplate(t.id).then(() => setTemplates((prev) => prev.filter((x) => x.id !== t.id)))}
                      className="px-2 py-1 text-[10px] font-mono rounded-lg"
                      style={{ color: "var(--text-muted)" }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>API</h2>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Webhook API</span>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                  POST /api/webhooks — create, update, list, delete
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-lg"
                style={{ background: "rgba(110,231,183,0.1)", color: "#6ee7b7" }}>Active</span>
            </div>
          </div>
        </div>

        {/* Shortcuts + About */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Shortcuts</h3>
            <div className="space-y-2 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
              {[["New task","N"],["Search","/"],["Board","B"],["Analytics","A"],["Tasks","T"],["AI","I"],["Close","Esc"]].map(([l, k]) => (
                <div key={l} className="flex justify-between">
                  <span>{l}</span>
                  <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}>{k}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>About</h3>
            <div className="space-y-2 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
              {[
                ["Version", "v10.7"],
                ["DB",      "Supabase"],
                ["Host",    "Vercel"],
                ["Realtime","WebSocket"],
                ["Offline", "Service Worker"],
                ["By",      "SRN"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span>{l}</span>
                  <span style={{ color: l === "By" ? "var(--accent)" : "var(--text-primary)" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeBin && <RecycleBinModal table={activeBin} onClose={() => setActiveBin(null)} />}
    </div>
  );
}
