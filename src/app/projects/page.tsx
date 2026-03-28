"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchProjects, addProject, updateProject, deleteProject, type Project } from "@/lib/supabase";

/* ─── Status ─── */
const STATUS_OPTIONS = [
  { value: "planning",    label: "Planning",    color: "#94a3b8", emoji: "📋" },
  { value: "in-progress", label: "In Progress", color: "#60a5fa", emoji: "🔨" },
  { value: "completed",   label: "Completed",   color: "#6ee7b7", emoji: "✅" },
  { value: "deployed",    label: "Deployed",    color: "#a78bfa", emoji: "🚀" },
];
const STATUS_ORDER: Record<string, number> = { deployed: 0, completed: 1, "in-progress": 2, planning: 3 };

type SortBy = "sort_order" | "progress" | "status" | "title" | "updated";
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "sort_order", label: "Default" },
  { value: "progress",   label: "Progress" },
  { value: "status",     label: "Status" },
  { value: "title",      label: "A–Z" },
  { value: "updated",    label: "Recent" },
];

/* ─── Default sections ─── */
const DEFAULT_SECTIONS = [
  { id: "foundation", label: "Foundation ML",       description: "Classical ML, SQL analytics, causal inference, statistics — the minimum bar for any DS/MLE role.", color: "#5ecf95", categories: ["Classical ML", "Data Engineering", "Time Series", "Statistics"] },
  { id: "nlp-dl",     label: "NLP & Deep Learning", description: "Transformers, fine-tuning, RAG, computer vision — what separates ML Engineers from analysts.",     color: "#4da6ff", categories: ["NLP", "Deep Learning", "LLMs & GenAI", "Computer Vision"] },
  { id: "mlops",      label: "MLOps & Systems",     description: "Production ML: Docker, APIs, pipelines, recommendation systems, deployment.",                      color: "#b48eff", categories: ["MLOps", "RecSys", "Full Stack", "Healthcare ML"] },
];
type Section = typeof DEFAULT_SECTIONS[number];

interface UndoState       { projectId: string; projectData: Project; timeoutId: ReturnType<typeof setTimeout>; }
interface SectionUndoState { section: Section; timeoutId: ReturnType<typeof setTimeout>; intervalId: ReturnType<typeof setInterval>; }

/* ─── Slider ─── */
function ColoredSlider({ value, color, onChange }: { value: number; color: string; onChange: (v: number) => void }) {
  return <input type="range" min="0" max="100" step="5" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" style={{ background: `linear-gradient(to right,${color} 0%,${color} ${value}%,var(--bg-input) ${value}%,var(--bg-input) 100%)` }} />;
}

