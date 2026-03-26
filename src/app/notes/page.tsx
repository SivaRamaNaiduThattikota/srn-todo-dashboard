"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchNotes, addNote, updateNote, deleteNote, type Note } from "@/lib/supabase";

const PRESET_TAGS = ["python", "sql", "ml", "deep-learning", "interview", "system-design", "dsa", "cloud", "project", "concept"];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => { fetchNotes().then(setNotes).catch(() => {}); }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
      const matchTag = !filterTag || n.tags?.includes(filterTag);
      return matchSearch && matchTag;
    });
  }, [notes, search, filterTag]);

  const handleSave = async () => {
    if (!title.trim()) return;
    if (editingId) {
      await updateNote(editingId, { title: title.trim(), content: content.trim(), tags });
    } else {
      await addNote({ title: title.trim(), content: content.trim(), tags });
    }
    setNotes(await fetchNotes());
    resetForm();
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id); setTitle(note.title); setContent(note.content); setTags(note.tags || []); setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    setNotes(await fetchNotes());
  };

  const handlePin = async (note: Note) => {
    await updateNote(note.id, { is_pinned: !note.is_pinned });
    setNotes(await fetchNotes());
  };

  const resetForm = () => { setShowAdd(false); setEditingId(null); setTitle(""); setContent(""); setTags([]); };

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Knowledge base</h1>
            <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>{notes.length} notes saved</p>
          </div>
          <button onClick={() => { resetForm(); setShowAdd(true); }} className="px-4 py-2 text-xs font-medium rounded-xl"
            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
            + New note
          </button>
        </div>
      </header>

      {/* Search + tag filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..."
          className="flex-1 glass rounded-xl px-4 py-2 text-xs font-mono focus:outline-none"
          style={{ color: "var(--text-primary)" }} />
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterTag("")} className="px-2 py-1 text-[10px] font-mono rounded-lg"
            style={{ background: !filterTag ? "var(--accent-muted)" : "var(--bg-input)", color: !filterTag ? "var(--accent)" : "var(--text-muted)" }}>All</button>
          {allTags.map((t) => (
            <button key={t} onClick={() => setFilterTag(filterTag === t ? "" : t)} className="px-2 py-1 text-[10px] font-mono rounded-lg"
              style={{ background: filterTag === t ? "var(--accent-muted)" : "var(--bg-input)", color: filterTag === t ? "var(--accent)" : "var(--text-muted)" }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="glass rounded-2xl p-5 mb-4 animate-slide-up">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit note" : "New note"}</h2>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title..."
            className="w-full rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none mb-3"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your note... (ML concepts, code snippets, interview questions)"
            rows={6} className="w-full rounded-xl px-4 py-3 text-xs font-mono focus:outline-none mb-3 resize-none"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
          <div className="mb-3">
            <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Tags:</span>
            <div className="flex gap-1 flex-wrap">
              {PRESET_TAGS.map((t) => (
                <button key={t} onClick={() => toggleTag(t)} className="px-2 py-1 text-[10px] font-mono rounded-lg transition-all"
                  style={{ background: tags.includes(t) ? "var(--accent-muted)" : "var(--bg-input)", color: tags.includes(t) ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${tags.includes(t) ? "hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.2)" : "var(--border-default)"}` }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 text-xs rounded-xl" style={{ color: "var(--text-muted)" }}>Cancel</button>
            <button onClick={handleSave} disabled={!title.trim()} className="px-4 py-2 text-xs font-medium rounded-xl disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}>Save</button>
          </div>
        </div>
      )}

      {/* Notes grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl animate-fade-in">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{notes.length === 0 ? "No notes yet" : "No notes match your search"}</p>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Save ML concepts, code snippets, and interview questions here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((note, i) => (
            <div key={note.id} className="glass rounded-2xl p-4 hover-lift animate-fade-in-up cursor-pointer group"
              style={{ animationDelay: `${i * 30}ms`, borderColor: note.is_pinned ? "hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.2)" : "var(--border-default)" }}
              onClick={() => handleEdit(note)}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xs font-medium line-clamp-1" style={{ color: "var(--text-primary)" }}>{note.title}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handlePin(note); }} className="text-[10px] px-1"
                    style={{ color: note.is_pinned ? "var(--accent)" : "var(--text-muted)" }}>{note.is_pinned ? "📌" : "pin"}</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className="text-[10px] px-1"
                    style={{ color: "var(--text-muted)" }}>×</button>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs font-mono line-clamp-3 mb-2" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>{note.content || "Empty note"}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {note.tags?.slice(0, 3).map((t) => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>{t}</span>
                  ))}
                </div>
                <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{new Date(note.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
