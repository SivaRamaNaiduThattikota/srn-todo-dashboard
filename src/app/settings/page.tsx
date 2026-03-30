"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useState, useEffect, useRef } from "react";
import { supabase, fetchTemplates, addTemplate, deleteTemplate, createTodoFromTemplate, type TaskTemplate, type TodoPriority } from "@/lib/supabase";
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
  { table: "todos",           label: "Tasks",           icon: "☑",  color: "#6ee7b7" },
  { table: "notes",           label: "Notes",           icon: "📝", color: "#60a5fa" },
  { table: "projects",        label: "Projects",        icon: "🚀", color: "#a78bfa" },
  { table: "decisions",       label: "Decisions",       icon: "⚖️", color: "#f59e0b" },
  { table: "learning_phases", label: "Learning Phases", icon: "📚", color: "#f87171" },
];

export default function SettingsPage() {
  const { accent, mode, setAccent, toggleMode } = useTheme();
  const [templates, setTemplates]               = useState<TaskTemplate[]>([]);
  const [showNewTemplate, setShowNewTemplate]   = useState(false);
  const [templatesOpen, setTemplatesOpen]       = useState(false);   // ← collapsible
  const [newTitle, setNewTitle]                 = useState("");
  const [newPriority, setNewPriority]           = useState<TodoPriority>("medium");
  const [newRecurrence, setNewRecurrence]       = useState<"daily" | "weekly" | "monthly" | "">("");
  const [templateError, setTemplateError]       = useState<string | null>(null);
  const [calendarCopied, setCalendarCopied]     = useState(false);
  const [activeBin, setActiveBin]               = useState<BinTable | null>(null);
  const [exportLoading, setExportLoading]       = useState<string | null>(null);
  const [exportStatus,  setExportStatus]        = useState<string | null>(null);
  const [importStatus,  setImportStatus]        = useState<string | null>(null);
  const [importLoading, setImportLoading]       = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates().then((t) => {
      setTemplates(t);
      if (t.length > 0) setTemplatesOpen(true);
    }).catch(() => {});
  }, []);

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

  // ─────────────────────────────────────────────────────────────────
  // EXPORT — downloads data from Supabase as JSON / CSV
  // ─────────────────────────────────────────────────────────────────
  const handleExport = async (type: "all" | "tasks" | "focus" | "learning") => {
    setExportLoading(type);
    setExportStatus(null);
    try {
      let filename = "";
      let content  = "";

      if (type === "all") {
        const [todos, notes, projects, decisions, sessions, habits, habitLog, lp, lwp, ip] = await Promise.all([
          supabase.from("todos").select("*").order("created_at"),
          supabase.from("notes").select("*").order("created_at"),
          supabase.from("projects").select("*").order("sort_order"),
          supabase.from("decisions").select("*").order("created_at"),
          supabase.from("focus_sessions").select("*").order("started_at"),
          supabase.from("daily_habits").select("*").order("sort_order"),
          supabase.from("habit_log").select("*").order("completed_date"),
          supabase.from("learning_progress").select("*"),
          supabase.from("learning_week_progress").select("*"),
          supabase.from("interview_prep").select("*"),
        ]);
        const backup = {
          exported_at: new Date().toISOString(),
          version: "v11.2",
          note: "To restore: run supabase-master-migration.sql on new DB, then use Import button.",
          tables: {
            todos:                  todos.data    || [],
            notes:                  notes.data    || [],
            projects:               projects.data || [],
            decisions:              decisions.data || [],
            focus_sessions:         sessions.data || [],
            daily_habits:           habits.data   || [],
            habit_log:              habitLog.data || [],
            learning_progress:      lp.data       || [],
            learning_week_progress: lwp.data      || [],
            interview_prep:         ip.data       || [],
          },
        };
        content  = JSON.stringify(backup, null, 2);
        filename = `srn-full-backup-${new Date().toISOString().slice(0, 10)}.json`;

      } else if (type === "tasks") {
        const { data } = await supabase.from("todos").select("*").order("created_at");
        const rows    = data || [];
        const headers = ["id","title","status","priority","category","due_date","start_date","completed_at","tags","estimated_mins","created_at","updated_at"];
        const csv = [
          headers.join(","),
          ...rows.map(r => headers.map(h => {
            const v = (r as any)[h];
            const s = Array.isArray(v) ? v.join("|") : String(v ?? "");
            return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s;
          }).join(",")),
        ].join("\n");
        content  = csv;
        filename = `srn-tasks-${new Date().toISOString().slice(0, 10)}.csv`;

      } else if (type === "focus") {
        const { data } = await supabase.from("focus_sessions").select("*").order("started_at");
        const rows    = data || [];
        const headers = ["id","todo_id","duration_minutes","completed","started_at","ended_at"];
        const csv = [
          headers.join(","),
          ...rows.map(r => headers.map(h => String((r as any)[h] ?? "")).join(",")),
        ].join("\n");
        content  = csv;
        filename = `srn-focus-sessions-${new Date().toISOString().slice(0, 10)}.csv`;

      } else if (type === "learning") {
        const [lp, lwp] = await Promise.all([
          supabase.from("learning_progress").select("*"),
          supabase.from("learning_week_progress").select("*"),
        ]);
        content  = JSON.stringify({ exported_at: new Date().toISOString(), learning_progress: lp.data || [], learning_week_progress: lwp.data || [] }, null, 2);
        filename = `srn-learning-progress-${new Date().toISOString().slice(0, 10)}.json`;
      }

      const blob = new Blob([content], { type: filename.endsWith(".json") ? "application/json" : "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);

      setExportStatus(`✓ Downloaded ${filename}`);
      setTimeout(() => setExportStatus(null), 4000);
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Exported: ${filename}`, type: "success" } }));

    } catch (err: any) {
      setExportStatus(`✕ ${err.message || "Export failed"}`);
    } finally { setExportLoading(null); }
  };

  // ─────────────────────────────────────────────────────────────────
  // IMPORT — reads exported JSON and upserts back into Supabase
  // How it works:
  //   1. You click "Import from backup"
  //   2. Pick the srn-full-backup-YYYY-MM-DD.json file
  //   3. It reads the file, loops through each table
  //   4. Upserts every row back into Supabase (insert or update by id)
  //   5. Your data is fully restored on the new database
  // ─────────────────────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportStatus(null);

    try {
      // Step 1: Read the file
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.tables) throw new Error("Invalid backup file — missing tables key");

      const { tables } = backup;
      const results: string[] = [];

      // Step 2: Upsert each table (insert if not exists, update if id matches)
      const tableMap: Record<string, string> = {
        todos:                  "todos",
        notes:                  "notes",
        projects:               "projects",
        decisions:              "decisions",
        focus_sessions:         "focus_sessions",
        daily_habits:           "daily_habits",
        habit_log:              "habit_log",
        learning_progress:      "learning_progress",
        learning_week_progress: "learning_week_progress",
        interview_prep:         "interview_prep",
      };

      for (const [key, tableName] of Object.entries(tableMap)) {
        const rows: any[] = tables[key] || [];
        if (rows.length === 0) continue;

        // Upsert in batches of 100 to avoid payload limits
        const batchSize = 100;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const { error } = await supabase
            .from(tableName)
            .upsert(batch, { onConflict: "id" });
          if (error) throw new Error(`Failed on ${tableName}: ${error.message}`);
          inserted += batch.length;
        }
        results.push(`${tableName}: ${inserted} rows`);
      }

      const summary = `✓ Restored ${results.length} tables`;
      setImportStatus(summary);
      window.dispatchEvent(new CustomEvent("srn:toast", {
        detail: { message: `Import complete! ${results.join(", ")}`, type: "success" },
      }));

      // Reset file input
      if (importFileRef.current) importFileRef.current.value = "";

    } catch (err: any) {
      setImportStatus(`✕ ${err.message || "Import failed"}`);
      window.dispatchEvent(new CustomEvent("srn:toast", {
        detail: { message: err.message || "Import failed", type: "error" },
      }));
    } finally {
      setImportLoading(false);
    }
  };

  const calendarUrl  = typeof window !== "undefined" ? `${window.location.origin}/api/export-calendar` : "";
  const downloadUrl  = typeof window !== "undefined" ? `${window.location.origin}/api/export-calendar?download=true` : "";
  const copyCalendarUrl = () => {
    navigator.clipboard.writeText(calendarUrl);
    setCalendarCopied(true);
    setTimeout(() => setCalendarCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto pb-32 md:pb-10">
      <header className="mb-6 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>Settings</h1>
        <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>Preferences, templates & data</p>
      </header>

      <div className="space-y-4">

        {/* ── Appearance ── */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up">
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>Appearance</h2>
          <div className="flex items-center justify-between mb-4 pb-4"
            style={{ borderBottom: "0.5px solid var(--glass-border)" }}>
            <div>
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                {mode === "dark" ? "Dark mode" : "Light mode"}
              </span>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>Toggle theme</p>
            </div>
            <button onClick={toggleMode}
              className="relative w-11 h-6 rounded-full transition-all duration-300"
              style={{ background: mode === "dark" ? "var(--accent)" : "rgba(120,120,128,0.32)" }}>
              <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
                style={{ left: mode === "dark" ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>
          <p className="text-xs font-medium mb-3" style={{ color: "var(--text-primary)" }}>Accent colour</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ACCENTS.map((a) => (
              <button key={a.id} onClick={() => setAccent(a.id)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
                style={{ background: accent === a.id ? "var(--glass-fill)" : "transparent",
                  border: `0.5px solid ${accent === a.id ? "var(--glass-border)" : "transparent"}` }}>
                <div className="w-7 h-7 rounded-full relative"
                  style={{ background: a.color, boxShadow: accent === a.id ? `0 0 12px ${a.color}88` : "none" }}>
                  {accent === a.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5"/>
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Recycle Bin ── */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
          <h2 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Recycle Bin</h2>
          <p className="text-[10px] font-mono mb-3" style={{ color: "var(--text-muted)" }}>
            Soft-deleted items are kept here until permanently removed.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BIN_ENTRIES.map((entry) => (
              <button key={entry.table} onClick={() => setActiveBin(entry.table)}
                className="flex items-center gap-2 p-3 rounded-xl text-left transition-all hover:opacity-80"
                style={{ background: `${entry.color}12`, border: `0.5px solid ${entry.color}30` }}>
                <span style={{ fontSize: "16px" }}>{entry.icon}</span>
                <span className="text-xs font-medium" style={{ color: entry.color }}>{entry.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Google Calendar ── */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h2 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Google Calendar Sync</h2>
          <p className="text-[10px] font-mono mb-3" style={{ color: "var(--text-muted)" }}>
            Subscribe to your tasks in Google Calendar (tasks with due dates).
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] font-mono px-3 py-2 rounded-xl truncate"
                style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "0.5px solid var(--glass-border)" }}>
                {calendarUrl || "https://your-domain.vercel.app/api/export-calendar"}
              </code>
              <button onClick={copyCalendarUrl}
                className="px-3 py-2 text-[10px] font-mono rounded-xl flex-shrink-0 transition-all"
                style={{ background: calendarCopied ? "var(--accent-muted)" : "var(--bg-input)",
                  color: calendarCopied ? "var(--accent)" : "var(--text-secondary)", border: "0.5px solid var(--glass-border)" }}>
                {calendarCopied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <a href={downloadUrl} download="srn-tasks.ics"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-mono w-fit transition-all hover:opacity-80"
              style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
              ↓ Download .ics file
            </a>
          </div>
        </div>

        {/* ── Task Templates — collapsible ── */}
        <div className="glass rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          {/* Header row — clicking toggles the card */}
          <button
            className="w-full flex items-center justify-between p-5 text-left"
            onClick={() => setTemplatesOpen(!templatesOpen)}>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Task Templates</h2>
              {templates.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
                  {templates.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {templatesOpen && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowNewTemplate(!showNewTemplate); }}
                  className="px-3 py-1.5 text-[10px] font-mono rounded-xl transition-all"
                  style={{ background: showNewTemplate ? "var(--accent-muted)" : "var(--bg-input)",
                    color: showNewTemplate ? "var(--accent)" : "var(--text-secondary)",
                    border: "0.5px solid var(--glass-border)" }}>
                  {showNewTemplate ? "✕" : "+ New"}
                </button>
              )}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ color: "var(--text-muted)", transform: templatesOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </button>

          {/* Collapsed: just show count summary */}
          {!templatesOpen && templates.length > 0 && (
            <div className="px-5 pb-4">
              <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                {templates.slice(0, 3).map(t => t.title).join(" · ")}
                {templates.length > 3 ? ` · +${templates.length - 3} more` : ""}
              </p>
            </div>
          )}
          {!templatesOpen && templates.length === 0 && (
            <div className="px-5 pb-4">
              <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>No templates yet — tap to add one.</p>
            </div>
          )}

          {/* Expanded body */}
          {templatesOpen && (
            <div className="px-5 pb-5" style={{ borderTop: "0.5px solid var(--glass-border)" }}>
              {showNewTemplate && (
                <div className="space-y-2 mt-4 mb-3 p-3 rounded-xl" style={{ background: "var(--bg-card)" }}>
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Template title…"
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl focus:outline-none"
                    style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTemplate()} />
                  <div className="flex gap-2">
                    <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TodoPriority)}
                      className="flex-1 text-[10px] font-mono px-2 py-1.5 rounded-xl focus:outline-none"
                      style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-secondary)" }}>
                      {["critical","high","medium","low"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={newRecurrence} onChange={(e) => setNewRecurrence(e.target.value as any)}
                      className="flex-1 text-[10px] font-mono px-2 py-1.5 rounded-xl focus:outline-none"
                      style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-secondary)" }}>
                      <option value="">One-time</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  {templateError && <p className="text-[10px] font-mono" style={{ color: "#f87171" }}>{templateError}</p>}
                  <button onClick={handleAddTemplate}
                    className="w-full py-2 text-xs font-mono rounded-xl transition-all"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
                    ✓ Save template
                  </button>
                </div>
              )}

              {templates.length === 0 && !showNewTemplate ? (
                <p className="text-[10px] font-mono mt-4" style={{ color: "var(--text-muted)" }}>No templates yet.</p>
              ) : (
                <div className="space-y-1.5 mt-4">
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
                        <button onClick={() => deleteTemplate(t.id).then(() => setTemplates(prev => prev.filter(x => x.id !== t.id)))}
                          className="px-2 py-1 text-[10px] font-mono rounded-lg"
                          style={{ color: "var(--text-muted)" }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Export & Backup ── */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Export & Backup</h2>
            {(exportStatus || importStatus) && (
              <span className="text-[10px] font-mono px-2 py-1 rounded-lg"
                style={{
                  background: (exportStatus || importStatus || "").includes("✓") ? "rgba(94,207,149,0.12)" : "rgba(248,65,65,0.12)",
                  color:      (exportStatus || importStatus || "").includes("✓") ? "#5ecf95" : "#f87171",
                }}>
                {exportStatus || importStatus}
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono mb-4" style={{ color: "var(--text-muted)" }}>
            Export downloads your data from Supabase. Import restores it to any database.
            The master SQL only recreates structure — not your actual data.
          </p>

          {/* Export buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {([
              { label: "Export All Data",         desc: "Complete backup — all tables as JSON", icon: "💾", action: "all"      as const, accent: "#5ecf95" },
              { label: "Export Tasks (CSV)",       desc: "All tasks, status, priority, dates",  icon: "☑",  action: "tasks"    as const, accent: "#4da6ff" },
              { label: "Export Focus Sessions",    desc: "All focus sessions with durations",   icon: "⏱",  action: "focus"    as const, accent: "#f5a623" },
              { label: "Export Learning Progress", desc: "Phase topic progress as JSON",        icon: "📚", action: "learning" as const, accent: "#b48eff" },
            ]).map((btn) => (
              <button key={btn.action}
                onClick={() => handleExport(btn.action)}
                disabled={exportLoading === btn.action}
                className="flex items-start gap-3 p-3 rounded-xl text-left transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: `${btn.accent}12`, border: `0.5px solid ${btn.accent}30` }}>
                <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "1px" }}>{btn.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: btn.accent }}>
                    {exportLoading === btn.action ? "Exporting…" : btn.label}
                  </p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{btn.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Import button + explanation */}
          <div className="rounded-xl p-4 mb-3"
            style={{ background: "rgba(77,166,255,0.06)", border: "0.5px solid rgba(77,166,255,0.20)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#4da6ff" }}>
              📥 Import from backup
            </p>
            <p className="text-[10px] font-mono mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              How it works: pick the <code style={{ color: "#4da6ff" }}>srn-full-backup-*.json</code> file
              you exported earlier → it reads every row → upserts back into your Supabase database.
              Safe to run on a fresh DB after running the master SQL.
            </p>

            {/* Hidden file input */}
            <input
              ref={importFileRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: "none" }}
              id="import-file-input"
            />

            <label htmlFor="import-file-input"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-90 w-fit"
              style={{
                background: importLoading ? "rgba(77,166,255,0.08)" : "rgba(77,166,255,0.14)",
                border: "0.5px solid rgba(77,166,255,0.35)",
                color: "#4da6ff",
                pointerEvents: importLoading ? "none" : "auto",
                opacity: importLoading ? 0.6 : 1,
              }}>
              {importLoading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: "spinSlow 1s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <span className="text-xs font-semibold">Importing…</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  <span className="text-xs font-semibold">Import from backup (.json)</span>
                </>
              )}
            </label>

            {importStatus && (
              <p className="text-[10px] font-mono mt-2"
                style={{ color: importStatus.includes("✓") ? "#5ecf95" : "#f87171" }}>
                {importStatus}
              </p>
            )}
          </div>

          {/* Warning note */}
          <div className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: "rgba(248,65,65,0.06)", border: "0.5px solid rgba(248,65,65,0.20)" }}>
            <span style={{ fontSize: "14px", flexShrink: 0 }}>⚠️</span>
            <div>
              <p className="text-[10px] font-mono font-semibold" style={{ color: "#f87171" }}>
                Supabase free: 500MB · no time limit · projects pause after 7 days inactive
              </p>
              <p className="text-[10px] font-mono mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Switching databases: run master SQL on new DB → click Import → pick your backup file.
                Export monthly as a safety habit. Your data is yours.
              </p>
            </div>
          </div>
        </div>

        {/* ── API ── */}
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

        {/* ── Shortcuts + About ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Shortcuts</h3>
            <div className="space-y-2 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
              {[["New task","N"],["Search","/"],["Board","B"],["Analytics","A"],["Tasks","T"],["AI","I"],["Close","Esc"]].map(([l, k]) => (
                <div key={l} className="flex justify-between">
                  <span>{l}</span>
                  <span className="px-1.5 py-0.5 rounded"
                    style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}>{k}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>About</h3>
            <div className="space-y-2 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
              {[
                ["Version", "v11.2"],
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