/* ─── Search bar ─── */
function SearchBar({ value, onChange, resultCount, totalCount }: { value: string; onChange: (v: string) => void; resultCount: number; totalCount: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative animate-fade-in-up" style={{ animationDelay: "15ms" }}>
      <div
        className="flex items-center gap-2 rounded-[14px] px-3 transition-all"
        style={{
          background: "var(--cc-glass-base)",
          border: `0.5px solid ${value ? "var(--accent)" : "var(--cc-tile-border)"}`,
          backdropFilter: "blur(20px) saturate(1.8)",
          boxShadow: value ? `0 0 0 3px var(--accent-muted), var(--cc-outer-shadow)` : "var(--cc-outer-shadow)",
        }}
      >
        {/* Search icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: value ? "var(--accent)" : "var(--cc-text-muted)", flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by title, description, tech stack…"
          className="flex-1 bg-transparent py-2.5 text-xs font-mono focus:outline-none"
          style={{ color: "var(--text-primary)", minWidth: 0 }}
        />
        {/* Result count badge */}
        {value && (
          <span className="text-[9px] font-mono flex-shrink-0 px-2 py-0.5 rounded-lg"
            style={{ background: resultCount > 0 ? "var(--accent-muted)" : "rgba(248,65,65,0.12)", color: resultCount > 0 ? "var(--accent)" : "#f87171" }}>
            {resultCount} / {totalCount}
          </span>
        )}
        {/* Clear */}
        {value && (
          <button onClick={() => { onChange(""); inputRef.current?.focus(); }}
            className="w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0 transition-all"
            style={{ color: "var(--cc-text-muted)", background: "var(--glass-fill)" }}>
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Delete confirm ─── */
function DeleteConfirm({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="animate-scale-in rounded-[14px] p-3 mt-3" style={{ background: "rgba(248,65,65,0.08)", border: "0.5px solid rgba(248,65,65,0.28)" }}>
      <p className="text-[11px] font-medium mb-0.5" style={{ color: "#f87171" }}>Delete "{title}"?</p>
      <p className="text-[10px] font-mono mb-3" style={{ color: "var(--text-muted)" }}>You'll have 5 seconds to undo.</p>
      <div className="flex gap-2">
        <button onClick={onConfirm} className="flex-1 py-2.5 text-[11px] font-medium rounded-xl transition-all" style={{ background: "rgba(248,65,65,0.18)", color: "#f87171", border: "0.5px solid rgba(248,65,65,0.35)" }}>Yes, delete</button>
        <button onClick={onCancel}  className="flex-1 py-2.5 text-[11px] font-mono rounded-xl"                 style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>Cancel</button>
      </div>
    </div>
  );
}

/* ─── Undo toast ─── */
function UndoToast({ label, onUndo, onDismiss, progress }: { label: string; onUndo: () => void; onDismiss: () => void; progress: number; }) {
  return (
    <div className="fixed left-1/2 animate-slide-up z-50" style={{ transform: "translateX(-50%)", bottom: "calc(80px + env(safe-area-inset-bottom,0px) + 8px)", width: "calc(100vw - 32px)", maxWidth: "360px" }}>
      <div className="rounded-[16px] px-4 py-3 flex items-center gap-3 relative overflow-hidden" style={{ background: "var(--cc-glass-base)", border: "0.5px solid var(--cc-tile-border)", backdropFilter: "blur(32px) saturate(2)", boxShadow: "var(--cc-outer-shadow)" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, height: "2.5px", background: "#f87171", width: `${progress}%`, transition: "width 0.1s linear", borderRadius: "0 0 0 16px" }} />
        <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--cc-text)" }}>Deleted "{label}"</span>
        <button onClick={onUndo}    className="text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0" style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>Undo</button>
        <button onClick={onDismiss} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "var(--cc-text-muted)", fontSize: "16px" }}>×</button>
      </div>
    </div>
  );
}

/* ════════════════ SECTION MODAL ════════════════ */
function SectionModal({ sections, onSave, onClose }: { sections: Section[]; onSave: (s: Section[]) => void; onClose: () => void; }) {
  const [local, setLocal]             = useState<Section[]>(JSON.parse(JSON.stringify(sections)));
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [newCatInputs, setNewCatInputs] = useState<Record<string, string>>({});
  const [newLabel, setNewLabel]   = useState("");
  const [newDesc, setNewDesc]     = useState("");
  const [newColor, setNewColor]   = useState("#94a3b8");
  const [sectionUndo, setSectionUndo]                 = useState<SectionUndoState | null>(null);
  const [sectionUndoProgress, setSectionUndoProgress] = useState(100);
  const [deletingId, setDeletingId]                   = useState<string | null>(null);

  useEffect(() => { return () => { if (sectionUndo) { clearTimeout(sectionUndo.timeoutId); clearInterval(sectionUndo.intervalId); } }; }, [sectionUndo]);

  const updateSection = (id: string, patch: Partial<Section>) => setLocal((p) => p.map((s) => s.id === id ? { ...s, ...patch } : s));
  const addCat = (secId: string) => { const v = (newCatInputs[secId] || "").trim(); if (!v) return; setLocal((p) => p.map((s) => s.id === secId && !s.categories.includes(v) ? { ...s, categories: [...s.categories, v] } : s)); setNewCatInputs((p) => ({ ...p, [secId]: "" })); };
  const removeCat = (secId: string, cat: string) => setLocal((p) => p.map((s) => s.id === secId ? { ...s, categories: s.categories.filter((c) => c !== cat) } : s));

  const startSectionDelete = (sec: Section) => {
    if (sectionUndo) { clearTimeout(sectionUndo.timeoutId); clearInterval(sectionUndo.intervalId); }
    setSectionUndoProgress(100); setDeletingId(null);
    setLocal((p) => p.filter((s) => s.id !== sec.id));
    if (expandedId === sec.id) setExpandedId(null);
    let pct = 100;
    const intervalId = setInterval(() => { pct -= 2; setSectionUndoProgress(Math.max(0, pct)); if (pct <= 0) clearInterval(intervalId); }, 100);
    const timeoutId  = setTimeout(() => { setSectionUndo(null); clearInterval(intervalId); }, 5000);
    setSectionUndo({ section: sec, timeoutId, intervalId });
  };
  const undoSectionDelete = () => { if (!sectionUndo) return; clearTimeout(sectionUndo.timeoutId); clearInterval(sectionUndo.intervalId); setLocal((p) => [...p, sectionUndo.section]); setSectionUndo(null); };
  const addSection = () => { if (!newLabel.trim()) return; setLocal((p) => [...p, { id: newLabel.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(), label: newLabel.trim(), description: newDesc.trim() || "Custom section", color: newColor, categories: [] }]); setNewLabel(""); setNewDesc(""); setNewColor("#94a3b8"); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(6px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-lg rounded-t-[24px] sm:rounded-[24px] animate-slide-up relative" style={{ background: "var(--cc-glass-base)", border: "0.5px solid var(--cc-tile-border)", backdropFilter: "blur(48px) saturate(2.2)", boxShadow: "var(--shadow-xl)", paddingBottom: "env(safe-area-inset-bottom,0px)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "0.5px", background: "linear-gradient(90deg,transparent,var(--specular-top),transparent)", pointerEvents: "none" }} />
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0"><div style={{ width: "36px", height: "4px", borderRadius: "100px", background: "var(--cc-text-muted)", opacity: 0.4 }} /></div>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
          <div><h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Manage sections</h3><p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>Rename · recolour · add categories · delete with undo</p></div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0" style={{ color: "var(--cc-text-muted)", fontSize: "18px", background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>×</button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-2" style={{ flex: 1, WebkitOverflowScrolling: "touch" }}>
          {sectionUndo && (
            <div className="rounded-[13px] p-3 flex items-center gap-3 relative overflow-hidden animate-slide-up mb-1" style={{ background: "rgba(248,65,65,0.10)", border: "0.5px solid rgba(248,65,65,0.32)" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, height: "2.5px", background: "#f87171", width: `${sectionUndoProgress}%`, transition: "width 0.1s linear", borderRadius: "0 0 0 13px" }} />
              <span style={{ fontSize: "14px", flexShrink: 0 }}>🗂️</span>
              <span className="text-[11px] font-mono flex-1 truncate" style={{ color: "#f87171" }}>Deleted "{sectionUndo.section.label}"</span>
              <button onClick={undoSectionDelete} className="text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0" style={{ background: "rgba(248,65,65,0.18)", color: "#f87171", border: "0.5px solid rgba(248,65,65,0.35)" }}>Undo</button>
            </div>
          )}
          {local.length === 0 && !sectionUndo && <p className="text-xs font-mono text-center py-4" style={{ color: "var(--text-muted)" }}>No sections. Add one below.</p>}
          {local.map((sec) => {
            const isExp = expandedId === sec.id; const isConf = deletingId === sec.id;
            return (
              <div key={sec.id} className="rounded-[14px] overflow-hidden animate-fade-in" style={{ border: `0.5px solid ${isExp ? `${sec.color}40` : "var(--glass-border)"}`, background: "var(--glass-fill)", transition: "border-color 0.2s" }}>
                <div className="flex items-center gap-2 p-3">
                  <input type="color" value={sec.color} onChange={(e) => updateSection(sec.id, { color: e.target.value })} className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent flex-shrink-0" style={{ padding: 0 }} />
                  <input value={sec.label} onChange={(e) => updateSection(sec.id, { label: e.target.value })} className="flex-1 bg-transparent text-xs font-semibold focus:outline-none min-w-0" style={{ color: "var(--text-primary)" }} />
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg flex-shrink-0" style={{ background: `${sec.color}18`, color: sec.color, border: `0.5px solid ${sec.color}30` }}>{sec.categories.length} cat.</span>
                  <button onClick={() => setExpandedId(isExp ? null : sec.id)} className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-all" style={{ color: isExp ? sec.color : "var(--text-muted)", background: isExp ? `${sec.color}12` : "transparent" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: isExp ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  <button onClick={() => setDeletingId(isConf ? null : sec.id)} className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-all" style={{ color: "#f87171", background: isConf ? "rgba(248,65,65,0.14)" : "transparent" }}>✕</button>
                </div>
                {isConf && (
                  <div className="px-3 pb-3 animate-fade-in">
                    <div className="rounded-[10px] p-3" style={{ background: "rgba(248,65,65,0.07)", border: "0.5px solid rgba(248,65,65,0.22)" }}>
                      <p className="text-[10px] font-mono mb-2" style={{ color: "#f87171" }}>Projects won't be deleted — they'll appear in "All". You'll have 5 sec to undo.</p>
                      <div className="flex gap-2">
                        <button onClick={() => startSectionDelete(sec)} className="flex-1 py-2 text-[11px] font-medium rounded-lg" style={{ background: "rgba(248,65,65,0.20)", color: "#f87171" }}>Delete section</button>
                        <button onClick={() => setDeletingId(null)} className="flex-1 py-2 text-[11px] rounded-lg" style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>Keep</button>
                      </div>
                    </div>
                  </div>
                )}
                {isExp && !isConf && (
                  <div className="px-3 pb-3 pt-1 animate-fade-in space-y-3" style={{ borderTop: `0.5px solid ${sec.color}20` }}>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Description</span>
                      <input value={sec.description} onChange={(e) => updateSection(sec.id, { description: e.target.value })} placeholder="Short description..." className="w-full rounded-xl px-3 py-2 text-[11px] font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Categories — projects matching these appear in this section</span>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                        {sec.categories.length === 0 && <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>No categories yet — add below</span>}
                        {sec.categories.map((cat) => (
                          <span key={cat} className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono" style={{ background: `${sec.color}14`, color: sec.color, border: `0.5px solid ${sec.color}35` }}>
                            {cat}
                            <button onClick={() => removeCat(sec.id, cat)} className="w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0" style={{ color: sec.color, opacity: 0.7, fontSize: "11px", lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={newCatInputs[sec.id] || ""} onChange={(e) => setNewCatInputs((p) => ({ ...p, [sec.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCat(sec.id); } }} placeholder="e.g. Healthcare AI, Robotics…" className="flex-1 rounded-xl px-3 py-2.5 text-[11px] font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
                        <button onClick={() => addCat(sec.id)} disabled={!(newCatInputs[sec.id] || "").trim()} className="px-3 py-2.5 text-[11px] font-medium rounded-xl transition-all disabled:opacity-30 flex-shrink-0" style={{ background: `${sec.color}20`, color: sec.color, border: `0.5px solid ${sec.color}35` }}>+ Add</button>
                      </div>
                      <p className="text-[9px] font-mono mt-1" style={{ color: "var(--text-muted)" }}>Press Enter or + Add · case-sensitive</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="rounded-[14px] p-3 space-y-2 mt-2" style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
            <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>New section</p>
            <div className="flex gap-2">
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer border-0 flex-shrink-0" style={{ padding: "3px" }} />
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addSection(); }} placeholder="Section name, e.g. Healthcare AI" className="flex-1 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
            </div>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Short description (optional)" className="w-full rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
            <button onClick={addSection} disabled={!newLabel.trim()} className="w-full py-3 text-xs font-medium rounded-xl disabled:opacity-30 transition-all" style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>+ Add section</button>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop: "0.5px solid var(--glass-border-subtle)" }}>
          <button onClick={() => onSave(local)} className="flex-1 py-3 text-xs font-medium rounded-xl" style={{ background: "var(--accent)", color: "#0a0a0b" }}>Save changes</button>
          <button onClick={onClose} className="px-5 py-3 text-xs rounded-xl" style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════ MAIN PAGE ════════════════ */
export default function ProjectsPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [sortBy, setSortBy]         = useState<SortBy>("sort_order");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery]   = useState("");            /* ← NEW */

  const [sections, setSections]           = useState<Section[]>(DEFAULT_SECTIONS);
  const [activeSection, setActiveSection] = useState<string>("foundation");
  const [showSectionModal, setShowSectionModal] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [undoState, setUndoState]             = useState<UndoState | null>(null);
  const [undoProgress, setUndoProgress]       = useState(100);
  const undoProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* form */
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]       = useState("");
  const [techInput, setTechInput]     = useState("");
  const [status, setStatus]           = useState<Project["status"]>("planning");
  const [progress, setProgress]       = useState(0);
  const [github, setGithub]           = useState("");
  const [liveUrl, setLiveUrl]         = useState("");
  const [targetDate, setTargetDate]   = useState("");             /* ← NEW */
  const [highlightsInput, setHighlightsInput] = useState("");

  useEffect(() => { try { const s = localStorage.getItem("srn-project-sections"); if (s) setSections(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { fetchProjects().then((d) => { setProjects(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const reload = useCallback(async () => setProjects(await fetchProjects()), []);

  const resetForm = () => { setTitle(""); setDescription(""); setCategory(""); setTechInput(""); setStatus("planning"); setProgress(0); setGithub(""); setLiveUrl(""); setTargetDate(""); setHighlightsInput(""); setShowForm(false); setEditingId(null); setSaving(false); };

  const handleSaveSections = (updated: Section[]) => { setSections(updated); localStorage.setItem("srn-project-sections", JSON.stringify(updated)); setShowSectionModal(false); if (!updated.find((s) => s.id === activeSection)) setActiveSection(updated[0]?.id || "__all__"); };

  const handleSave = async () => {
    if (!title.trim() || saving) return; setSaving(true);
    try {
      const tech = techInput.split(",").map((t) => t.trim()).filter(Boolean);
      const highlights = highlightsInput.split("\n").map((h) => h.trim()).filter(Boolean);
      const data: Partial<Project> = { title: title.trim(), description: description.trim(), category: category.trim(), tech, status, progress, github_url: github.trim(), live_url: liveUrl.trim(), highlights, ...(targetDate ? { end_date: targetDate } : {}) };
      if (editingId) await updateProject(editingId, data); else await addProject(data);
      await reload(); resetForm();
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: editingId ? "Updated" : "Added", type: "success" } }));
    } catch (err: any) { window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: err?.message || "Failed", type: "error" } })); setSaving(false); }
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id); setTitle(p.title); setDescription(p.description || ""); setCategory(p.category || ""); setTechInput(p.tech?.join(", ") || ""); setStatus(p.status); setProgress(p.progress); setGithub(p.github_url || ""); setLiveUrl(p.live_url || ""); setTargetDate(p.end_date || ""); setHighlightsInput(p.highlights?.join("\n") || "");
    setShowForm(true); setExpandedId(null); setConfirmDeleteId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startDeleteCountdown = (project: Project) => {
    if (undoState) clearTimeout(undoState.timeoutId);
    if (undoProgressRef.current) clearInterval(undoProgressRef.current);
    setUndoProgress(100);
    const timeoutId = setTimeout(async () => { await deleteProject(project.id); await reload(); setUndoState(null); if (undoProgressRef.current) clearInterval(undoProgressRef.current); }, 5000);
    let pct = 100;
    undoProgressRef.current = setInterval(() => { pct -= 2; setUndoProgress(Math.max(0, pct)); if (pct <= 0 && undoProgressRef.current) clearInterval(undoProgressRef.current); }, 100);
    setUndoState({ projectId: project.id, projectData: project, timeoutId }); setConfirmDeleteId(null);
  };
  const handleUndo = () => { if (!undoState) return; clearTimeout(undoState.timeoutId); if (undoProgressRef.current) clearInterval(undoProgressRef.current); setUndoState(null); window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Delete undone ✓", type: "success" } })); };
  const handleProgressUpdate = async (id: string, val: number) => { const u: Partial<Project> = { progress: val }; if (val === 100) u.status = "completed"; else if (val > 0) u.status = "in-progress"; else u.status = "planning"; await updateProject(id, u); await reload(); };
  const handleStatusChange  = async (id: string, s: Project["status"]) => { const u: Partial<Project> = { status: s }; if (s === "completed" || s === "deployed") u.progress = 100; else if (s === "planning") u.progress = 0; await updateProject(id, u); await reload(); };

  const getSectionForProject = useCallback((cat: string) => { for (const sec of sections) { if (sec.categories.includes(cat)) return sec.id; } return "__uncategorised__"; }, [sections]);
  const sectionCounts = useMemo(() => { const c: Record<string, number> = {}; projects.forEach((p) => { const sid = getSectionForProject(p.category || ""); c[sid] = (c[sid] || 0) + 1; }); return c; }, [projects, getSectionForProject]);
  const uncategorisedCount = sectionCounts["__uncategorised__"] || 0;

  /* ── Search helper ── */
  const matchesSearch = useCallback((p: Project, q: string) => {
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return (
      p.title.toLowerCase().includes(lower) ||
      (p.description || "").toLowerCase().includes(lower) ||
      (p.category || "").toLowerCase().includes(lower) ||
      (p.tech || []).some((t) => t.toLowerCase().includes(lower))
    );
  }, []);

  /* ── Visible projects: section filter + status filter + search ── */
  const visibleProjects = useMemo(() => {
    let list: Project[];
    if (activeSection === "__all__")             list = [...projects];
    else if (activeSection === "__uncategorised__") list = projects.filter((p) => getSectionForProject(p.category || "") === "__uncategorised__");
    else { const sec = sections.find((s) => s.id === activeSection); list = sec ? projects.filter((p) => sec.categories.includes(p.category || "")) : []; }
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    if (searchQuery)  list = list.filter((p) => matchesSearch(p, searchQuery));
    return [...list].sort((a, b) => { switch (sortBy) { case "progress": return b.progress - a.progress; case "status": return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; case "title": return a.title.localeCompare(b.title); case "updated": return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(); default: return a.sort_order - b.sort_order; } });
  }, [projects, activeSection, sections, filterStatus, sortBy, searchQuery, getSectionForProject, matchesSearch]);

  /* Search across ALL projects (for "found in other section" hint) */
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return projects.filter((p) => matchesSearch(p, searchQuery));
  }, [projects, searchQuery, matchesSearch]);

  const totalProgress  = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const statusCounts   = useMemo(() => { const c: Record<string, number> = {}; projects.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; }); return c; }, [projects]);
  const activeSectionData = sections.find((s) => s.id === activeSection);
  const tabs = useMemo(() => {
    const list = [
      { id: "__all__", label: "All", color: "var(--accent)", count: projects.length },
      ...sections.map((s) => ({ id: s.id, label: s.label, color: s.color, count: sectionCounts[s.id] || 0 })),
    ];
    if (uncategorisedCount > 0) list.push({ id: "__uncategorised__", label: "Other", color: "#94a3b8", count: uncategorisedCount });
    return list;
  }, [sections, sectionCounts, projects.length, uncategorisedCount]);

  /* Days until target date */
  const daysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, color: "#f87171" };
    if (diff === 0) return { label: "Due today", color: "#f5a623" };
    if (diff <= 7)  return { label: `${diff}d left`, color: "#f5a623" };
    return { label: `${diff}d left`, color: "var(--text-muted)" };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">

      {/* Header */}
      <header className="mb-4 animate-fade-in-up">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>ML Portfolio</h1>
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
              {projects.filter((p) => p.status === "completed" || p.status === "deployed").length}/{projects.length} done · {totalProgress}% overall
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowSectionModal(true)} className="cc-btn px-3 py-2 text-xs" style={{ color: "var(--cc-text-muted)" }}>
              <span style={{ position: "relative", zIndex: 3 }}>⚙</span>
            </button>
            {!showForm && (
              <button onClick={() => { resetForm(); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="cc-btn cc-btn-accent px-3 sm:px-4 py-2 text-xs">
                <span style={{ position: "relative", zIndex: 3 }}><span className="hidden sm:inline">+ Add project</span><span className="sm:hidden">+ Add</span></span>
              </button>
            )}
          </div>
        </div>
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${totalProgress}%`, background: `linear-gradient(90deg,var(--accent),hsla(var(--accent-h),var(--accent-s),calc(var(--accent-l)+15%),1))` }} />
            </div>
            <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "var(--accent)" }}>{totalProgress}%</span>
          </div>
        )}
      </header>

      {/* ── SEARCH BAR ── */}
      {projects.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          resultCount={visibleProjects.length}
          totalCount={activeSection === "__all__" ? projects.length : (tabs.find((t) => t.id === activeSection)?.count || 0)}
        />
      )}

      {/* "Found in other sections" hint */}
      {searchQuery && visibleProjects.length === 0 && globalSearchResults.length > 0 && (
        <div className="mt-2 mb-0 px-3 py-2.5 rounded-[12px] flex items-center gap-2 animate-fade-in"
          style={{ background: "var(--accent-muted)", border: "0.5px solid var(--accent-dim)" }}>
          <span className="text-[10px] font-mono" style={{ color: "var(--accent)" }}>
            Found {globalSearchResults.length} result{globalSearchResults.length > 1 ? "s" : ""} in other sections.
          </span>
          <button onClick={() => setActiveSection("__all__")} className="text-[10px] font-semibold ml-auto px-2.5 py-1 rounded-lg transition-all"
            style={{ background: "var(--accent)", color: "#0a0a0b" }}>
            Show all
          </button>
        </div>
      )}

      {/* Status filters */}
      {projects.length > 0 && (
        <div className="flex gap-2 mt-3 mb-3 animate-fade-in-up" style={{ animationDelay: "20ms", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", paddingBottom: "2px" }}>
          {STATUS_OPTIONS.map((s) => {
            const count = statusCounts[s.value] || 0; const active = filterStatus === s.value;
            return (
              <button key={s.value} onClick={() => setFilterStatus(active ? "" : s.value)}
                className="flex items-center gap-1.5 rounded-[12px] text-[10px] font-mono transition-all flex-shrink-0"
                style={{ padding: "8px 12px", background: active ? `${s.color}18` : "var(--glass-fill)", border: `0.5px solid ${active ? `${s.color}40` : "var(--glass-border)"}`, color: active ? s.color : "var(--text-muted)", backdropFilter: "blur(12px)", whiteSpace: "nowrap" }}>
                {s.emoji} {s.label} <span style={{ opacity: 0.6 }}>({count})</span>
              </button>
            );
          })}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="flex-shrink-0 ml-auto glass rounded-xl px-3 text-[10px] font-mono focus:outline-none cursor-pointer" style={{ color: "var(--text-secondary)", height: "36px", minWidth: "80px" }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* Section tabs */}
      <div className="mb-4 animate-fade-in-up" style={{ animationDelay: "35ms" }}>
        <div className="flex gap-1 p-1 rounded-[16px]" style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border)", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {tabs.map((tab) => {
            const isActive = activeSection === tab.id;
            /* Highlight tab if search found results there */
            const hasSearchResults = searchQuery ? globalSearchResults.some((p) => {
              if (tab.id === "__all__") return true;
              if (tab.id === "__uncategorised__") return getSectionForProject(p.category || "") === "__uncategorised__";
              const sec = sections.find((s) => s.id === tab.id);
              return sec ? sec.categories.includes(p.category || "") : false;
            }) : false;
            return (
              <button key={tab.id} onClick={() => { setActiveSection(tab.id); setExpandedId(null); }}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-[11px] transition-all duration-200 relative overflow-hidden"
                style={{ padding: "10px 12px", background: isActive ? "var(--cc-glass-hover)" : "transparent", border: `0.5px solid ${isActive ? `${tab.color}40` : searchQuery && hasSearchResults ? `${tab.color}25` : "transparent"}`, backdropFilter: isActive ? "blur(20px) saturate(1.8)" : "none", boxShadow: isActive ? `inset 0 1px 0 var(--specular-top), 0 2px 10px ${tab.color}18` : "none", whiteSpace: "nowrap" }}>
                {isActive && <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: "0.5px", background: `linear-gradient(90deg,transparent,${tab.color}70,transparent)`, pointerEvents: "none" }} />}
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: tab.color, boxShadow: isActive ? `0 0 6px ${tab.color}80` : "none", flexShrink: 0, transition: "box-shadow 0.2s" }} />
                <span className="text-[11px] font-medium" style={{ color: isActive ? "var(--text-primary)" : "var(--cc-text-muted)", transition: "color 0.2s" }}>{tab.label}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-lg" style={{ background: isActive ? `${tab.color}20` : "var(--glass-fill)", color: isActive ? tab.color : "var(--text-muted)", transition: "all 0.2s" }}>{tab.count}</span>
              </button>
            );
          })}
        </div>
        {activeSectionData && activeSection !== "__all__" && activeSection !== "__uncategorised__" && (
          <div className="mt-2 px-3 py-2 rounded-[11px] animate-fade-in flex items-center gap-2" style={{ background: `${activeSectionData.color}0d`, border: `0.5px solid ${activeSectionData.color}28` }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: activeSectionData.color, flexShrink: 0 }} />
            <p className="text-[10px] font-mono" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{activeSectionData.description}</p>
          </div>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="spatial p-4 sm:p-6 mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit project" : "New project"}</h2>
            <button onClick={resetForm} className="px-3 py-2 text-xs rounded-xl" style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>Cancel</button>
          </div>
          <div className="space-y-3">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title *" autoFocus className="w-full rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this project do..." rows={2} className="w-full rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none resize-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />

            {/* Category grouped by section */}
            <div>
              <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Category — sets which section this appears in</span>
              <div className="space-y-2.5">
                {sections.map((sec) => (
                  <div key={sec.id}>
                    <span className="text-[9px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: sec.color }}>{sec.label}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {sec.categories.length > 0 ? sec.categories.map((c) => (
                        <button key={c} onClick={() => setCategory(c)} className="px-3 py-2 text-[11px] font-mono rounded-xl transition-all" style={{ background: category === c ? `${sec.color}18` : "var(--bg-card)", color: category === c ? sec.color : "var(--text-muted)", border: `0.5px solid ${category === c ? `${sec.color}40` : "var(--border-default)"}` }}>{c}</button>
                      )) : <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>No categories — add via ⚙ Sections</span>}
                    </div>
                  </div>
                ))}
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Or type custom</span>
                  <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Healthcare AI, Robotics..." className="w-full rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
                </div>
              </div>
            </div>

            <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)} placeholder="Tech: Python, PyTorch, FastAPI, Docker..." className="w-full rounded-2xl px-4 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
            <textarea value={highlightsInput} onChange={(e) => setHighlightsInput(e.target.value)} placeholder={"Key deliverables (one per line)"} rows={3} className="w-full rounded-2xl px-4 py-2.5 text-xs font-mono focus:outline-none resize-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input type="url" value={github}  onChange={(e) => setGithub(e.target.value)}  placeholder="GitHub URL"    className="flex-1 rounded-2xl px-3 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
              <input type="url" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="Live demo URL" className="flex-1 rounded-2xl px-3 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
            </div>

            {/* Target date — NEW */}
            <div>
              <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Target completion date (optional)</span>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full sm:w-auto rounded-2xl px-3 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Status</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUS_OPTIONS.map((s) => (
                    <button key={s.value} onClick={() => setStatus(s.value as Project["status"])} className="flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono rounded-xl transition-all" style={{ background: status === s.value ? `${s.color}15` : "var(--bg-input)", color: status === s.value ? s.color : "var(--text-muted)", border: `0.5px solid ${status === s.value ? `${s.color}40` : "var(--border-default)"}` }}>
                      <span>{s.emoji}</span><span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Progress: {progress}%</span>
                <div className="flex items-center gap-2"><ColoredSlider value={progress} color="var(--accent)" onChange={setProgress} /><span className="text-[10px] font-mono flex-shrink-0" style={{ color: "var(--accent)", minWidth: "32px" }}>{progress}%</span></div>
              </div>
            </div>
            <button onClick={handleSave} disabled={!title.trim() || saving} className="w-full py-3.5 text-sm font-medium rounded-2xl transition-all disabled:opacity-30" style={{ background: "var(--accent)", color: "#0a0a0b" }}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add project"}
            </button>
          </div>
        </div>
      )}

      {/* Project cards */}
      {loading ? (
        <div className="text-center py-16"><span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading...</span></div>
      ) : visibleProjects.length === 0 ? (
        <div className="p-8 sm:p-10 text-center rounded-[22px] animate-fade-in" style={{ background: activeSectionData ? `${activeSectionData.color}0a` : "var(--glass-fill)", border: `0.5px solid ${activeSectionData ? `${activeSectionData.color}25` : "var(--glass-border)"}` }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{searchQuery ? `No results for "${searchQuery}"` : projects.length === 0 ? "No projects yet" : "No projects in this section"}</p>
          <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>{searchQuery ? "Try a different search term, or switch sections." : activeSectionData?.description || "Add a project to get started."}</p>
          {!searchQuery && <button onClick={() => setShowForm(true)} className="px-5 py-2.5 text-xs font-medium rounded-2xl transition-all" style={{ background: activeSectionData?.color || "var(--accent)", color: "#0a0a0b" }}>+ Add project</button>}
          {searchQuery  && <button onClick={() => setSearchQuery("")} className="px-5 py-2.5 text-xs font-medium rounded-2xl transition-all" style={{ background: "var(--glass-fill-hover)", color: "var(--text-primary)", border: "0.5px solid var(--glass-border)" }}>Clear search</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleProjects.map((p, i) => {
            const sc = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
            const secData    = sections.find((s) => s.categories.includes(p.category || ""));
            const secColor   = secData?.color || "#94a3b8";
            const isExpanded = expandedId === p.id;
            const isConfirmDel = confirmDeleteId === p.id;
            const isPendingDel = undoState?.projectId === p.id;
            const deadline   = daysUntil((p as any).end_date || "");
            /* Highlight matched search terms */
            const isSearchMatch = searchQuery && matchesSearch(p, searchQuery);

            return (
              <div key={p.id} className="liquid-glass rounded-[22px] overflow-hidden hover-lift animate-fade-in-up"
                style={{ animationDelay: `${i * 35}ms`, opacity: isPendingDel ? 0.42 : 1, transition: "opacity 0.3s ease", boxShadow: isSearchMatch && searchQuery ? `var(--shadow-md), 0 0 0 1.5px ${secColor}40` : undefined }}>
                <div style={{ height: "2px", background: `linear-gradient(90deg,${secColor}80,transparent)` }} />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setExpandedId(isExpanded ? null : p.id); setConfirmDeleteId(null); }}>
                      <div className="flex items-start gap-2 flex-wrap mb-1">
                        <span className="text-sm flex-shrink-0 mt-0.5">{sc.emoji}</span>
                        <h3 className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl" style={{ background: `${sc.color}12`, color: sc.color, border: `0.5px solid ${sc.color}30` }}>{sc.label}</span>
                        {p.category && <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl" style={{ background: `${secColor}10`, color: secColor, border: `0.5px solid ${secColor}28` }}>{p.category}</span>}
                        {deadline && <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl" style={{ background: `${deadline.color}12`, color: deadline.color, border: `0.5px solid ${deadline.color}28` }}>{deadline.label}</span>}
                      </div>
                      {p.description && <p className="text-[11px] sm:text-xs line-clamp-2" style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}>{p.description}</p>}
                    </div>
                    <svg width="44" height="44" viewBox="0 0 52 52" className="flex-shrink-0">
                      <circle cx="26" cy="26" r="22" fill="none" strokeWidth="3" style={{ stroke: "var(--border-default)" }} />
                      <circle cx="26" cy="26" r="22" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 * (1 - p.progress / 100)} style={{ stroke: sc.color, transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.5s" }} />
                      <text x="26" y="26" textAnchor="middle" dominantBaseline="central" style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 500, fill: sc.color }}>{p.progress}%</text>
                    </svg>
                  </div>
                  <div className="mt-3"><ColoredSlider value={p.progress} color={sc.color} onChange={(v) => handleProgressUpdate(p.id, v)} /></div>
                  {p.tech && p.tech.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.tech.map((t) => <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded-lg" style={{ background: searchQuery && t.toLowerCase().includes(searchQuery.toLowerCase()) ? "var(--accent-muted)" : "var(--bg-elevated)", color: searchQuery && t.toLowerCase().includes(searchQuery.toLowerCase()) ? "var(--accent)" : "var(--text-muted)", border: "0.5px solid var(--glass-border-subtle)" }}>{t}</span>)}
                    </div>
                  )}
                  {isConfirmDel && <DeleteConfirm title={p.title} onConfirm={() => startDeleteCountdown(p)} onCancel={() => setConfirmDeleteId(null)} />}
                  {isExpanded && !isConfirmDel && (
                    <div className="mt-4 pt-4 space-y-4 animate-fade-in" style={{ borderTop: "0.5px solid var(--border-default)" }}>
                      <div>
                        <span className="text-[10px] font-mono block mb-2" style={{ color: "var(--text-muted)" }}>Status</span>
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map((s) => (
                            <button key={s.value} onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, s.value as Project["status"]); }} className="flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono rounded-xl transition-all" style={{ background: p.status === s.value ? `${s.color}15` : "var(--bg-card)", color: p.status === s.value ? s.color : "var(--text-muted)", border: `0.5px solid ${p.status === s.value ? `${s.color}35` : "var(--border-default)"}` }}>
                              {s.emoji} {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {p.highlights && p.highlights.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Deliverables</span>
                          {p.highlights.map((h, idx) => (
                            <div key={idx} className="flex items-start gap-2 mb-1.5">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: secColor }} />
                              <span className="text-[11px] sm:text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(p.github_url || p.live_url) && (
                        <div className="flex flex-wrap gap-2">
                          {p.github_url && <a href={p.github_url} target="_blank" rel="noopener" className="text-[10px] font-mono px-3 py-2.5 rounded-xl hover-lift" style={{ color: "var(--text-secondary)", border: "0.5px solid var(--glass-border)" }} onClick={(e) => e.stopPropagation()}>GitHub →</a>}
                          {p.live_url   && <a href={p.live_url}   target="_blank" rel="noopener" className="text-[10px] font-mono px-3 py-2.5 rounded-xl hover-lift" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}               onClick={(e) => e.stopPropagation()}>Demo →</a>}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }}          className="flex-1 py-2.5 text-[11px] font-mono rounded-xl" style={{ color: "var(--text-secondary)", border: "0.5px solid var(--glass-border)" }}>Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }} className="flex-1 py-2.5 text-[11px] font-mono rounded-xl" style={{ color: "#f87171", border: "0.5px solid rgba(248,65,65,0.25)" }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showSectionModal && <SectionModal sections={sections} onSave={handleSaveSections} onClose={() => setShowSectionModal(false)} />}
      {undoState && <UndoToast label={undoState.projectData.title} onUndo={handleUndo} progress={undoProgress} onDismiss={() => { clearTimeout(undoState.timeoutId); deleteProject(undoState.projectId).then(reload); setUndoState(null); }} />}
    </div>
  );
}
