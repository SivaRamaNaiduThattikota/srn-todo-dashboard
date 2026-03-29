"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { fetchNotes, addNote, updateNote, deleteNote, type Note } from "@/lib/supabase";
import { RecycleBinModal } from "@/components/RecycleBinModal";

const PRESET_TAGS = ["python","sql","ml","deep-learning","llm","nlp","interview","system-design","dsa","cloud","mlops","stats","project","concept"];

function readStats(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return { words, mins: Math.max(1, Math.ceil(words / 200)) };
}

function HighlightText({ text, query, maxLen = 120 }: { text: string; query: string; maxLen?: number }) {
  if (!query.trim()) return <span>{text.length > maxLen ? text.slice(0, maxLen) + "…" : text}</span>;
  const lower = text.toLowerCase(), qLower = query.toLowerCase(), idx = lower.indexOf(qLower);
  if (idx === -1) return <span>{text.length > maxLen ? text.slice(0, maxLen) + "…" : text}</span>;
  const start = Math.max(0, idx - 30), end = Math.min(text.length, idx + query.length + 60);
  const snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  const qInSnip = snippet.toLowerCase().indexOf(qLower);
  if (qInSnip === -1) return <span>{snippet}</span>;
  return (
    <span>
      {snippet.slice(0, qInSnip)}
      <mark style={{ background: "var(--accent-muted)", color: "var(--accent)", borderRadius: "3px", padding: "0 2px" }}>
        {snippet.slice(qInSnip, qInSnip + query.length)}
      </mark>
      {snippet.slice(qInSnip + query.length)}
    </span>
  );
}

