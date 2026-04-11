"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchNotes, type Note } from "@/lib/supabase";
import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";

// Tag groups → notebook definitions
const NOTEBOOK_DEFS = [
  { id: "ml",       label: "ML Learning",       icon: "🤖", color: "rgba(124,111,253,0.14)", accent: "#7c6ffd", tags: ["ml","deep-learning","llm","nlp","stats"] },
  { id: "sql",      label: "SQL & DSA",          icon: "🧾", color: "rgba(59,130,246,0.14)",  accent: "#3b82f6", tags: ["sql","dsa","python"] },
  { id: "interview",label: "Interview Prep",     icon: "🎯", color: "rgba(239,68,68,0.14)",   accent: "#ef4444", tags: ["interview","system-design"] },
  { id: "project",  label: "Projects & MLOps",   icon: "⚙️", color: "rgba(245,158,11,0.14)",  accent: "#f59e0b", tags: ["project","mlops","cloud"] },
  { id: "concept",  label: "Concepts",           icon: "💡", color: "rgba(16,185,129,0.14)",  accent: "#10b981", tags: ["concept"] },
  { id: "daily",    label: "Daily Notes",        icon: "📅", color: "rgba(236,72,153,0.14)",  accent: "#ec4899", tags: [] }, // catch-all for pinned
];

function noteDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export default function NotebooksPage() {
  const [notes, setNotes]       = useState<Note[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes().then(d => { setNotes(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Assign each note to a notebook
  const notebooks = useMemo(() => {
    return NOTEBOOK_DEFS.map(nb => {
      let notesForNb: Note[];
      if (nb.id === "daily") {
        // Daily = pinned notes + notes with no matching tags
        const assignedIds = new Set(
          NOTEBOOK_DEFS.filter(n => n.id !== "daily").flatMap(n =>
            notes.filter(note => note.tags?.some(t => n.tags.includes(t))).map(note => note.id)
          )
        );
        notesForNb = notes.filter(n => n.is_pinned || !assignedIds.has(n.id));
      } else {
        notesForNb = notes.filter(note => note.tags?.some(t => nb.tags.includes(t)));
      }
      const lastUpdated = notesForNb.length > 0
        ? notesForNb.reduce((latest, n) => n.updated_at > latest ? n.updated_at : latest, notesForNb[0].updated_at)
        : null;
      return { ...nb, notes: notesForNb, lastUpdated };
    }).filter(nb => nb.id === "daily" || nb.notes.length > 0); // always show daily
  }, [notes]);

  const selectedNb = notebooks.find(nb => nb.id === selected);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">

      <header className="mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {selected && selectedNb ? (
                <button onClick={() => setSelected(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "inherit", marginRight: "8px", padding: 0 }}>
                  ←
                </button>
              ) : null}
              {selectedNb ? selectedNb.label : "Notebooks"}
            </h1>
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
              {selectedNb
                ? `${selectedNb.notes.length} note${selectedNb.notes.length !== 1 ? "s" : ""}`
                : `${notebooks.length} notebooks · ${notes.length} notes total`}
            </p>
          </div>
          <Link href="/notes" style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}>
            All notes →
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-16"><span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading…</span></div>
      ) : !selected ? (
        /* Notebook grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {notebooks.map((nb, i) => (
            <button key={nb.id} onClick={() => setSelected(nb.id)}
              className="liquid-glass rounded-[20px] p-4 text-left hover-lift animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Icon */}
              <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: nb.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>
                {nb.icon}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>{nb.label}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {nb.notes.length} note{nb.notes.length !== 1 ? "s" : ""}
                  {nb.lastUpdated && ` · ${noteDateLabel(nb.lastUpdated)}`}
                </div>
              </div>
              {/* Accent bar */}
              <div style={{ width: "3px", height: "32px", borderRadius: "99px", background: nb.accent, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      ) : selectedNb ? (
        /* Notes inside a notebook */
        <div className="space-y-2 animate-fade-in">
          {selectedNb.notes.length === 0 ? (
            <div className="text-center py-16 liquid-glass rounded-[22px]">
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No notes yet</p>
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                Tag a note with{" "}
                {selectedNb.tags.map(t => `"${t}"`).join(", ") || "any tag"}
                {" "}to see it here
              </p>
            </div>
          ) : selectedNb.notes.map((note, i) => (
            <Link key={note.id} href="/notes"
              className="liquid-glass rounded-[16px] px-4 py-3 flex items-start gap-3 hover-lift animate-fade-in-up no-underline"
              style={{ animationDelay: `${i * 20}ms`, display: "flex" }}>
              {/* Left accent */}
              <div style={{ width: "3px", borderRadius: "99px", background: selectedNb.accent, alignSelf: "stretch", flexShrink: 0, minHeight: "20px" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  {note.is_pinned && <span style={{ fontSize: "12px" }}>📌</span>}
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note.title}
                  </span>
                </div>
                {note.content && (
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
                    {note.content.slice(0, 100)}
                  </p>
                )}
                {/* Tags */}
                <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                  {note.tags?.slice(0, 4).map(t => (
                    <span key={t} style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: "var(--glass-fill)", color: "var(--text-muted)", border: "0.5px solid var(--glass-border)", fontFamily: "monospace" }}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0, fontFamily: "monospace", paddingTop: "2px" }}>
                {noteDateLabel(note.updated_at)}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