export default function NotesPage() {
  const [notes, setNotes]         = useState<Note[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [showAdd, setShowAdd]     = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle]         = useState("");
  const [content, setContent]     = useState("");
  const [tags, setTags]           = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [saving, setSaving]       = useState(false);
  const [view, setView]           = useState<"grid" | "list">("grid");
  const [showBin, setShowBin]     = useState(false);

  const [undoState, setUndoState]       = useState<{ note: Note; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const [undoProgress, setUndoProgress] = useState(100);
  const undoProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchInputRef  = useRef<HTMLInputElement>(null);

  const reload = async () => setNotes(await fetchNotes());
  useEffect(() => { fetchNotes().then((d) => { setNotes(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const tagCounts = useMemo(() => { const c: Record<string, number> = {}; notes.forEach((n) => n.tags?.forEach((t) => { c[t] = (c[t] || 0) + 1; })); return c; }, [notes]);
  const allTags   = useMemo(() => Object.keys(tagCounts).sort(), [tagCounts]);

  const filtered = useMemo(() => notes.filter((n) => {
    const q = search.toLowerCase();
    return (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags?.some((t) => t.toLowerCase().includes(q)))
        && (!filterTag || n.tags?.includes(filterTag));
  }), [notes, search, filterTag]);

  const handleSave = async () => {
    if (!title.trim() || saving) return; setSaving(true);
    try {
      const allTagsFinal = [...tags, ...(customTag.trim() ? customTag.split(",").map((t) => t.trim()).filter(Boolean) : [])];
      if (editingId) await updateNote(editingId, { title: title.trim(), content: content.trim(), tags: allTagsFinal });
      else           await addNote({ title: title.trim(), content: content.trim(), tags: allTagsFinal });
      await reload(); resetForm();
    } finally { setSaving(false); }
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id); setTitle(note.title); setContent(note.content);
    setTags(note.tags || []); setCustomTag(""); setShowAdd(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startDeleteCountdown = (note: Note) => {
    if (undoState) clearTimeout(undoState.timeoutId);
    if (undoProgressRef.current) clearInterval(undoProgressRef.current);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    setUndoProgress(100);
    let pct = 100;
    undoProgressRef.current = setInterval(() => { pct -= 2; setUndoProgress(Math.max(0, pct)); if (pct <= 0 && undoProgressRef.current) clearInterval(undoProgressRef.current); }, 100);
    const timeoutId = setTimeout(async () => { await deleteNote(note.id); setUndoState(null); if (undoProgressRef.current) clearInterval(undoProgressRef.current); }, 5000);
    setUndoState({ note, timeoutId });
  };

  const handleUndo = () => {
    if (!undoState) return;
    clearTimeout(undoState.timeoutId);
    if (undoProgressRef.current) clearInterval(undoProgressRef.current);
    setNotes((prev) => prev.find((n) => n.id === undoState.note.id) ? prev : [undoState.note, ...prev]);
    setUndoState(null);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Delete undone ✓", type: "success" } }));
  };

  const handlePin = async (note: Note) => { await updateNote(note.id, { is_pinned: !note.is_pinned }); await reload(); };
  const resetForm = () => { setShowAdd(false); setEditingId(null); setTitle(""); setContent(""); setTags([]); setCustomTag(""); };
  const toggleTag = (tag: string) => setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "/" && !["INPUT","TEXTAREA"].includes((e.target as HTMLElement).tagName)) { e.preventDefault(); searchInputRef.current?.focus(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">

      <header className="mb-5 animate-fade-in-up">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Knowledge base</h1>
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{notes.length} notes · {filtered.length !== notes.length ? `${filtered.length} shown` : "all"}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Recycle bin */}
            <button onClick={() => setShowBin(true)} className="cc-btn px-3 py-2 text-xs" title="Recycle bin">
              <span style={{ position: "relative", zIndex: 3 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </span>
            </button>
            {/* View toggle */}
            <button onClick={() => setView(view === "grid" ? "list" : "grid")} className="cc-btn px-3 py-2 text-xs" title={view === "grid" ? "List view" : "Grid view"}>
              <span style={{ position: "relative", zIndex: 3 }}>
                {view === "grid"
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                }
              </span>
            </button>
            {!showAdd && (
              <button onClick={() => { resetForm(); setShowAdd(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="cc-btn cc-btn-accent px-3 sm:px-4 py-2 text-xs">
                <span style={{ position: "relative", zIndex: 3 }}><span className="hidden sm:inline">+ New note</span><span className="sm:hidden">+ New</span></span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="relative mb-3 animate-fade-in-up" style={{ animationDelay: "15ms" }}>
        <div className="flex items-center gap-2 rounded-[14px] px-3 transition-all"
          style={{ background: "var(--cc-glass-base)", border: `0.5px solid ${search ? "var(--accent)" : "var(--cc-tile-border)"}`, backdropFilter: "blur(20px) saturate(1.8)", boxShadow: search ? "0 0 0 3px var(--accent-muted), var(--cc-outer-shadow)" : "var(--cc-outer-shadow)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: search ? "var(--accent)" : "var(--cc-text-muted)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input ref={searchInputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder='Search notes… (press "/" to focus)'
            className="flex-1 bg-transparent py-2.5 text-xs font-mono focus:outline-none" style={{ color: "var(--text-primary)", minWidth: 0 }} />
          {search && <span className="text-[9px] font-mono flex-shrink-0 px-2 py-0.5 rounded-lg" style={{ background: filtered.length > 0 ? "var(--accent-muted)" : "rgba(248,65,65,0.12)", color: filtered.length > 0 ? "var(--accent)" : "#f87171" }}>{filtered.length}/{notes.length}</span>}
          {search && <button onClick={() => setSearch("")} className="w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0" style={{ color: "var(--cc-text-muted)", background: "var(--glass-fill)" }}>×</button>}
        </div>
      </div>

      {/* Tag filters */}
      <div className="flex gap-1.5 mb-4 animate-fade-in-up pb-0.5" style={{ animationDelay: "25ms", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        <button onClick={() => setFilterTag("")} className="flex items-center gap-1.5 rounded-[11px] text-[10px] font-mono transition-all flex-shrink-0"
          style={{ padding: "7px 12px", background: !filterTag ? "var(--accent-muted)" : "var(--glass-fill)", border: `0.5px solid ${!filterTag ? "var(--accent-dim)" : "var(--glass-border)"}`, color: !filterTag ? "var(--accent)" : "var(--cc-text-muted)", backdropFilter: "blur(12px)" }}>
          All <span style={{ opacity: 0.65 }}>({notes.length})</span>
        </button>
        {allTags.map((t) => {
          const active = filterTag === t;
          return (
            <button key={t} onClick={() => setFilterTag(active ? "" : t)}
              className="flex items-center gap-1.5 rounded-[11px] text-[10px] font-mono transition-all flex-shrink-0"
              style={{ padding: "7px 12px", background: active ? "var(--accent-muted)" : "var(--glass-fill)", border: `0.5px solid ${active ? "var(--accent-dim)" : "var(--glass-border)"}`, color: active ? "var(--accent)" : "var(--cc-text-muted)", backdropFilter: "blur(12px)", whiteSpace: "nowrap" }}>
              {t} <span style={{ opacity: 0.65 }}>({tagCounts[t] || 0})</span>
            </button>
          );
        })}
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="spatial p-4 sm:p-6 mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit note" : "New note"}</h2>
            <button onClick={resetForm} className="px-3 py-2 text-xs rounded-xl" style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>Cancel</button>
          </div>
          <div className="space-y-3">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title *" autoFocus
              className="w-full rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="ML concepts, code snippets, interview questions, formulas…"
              rows={8} className="w-full rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none resize-y"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)", minHeight: "120px" }} />
            {content && <p className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{readStats(content).words} words · ~{readStats(content).mins} min read</p>}
            <div>
              <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Tags</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_TAGS.map((t) => (
                  <button key={t} onClick={() => toggleTag(t)} className="px-2.5 py-1.5 text-[10px] font-mono rounded-xl transition-all"
                    style={{ background: tags.includes(t) ? "var(--accent-muted)" : "var(--bg-input)", color: tags.includes(t) ? "var(--accent)" : "var(--text-muted)", border: `0.5px solid ${tags.includes(t) ? "var(--accent-dim)" : "var(--border-default)"}` }}>
                    {t}
                  </button>
                ))}
              </div>
              <input value={customTag} onChange={(e) => setCustomTag(e.target.value)} placeholder="Custom tags (comma separated)"
                className="w-full rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
            </div>
            <button onClick={handleSave} disabled={!title.trim() || saving}
              className="w-full py-3 text-xs font-medium rounded-2xl disabled:opacity-30 transition-all"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Save note"}
            </button>
          </div>
        </div>
      )}

      {/* Notes grid/list */}
      {loading ? (
        <div className="text-center py-16"><span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading…</span></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 liquid-glass rounded-[22px] animate-fade-in">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{notes.length === 0 ? "No notes yet" : search ? `No results for "${search}"` : "No notes match this tag"}</p>
          <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>{notes.length === 0 ? "Save ML concepts, code snippets, and interview questions here" : "Try a different search or tag filter"}</p>
          {(search || filterTag) && <button onClick={() => { setSearch(""); setFilterTag(""); }} className="px-4 py-2 text-xs font-medium rounded-xl" style={{ background: "var(--glass-fill-hover)", color: "var(--text-primary)", border: "0.5px solid var(--glass-border)" }}>Clear filters</button>}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((note, i) => {
            const { words, mins } = readStats(note.content || "");
            const isPendingDelete = undoState?.note.id === note.id;
            return (
              <div key={note.id}
                className="liquid-glass rounded-[20px] p-4 hover-lift animate-fade-in-up cursor-pointer group relative overflow-hidden"
                style={{ animationDelay: `${i * 25}ms`, borderColor: note.is_pinned ? "hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.28)" : "var(--glass-border)", opacity: isPendingDelete ? 0.4 : 1, transition: "opacity 0.3s ease" }}
                onClick={() => handleEdit(note)}>
                {note.is_pinned && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, var(--accent) 0%, transparent 100%)" }} />}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-xs font-semibold leading-snug line-clamp-2 flex-1" style={{ color: "var(--text-primary)" }}>{note.title}</h3>
                  <div className="flex gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handlePin(note); }} className="w-7 h-7 flex items-center justify-center rounded-lg transition-all" style={{ color: note.is_pinned ? "var(--accent)" : "var(--cc-text-muted)", background: note.is_pinned ? "var(--accent-muted)" : "var(--glass-fill)" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill={note.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); startDeleteCountdown(note); }} className="w-7 h-7 flex items-center justify-center rounded-lg transition-all" style={{ color: "#f87171", background: "rgba(248,65,65,0.08)" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] sm:text-[11px] font-mono mb-2.5" style={{ color: "var(--text-secondary)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  <HighlightText text={note.content || "Empty note"} query={search} maxLen={140} />
                </p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex gap-1 flex-wrap">
                    {note.tags?.slice(0, 3).map((t) => <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded-lg" style={{ background: filterTag === t ? "var(--accent-muted)" : "var(--bg-input)", color: filterTag === t ? "var(--accent)" : "var(--text-muted)" }}>{t}</span>)}
                    {(note.tags?.length || 0) > 3 && <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>+{(note.tags?.length || 0) - 3}</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {note.content && <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{mins}m read</span>}
                    <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{new Date(note.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((note, i) => {
            const { mins } = readStats(note.content || "");
            const isPendingDelete = undoState?.note.id === note.id;
            return (
              <div key={note.id}
                className="liquid-glass rounded-[16px] px-4 py-3 hover-lift animate-fade-in-up cursor-pointer group flex items-start gap-3 relative overflow-hidden"
                style={{ animationDelay: `${i * 20}ms`, borderColor: note.is_pinned ? "hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.22)" : "var(--glass-border)", opacity: isPendingDelete ? 0.4 : 1, transition: "opacity 0.3s ease" }}
                onClick={() => handleEdit(note)}>
                {note.is_pinned && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: "2px", background: "var(--accent)", borderRadius: "0 2px 2px 0" }} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{note.title}</h3>
                    {note.tags?.slice(0, 4).map((t) => <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded-lg" style={{ background: filterTag === t ? "var(--accent-muted)" : "var(--bg-input)", color: filterTag === t ? "var(--accent)" : "var(--text-muted)" }}>{t}</span>)}
                  </div>
                  {note.content && <p className="text-[10px] font-mono line-clamp-1" style={{ color: "var(--text-secondary)" }}><HighlightText text={note.content} query={search} maxLen={100} /></p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {note.content && <span className="text-[8px] font-mono hidden sm:block" style={{ color: "var(--text-muted)" }}>{mins}m</span>}
                  <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>{new Date(note.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                  <button onClick={(e) => { e.stopPropagation(); handlePin(note); }} className="w-7 h-7 flex items-center justify-center rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all" style={{ color: note.is_pinned ? "var(--accent)" : "var(--cc-text-muted)", background: note.is_pinned ? "var(--accent-muted)" : "var(--glass-fill)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill={note.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); startDeleteCountdown(note); }} className="w-7 h-7 flex items-center justify-center rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all" style={{ color: "#f87171", background: "rgba(248,65,65,0.08)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Undo toast */}
      {undoState && (
        <div className="fixed left-1/2 animate-slide-up z-50" style={{ transform: "translateX(-50%)", bottom: "calc(80px + env(safe-area-inset-bottom,0px) + 8px)", width: "calc(100vw - 32px)", maxWidth: "360px" }}>
          <div className="rounded-[16px] px-4 py-3 flex items-center gap-3 relative overflow-hidden" style={{ background: "var(--cc-glass-base)", border: "0.5px solid var(--cc-tile-border)", backdropFilter: "blur(32px) saturate(2)", boxShadow: "var(--cc-outer-shadow)" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, height: "2.5px", background: "#f87171", width: `${undoProgress}%`, transition: "width 0.1s linear", borderRadius: "0 0 0 16px" }} />
            <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--cc-text)" }}>Deleted "{undoState.note.title}"</span>
            <button onClick={handleUndo} className="text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0" style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>Undo</button>
            <button onClick={() => { clearTimeout(undoState.timeoutId); deleteNote(undoState.note.id); setUndoState(null); }} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "var(--cc-text-muted)", fontSize: "16px" }}>×</button>
          </div>
        </div>
      )}

      {showBin && <RecycleBinModal table="notes" onClose={() => setShowBin(false)} onRestored={reload} />}
    </div>
  );
}
