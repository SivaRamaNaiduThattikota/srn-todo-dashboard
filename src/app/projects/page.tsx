"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchProjects, addProject, updateProject, deleteProject, type Project } from "@/lib/supabase";

/* ─── Status options ─── */
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

/* ─── Default sections — user can add/rename/delete ─── */
const DEFAULT_SECTIONS = [
  {
    id: "foundation",
    label: "Foundation ML",
    description: "Classical ML, SQL analytics, causal inference, statistics — the minimum bar for any DS/MLE role.",
    color: "#5ecf95",
    categories: ["Classical ML", "Data Engineering", "Time Series", "Statistics"],
  },
  {
    id: "nlp-dl",
    label: "NLP & Deep Learning",
    description: "Transformers, fine-tuning, RAG, computer vision — what separates ML Engineers from analysts.",
    color: "#4da6ff",
    categories: ["NLP", "Deep Learning", "LLMs & GenAI", "Computer Vision"],
  },
  {
    id: "mlops",
    label: "MLOps & Systems",
    description: "Production ML: Docker, APIs, pipelines, recommendation systems, deployment.",
    color: "#b48eff",
    categories: ["MLOps", "RecSys", "Full Stack", "Healthcare ML"],
  },
];

type Section = typeof DEFAULT_SECTIONS[number];

/* ─── Undo toast state ─── */
interface UndoState {
  projectId: string;
  projectData: Project;
  timeoutId: ReturnType<typeof setTimeout>;
}

function ColoredSlider({ value, color, onChange }: { value: number; color: string; onChange: (v: number) => void }) {
  return (
    <input type="range" min="0" max="100" step="5" value={value}
      onChange={(e) => onChange(Number(e.target.value))} className="w-full"
      style={{ background: `linear-gradient(to right,${color} 0%,${color} ${value}%,var(--bg-input) ${value}%,var(--bg-input) 100%)` }}
    />
  );
}

/* ─── Delete confirm dialog ─── */
function DeleteConfirm({
  title, onConfirm, onCancel,
}: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="animate-scale-in rounded-[16px] p-4 mt-3"
      style={{
        background: "rgba(248,65,65,0.08)",
        border: "0.5px solid rgba(248,65,65,0.28)",
        backdropFilter: "blur(16px)",
      }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: "#f87171" }}>
        Delete "{title}"?
      </p>
      <p className="text-[10px] font-mono mb-3" style={{ color: "var(--text-muted)" }}>
        You'll have 5 seconds to undo after deleting.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 text-[10px] font-medium rounded-xl transition-all"
          style={{ background: "rgba(248,65,65,0.18)", color: "#f87171", border: "0.5px solid rgba(248,65,65,0.35)" }}
        >
          Yes, delete
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-[10px] font-mono rounded-xl"
          style={{ color: "var(--text-muted)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Undo toast ─── */
function UndoToast({ project, onUndo, onDismiss, progress }: {
  project: Project; onUndo: () => void; onDismiss: () => void; progress: number;
}) {
  return (
    <div
      className="fixed bottom-24 left-1/2 animate-slide-up z-50"
      style={{ transform: "translateX(-50%)", minWidth: "280px" }}
    >
      <div
        className="rounded-[16px] px-4 py-3 flex items-center gap-3 relative overflow-hidden"
        style={{
          background: "var(--cc-glass-base)",
          border: "0.5px solid var(--cc-tile-border)",
          backdropFilter: "blur(32px) saturate(2)",
          boxShadow: "var(--cc-outer-shadow)",
        }}
      >
        {/* progress bar */}
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, height: "2px",
            background: "#f87171",
            width: `${progress}%`,
            transition: "width 0.1s linear",
          }}
        />
        <span className="text-xs font-mono" style={{ color: "var(--cc-text)", flex: 1 }}>
          Deleted "{project.title}"
        </span>
        <button
          onClick={onUndo}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
          style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}
        >
          Undo
        </button>
        <button onClick={onDismiss} style={{ color: "var(--cc-text-muted)", fontSize: "14px", lineHeight: 1 }}>×</button>
      </div>
    </div>
  );
}

/* ─── Section manage modal ─── */
function SectionModal({
  sections, onSave, onClose,
}: {
  sections: Section[];
  onSave: (s: Section[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<Section[]>(JSON.parse(JSON.stringify(sections)));
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#94a3b8");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const addSection = () => {
    if (!newLabel.trim()) return;
    setLocal((prev) => [
      ...prev,
      {
        id: newLabel.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
        label: newLabel.trim(),
        description: newDesc.trim() || "Custom section",
        color: newColor,
        categories: [],
      },
    ]);
    setNewLabel(""); setNewDesc(""); setNewColor("#94a3b8");
  };

  const removeSection = (id: string) => {
    setLocal((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  };

  const updateLabel = (id: string, val: string) =>
    setLocal((prev) => prev.map((s) => s.id === id ? { ...s, label: val } : s));

  const updateColor = (id: string, val: string) =>
    setLocal((prev) => prev.map((s) => s.id === id ? { ...s, color: val } : s));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-md rounded-[24px] p-5 animate-slide-up"
        style={{
          background: "var(--cc-glass-base)",
          border: "0.5px solid var(--cc-tile-border)",
          backdropFilter: "blur(48px) saturate(2.2)",
          boxShadow: "var(--shadow-xl)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Specular */}
        <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "0.5px", background: "linear-gradient(90deg,transparent,var(--specular-top),transparent)", borderRadius: "24px 24px 0 0" }} />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Manage sections</h3>
          <button onClick={onClose} style={{ color: "var(--cc-text-muted)", fontSize: "18px" }}>×</button>
        </div>

        {/* Existing sections */}
        <div className="space-y-2 mb-4">
          {local.map((s) => (
            <div key={s.id}>
              <div
                className="flex items-center gap-2 p-2.5 rounded-[12px]"
                style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}
              >
                {/* Color dot */}
                <input
                  type="color" value={s.color}
                  onChange={(e) => updateColor(s.id, e.target.value)}
                  className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent flex-shrink-0"
                  style={{ padding: 0 }}
                />
                <input
                  value={s.label}
                  onChange={(e) => updateLabel(s.id, e.target.value)}
                  className="flex-1 bg-transparent text-xs font-medium focus:outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
                <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
                  {s.categories.length} cat.
                </span>
                <button
                  onClick={() => setConfirmDeleteId(confirmDeleteId === s.id ? null : s.id)}
                  className="text-xs px-2 py-1 rounded-lg transition-all"
                  style={{ color: "#f87171", background: confirmDeleteId === s.id ? "rgba(248,65,65,0.12)" : "transparent" }}
                >
                  ✕
                </button>
              </div>
              {confirmDeleteId === s.id && (
                <div
                  className="mt-1 mx-1 p-3 rounded-[10px] animate-fade-in"
                  style={{ background: "rgba(248,65,65,0.08)", border: "0.5px solid rgba(248,65,65,0.25)" }}
                >
                  <p className="text-[10px] font-mono mb-2" style={{ color: "#f87171" }}>
                    Projects in this section won't be deleted — they'll move to "All".
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => removeSection(s.id)}
                      className="px-3 py-1 text-[10px] rounded-lg"
                      style={{ background: "rgba(248,65,65,0.2)", color: "#f87171" }}>
                      Remove section
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1 text-[10px] rounded-lg"
                      style={{ color: "var(--text-muted)" }}>
                      Keep
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new section */}
        <div
          className="p-3 rounded-[14px] space-y-2 mb-4"
          style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}
        >
          <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Add new section
          </p>
          <div className="flex gap-2">
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border-0 flex-shrink-0" style={{ padding: "2px" }} />
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Section name, e.g. Healthcare AI"
              className="flex-1 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}
            />
          </div>
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
            style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }}
          />
          <button onClick={addSection} disabled={!newLabel.trim()}
            className="w-full py-2 text-xs font-medium rounded-xl disabled:opacity-30 transition-all"
            style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
            + Add section
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => onSave(local)}
            className="flex-1 py-2.5 text-xs font-medium rounded-xl"
            style={{ background: "var(--accent)", color: "#0a0a0b" }}>
            Save
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 text-xs rounded-xl"
            style={{ color: "var(--text-muted)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function ProjectsPage() {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [sortBy, setSortBy]       = useState<SortBy>("sort_order");
  const [filterStatus, setFilterStatus] = useState<string>("");

  /* Sections — dynamic, stored in localStorage for persistence */
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [activeSection, setActiveSection] = useState<string>("foundation");
  const [showSectionModal, setShowSectionModal] = useState(false);

  /* Delete confirm & undo */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [undoState, setUndoState]             = useState<UndoState | null>(null);
  const [undoProgress, setUndoProgress]       = useState(100);
  const undoProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Form fields */
  const [title, setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [techInput, setTechInput] = useState("");
  const [status, setStatus]     = useState<Project["status"]>("planning");
  const [progress, setProgress] = useState(0);
  const [github, setGithub]     = useState("");
  const [liveUrl, setLiveUrl]   = useState("");
  const [highlightsInput, setHighlightsInput] = useState("");

  /* Load sections from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("srn-project-sections");
      if (saved) setSections(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    fetchProjects()
      .then((d) => { setProjects(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const reload = useCallback(async () => setProjects(await fetchProjects()), []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory(""); setTechInput("");
    setStatus("planning"); setProgress(0); setGithub(""); setLiveUrl("");
    setHighlightsInput(""); setShowForm(false); setEditingId(null); setSaving(false);
  };

  /* ─── Save sections ─── */
  const handleSaveSections = (updated: Section[]) => {
    setSections(updated);
    localStorage.setItem("srn-project-sections", JSON.stringify(updated));
    setShowSectionModal(false);
    // If active section was removed, go to first
    if (!updated.find((s) => s.id === activeSection)) {
      setActiveSection(updated[0]?.id || "");
    }
  };

  /* ─── Save project ─── */
  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const tech       = techInput.split(",").map((t) => t.trim()).filter(Boolean);
      const highlights = highlightsInput.split("\n").map((h) => h.trim()).filter(Boolean);
      const data: Partial<Project> = {
        title: title.trim(), description: description.trim(),
        category: category.trim(), tech, status, progress,
        github_url: github.trim(), live_url: liveUrl.trim(), highlights,
      };
      if (editingId) await updateProject(editingId, data);
      else           await addProject(data);
      await reload(); resetForm();
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: editingId ? "Updated" : "Added", type: "success" } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: err?.message || "Failed", type: "error" } }));
      setSaving(false);
    }
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id); setTitle(p.title); setDescription(p.description || "");
    setCategory(p.category || ""); setTechInput(p.tech?.join(", ") || "");
    setStatus(p.status); setProgress(p.progress); setGithub(p.github_url || "");
    setLiveUrl(p.live_url || ""); setHighlightsInput(p.highlights?.join("\n") || "");
    setShowForm(true); setExpandedId(null); setConfirmDeleteId(null);
  };

  /* ─── Delete with undo ─── */
  const startDeleteCountdown = (project: Project) => {
    // Clear any existing
    if (undoState) clearTimeout(undoState.timeoutId);
    if (undoProgressRef.current) clearInterval(undoProgressRef.current);

    setUndoProgress(100);

    const timeoutId = setTimeout(async () => {
      await deleteProject(project.id);
      await reload();
      setUndoState(null);
      if (undoProgressRef.current) clearInterval(undoProgressRef.current);
    }, 5000);

    // Progress bar countdown
    let pct = 100;
    undoProgressRef.current = setInterval(() => {
      pct -= 2;
      setUndoProgress(Math.max(0, pct));
      if (pct <= 0 && undoProgressRef.current) clearInterval(undoProgressRef.current);
    }, 100);

    setUndoState({ projectId: project.id, projectData: project, timeoutId });
    setConfirmDeleteId(null);
  };

  const handleUndo = () => {
    if (!undoState) return;
    clearTimeout(undoState.timeoutId);
    if (undoProgressRef.current) clearInterval(undoProgressRef.current);
    setUndoState(null);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Delete undone", type: "success" } }));
  };

  const handleProgressUpdate = async (id: string, val: number) => {
    const updates: Partial<Project> = { progress: val };
    if (val === 100)  updates.status = "completed";
    else if (val > 0) updates.status = "in-progress";
    else              updates.status = "planning";
    await updateProject(id, updates); await reload();
  };

  const handleStatusChange = async (id: string, s: Project["status"]) => {
    const updates: Partial<Project> = { status: s };
    if (s === "completed" || s === "deployed") updates.progress = 100;
    else if (s === "planning")                 updates.progress = 0;
    await updateProject(id, updates); await reload();
  };

  /* ─── Computed ─── */

  /* Which section does a project belong to? */
  const getSectionForProject = useCallback((category: string): string => {
    for (const sec of sections) {
      if (sec.categories.includes(category)) return sec.id;
    }
    return "__uncategorised__";
  }, [sections]);

  const activeSectionData = sections.find((s) => s.id === activeSection);

  /* Counts per section */
  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      const sid = getSectionForProject(p.category || "");
      counts[sid] = (counts[sid] || 0) + 1;
    });
    return counts;
  }, [projects, getSectionForProject]);

  const uncategorisedCount = sectionCounts["__uncategorised__"] || 0;

  /* Projects for current tab */
  const visibleProjects = useMemo(() => {
    let list: Project[];
    if (activeSection === "__all__") {
      list = [...projects];
    } else if (activeSection === "__uncategorised__") {
      list = projects.filter((p) => getSectionForProject(p.category || "") === "__uncategorised__");
    } else {
      const sec = sections.find((s) => s.id === activeSection);
      list = sec
        ? projects.filter((p) => sec.categories.includes(p.category || ""))
        : [];
    }
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "progress": return b.progress - a.progress;
        case "status":   return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        case "title":    return a.title.localeCompare(b.title);
        case "updated":  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:         return a.sort_order - b.sort_order;
      }
    });
  }, [projects, activeSection, sections, filterStatus, sortBy, getSectionForProject]);

  const totalProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    projects.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [projects]);

  /* All categories in use (for form) */
  const allCategoriesInSections = useMemo(
    () => sections.flatMap((s) => s.categories),
    [sections]
  );

  /* ─── Tab list ─── */
  const tabs = useMemo(() => {
    const list = [
      { id: "__all__", label: "All", color: "var(--accent)", count: projects.length },
      ...sections.map((s) => ({ id: s.id, label: s.label, color: s.color, count: sectionCounts[s.id] || 0 })),
    ];
    if (uncategorisedCount > 0) {
      list.push({ id: "__uncategorised__", label: "Uncategorised", color: "#94a3b8", count: uncategorisedCount });
    }
    return list;
  }, [sections, sectionCounts, projects.length, uncategorisedCount]);

  /* ─── Render ─── */
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <header className="mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              ML Portfolio
            </h1>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              {projects.filter((p) => p.status === "completed" || p.status === "deployed").length}/{projects.length} done · {totalProgress}% overall
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSectionModal(true)}
              className="cc-btn px-3 py-2 text-xs"
              style={{ color: "var(--cc-text-muted)" }}
            >
              <span style={{ position: "relative", zIndex: 3 }}>⚙ Sections</span>
            </button>
            {!showForm && (
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="cc-btn cc-btn-accent px-4 py-2 text-xs"
              >
                <span style={{ position: "relative", zIndex: 3 }}>+ Add project</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Overall progress ── */}
      {projects.length > 0 && (
        <div className="flex items-center gap-3 mb-4 animate-fade-in-up" style={{ animationDelay: "20ms" }}>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${totalProgress}%`, background: `linear-gradient(90deg,var(--accent),hsla(var(--accent-h),var(--accent-s),calc(var(--accent-l)+15%),1))` }}
            />
          </div>
          <span className="text-[10px] font-mono" style={{ color: "var(--accent)" }}>{totalProgress}%</span>
        </div>
      )}

      {/* ── Status filter + sort ── */}
      {projects.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4 animate-fade-in-up" style={{ animationDelay: "30ms" }}>
          {STATUS_OPTIONS.map((s) => {
            const count  = statusCounts[s.value] || 0;
            const active = filterStatus === s.value;
            return (
              <button key={s.value} onClick={() => setFilterStatus(active ? "" : s.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-mono transition-all"
                style={{
                  background: active ? `${s.color}18` : "var(--glass-fill)",
                  border: `0.5px solid ${active ? `${s.color}40` : "var(--glass-border)"}`,
                  color: active ? s.color : "var(--text-muted)",
                  backdropFilter: "blur(12px)",
                }}>
                {s.emoji} {s.label} <span style={{ opacity: 0.6 }}>({count})</span>
              </button>
            );
          })}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="ml-auto glass rounded-xl px-3 py-1.5 text-[10px] font-mono focus:outline-none cursor-pointer"
            style={{ color: "var(--text-secondary)" }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* ── Section tabs — horizontal scroll on mobile ── */}
      <div className="mb-4 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        <div
          className="flex gap-1 p-1 rounded-[16px] overflow-x-auto"
          style={{
            background: "var(--glass-fill-deep)",
            border: "0.5px solid var(--glass-border)",
            scrollbarWidth: "none",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveSection(tab.id); setExpandedId(null); }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[11px] transition-all duration-200 relative overflow-hidden"
                style={{
                  background:     isActive ? "var(--cc-glass-hover)" : "transparent",
                  border:         `0.5px solid ${isActive ? `${tab.color}40` : "transparent"}`,
                  backdropFilter: isActive ? "blur(20px) saturate(1.8)" : "none",
                  boxShadow:      isActive ? `inset 0 1px 0 var(--specular-top), 0 2px 10px ${tab.color}18` : "none",
                  whiteSpace:     "nowrap",
                }}
              >
                {/* Active specular top */}
                {isActive && (
                  <div style={{
                    position: "absolute", top: 0, left: "10%", right: "10%", height: "0.5px",
                    background: `linear-gradient(90deg,transparent,${tab.color}70,transparent)`,
                    pointerEvents: "none",
                  }} />
                )}
                {/* Colour dot */}
                <span
                  style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: tab.color,
                    boxShadow: isActive ? `0 0 6px ${tab.color}80` : "none",
                    flexShrink: 0,
                    transition: "box-shadow 0.2s",
                  }}
                />
                <span
                  className="text-[11px] font-medium"
                  style={{
                    color: isActive ? "var(--text-primary)" : "var(--cc-text-muted)",
                    transition: "color 0.2s",
                  }}
                >
                  {tab.label}
                </span>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-lg"
                  style={{
                    background: isActive ? `${tab.color}20` : "var(--glass-fill)",
                    color: isActive ? tab.color : "var(--text-muted)",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active section description */}
        {activeSectionData && activeSection !== "__all__" && activeSection !== "__uncategorised__" && (
          <div
            className="mt-2 px-3 py-2 rounded-[11px] animate-fade-in flex items-center gap-2"
            style={{
              background: `${activeSectionData.color}10`,
              border: `0.5px solid ${activeSectionData.color}28`,
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: activeSectionData.color, flexShrink: 0 }} />
            <p className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
              {activeSectionData.description}
            </p>
          </div>
        )}
      </div>

      {/* ── Add / Edit form ── */}
      {showForm && (
        <div className="spatial p-5 sm:p-6 mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {editingId ? "Edit project" : "New project"}
            </h2>
            <button onClick={resetForm} className="text-xs px-2.5 py-1 rounded-xl skeuo-raised" style={{ color: "var(--text-muted)" }}>
              Cancel
            </button>
          </div>
          <div className="space-y-3">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title *" autoFocus
              className="w-full rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }}
            />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this project do..." rows={2}
              className="w-full rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }}
            />

            {/* Category picker — grouped by section */}
            <div>
              <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Category — determines which section this appears in
              </span>
              <div className="space-y-2.5">
                {sections.map((sec) => (
                  <div key={sec.id}>
                    <span className="text-[9px] font-mono uppercase tracking-wider block mb-1"
                      style={{ color: sec.color }}>
                      {sec.label}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sec.categories.length > 0 ? sec.categories.map((c) => (
                        <button key={c} onClick={() => setCategory(c)}
                          className="px-2.5 py-1 text-[10px] font-mono rounded-xl transition-all"
                          style={{
                            background: category === c ? `${sec.color}18` : "var(--bg-card)",
                            color:      category === c ? sec.color : "var(--text-muted)",
                            border:     `0.5px solid ${category === c ? `${sec.color}40` : "var(--border-default)"}`,
                          }}>
                          {c}
                        </button>
                      )) : (
                        <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
                          No categories — edit sections to add
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {/* Custom category input */}
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                    Or type custom
                  </span>
                  <input value={category} onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Healthcare AI, Robotics..."
                    className="w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                    style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            </div>

            <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)}
              placeholder="Tech stack: Python, PyTorch, FastAPI, Docker..."
              className="w-full rounded-2xl px-4 py-2.5 text-xs font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }}
            />
            <textarea value={highlightsInput} onChange={(e) => setHighlightsInput(e.target.value)}
              placeholder={"Key deliverables (one per line)"}
              rows={3} className="w-full rounded-2xl px-4 py-2.5 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }}
            />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={github}  onChange={(e) => setGithub(e.target.value)}  placeholder="GitHub URL"    className="rounded-2xl px-3 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
              <input type="text" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="Live demo URL" className="rounded-2xl px-3 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Status</span>
                <div className="flex gap-1">
                  {STATUS_OPTIONS.map((s) => (
                    <button key={s.value} onClick={() => setStatus(s.value as Project["status"])}
                      className="flex-1 py-2 text-[9px] font-mono rounded-xl transition-all"
                      style={{
                        background: status === s.value ? `${s.color}15` : "var(--bg-input)",
                        color:      status === s.value ? s.color : "var(--text-muted)",
                        border:     `0.5px solid ${status === s.value ? `${s.color}40` : "var(--border-default)"}`,
                      }}>
                      {s.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Progress: {progress}%</span>
                <ColoredSlider value={progress} color="var(--accent)" onChange={setProgress} />
              </div>
            </div>
            <button onClick={handleSave} disabled={!title.trim() || saving}
              className="w-full py-3 text-xs font-medium rounded-2xl transition-all disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add project"}
            </button>
          </div>
        </div>
      )}

      {/* ── Project cards ── */}
      {loading ? (
        <div className="text-center py-16">
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading...</span>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div
          className="p-10 text-center rounded-[22px] animate-fade-in"
          style={{
            background: activeSectionData ? `${activeSectionData.color}0a` : "var(--glass-fill)",
            border: `0.5px solid ${activeSectionData ? `${activeSectionData.color}25` : "var(--glass-border)"}`,
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            {projects.length === 0 ? "No projects yet" : "No projects in this section"}
          </p>
          <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>
            {activeSectionData?.description || "Add a project to get started."}
          </p>
          <button onClick={() => { setShowForm(true); }}
            className="px-5 py-2.5 text-xs font-medium rounded-2xl transition-all"
            style={{ background: activeSectionData?.color || "var(--accent)", color: "#0a0a0b" }}>
            + Add project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleProjects.map((p, i) => {
            const sc       = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
            const secData  = sections.find((s) => s.categories.includes(p.category || ""));
            const secColor = secData?.color || "#94a3b8";
            const isExpanded     = expandedId === p.id;
            const isConfirmDelete = confirmDeleteId === p.id;
            const isPendingDelete = undoState?.projectId === p.id;

            return (
              <div
                key={p.id}
                className="liquid-glass rounded-[22px] overflow-hidden hover-lift animate-fade-in-up"
                style={{
                  animationDelay: `${i * 35}ms`,
                  opacity: isPendingDelete ? 0.45 : 1,
                  transition: "opacity 0.3s ease",
                }}
              >
                {/* Section colour top stripe */}
                <div style={{ height: "2px", background: `linear-gradient(90deg,${secColor}80,transparent)` }} />

                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setExpandedId(isExpanded ? null : p.id); setConfirmDeleteId(null); }}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm">{sc.emoji}</span>
                        <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl"
                          style={{ background: `${sc.color}12`, color: sc.color, border: `0.5px solid ${sc.color}30` }}>
                          {sc.label}
                        </span>
                        {p.category && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl"
                            style={{ background: `${secColor}10`, color: secColor, border: `0.5px solid ${secColor}28` }}>
                            {p.category}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{p.description}</p>
                      )}
                    </div>

                    {/* Circular progress */}
                    <svg width="48" height="48" viewBox="0 0 52 52" className="flex-shrink-0">
                      <circle cx="26" cy="26" r="22" fill="none" strokeWidth="3" style={{ stroke: "var(--border-default)" }} />
                      <circle cx="26" cy="26" r="22" fill="none" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 22}
                        strokeDashoffset={2 * Math.PI * 22 * (1 - p.progress / 100)}
                        style={{ stroke: sc.color, transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.5s" }}
                      />
                      <text x="26" y="26" textAnchor="middle" dominantBaseline="central"
                        style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 500, fill: sc.color }}>
                        {p.progress}%
                      </text>
                    </svg>
                  </div>

                  {/* Slider */}
                  <div className="mt-3">
                    <ColoredSlider value={p.progress} color={sc.color} onChange={(v) => handleProgressUpdate(p.id, v)} />
                  </div>

                  {/* Tech tags */}
                  {p.tech && p.tech.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {p.tech.map((t) => (
                        <span key={t} className="text-[9px] font-mono px-2 py-0.5 rounded-lg"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "0.5px solid var(--glass-border-subtle)" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confirm delete inline */}
                  {isConfirmDelete && (
                    <DeleteConfirm
                      title={p.title}
                      onConfirm={() => startDeleteCountdown(p)}
                      onCancel={() => setConfirmDeleteId(null)}
                    />
                  )}

                  {/* Expanded */}
                  {isExpanded && !isConfirmDelete && (
                    <div className="mt-4 pt-4 space-y-4 animate-fade-in" style={{ borderTop: "0.5px solid var(--border-default)" }}>
                      <div>
                        <span className="text-[10px] font-mono block mb-2" style={{ color: "var(--text-muted)" }}>Status</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {STATUS_OPTIONS.map((s) => (
                            <button key={s.value}
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, s.value as Project["status"]); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded-xl transition-all"
                              style={{
                                background: p.status === s.value ? `${s.color}15` : "var(--bg-card)",
                                color:      p.status === s.value ? s.color : "var(--text-muted)",
                                border:     `0.5px solid ${p.status === s.value ? `${s.color}35` : "var(--border-default)"}`,
                              }}>
                              {s.emoji} {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {p.highlights && p.highlights.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Deliverables</span>
                          {p.highlights.map((h, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-1.5">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: secColor }} />
                              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(p.github_url || p.live_url) && (
                        <div className="flex gap-2">
                          {p.github_url && (
                            <a href={p.github_url} target="_blank" rel="noopener"
                              className="text-[10px] font-mono px-3 py-2 rounded-xl hover-lift"
                              style={{ color: "var(--text-secondary)", border: "0.5px solid var(--glass-border)" }}
                              onClick={(e) => e.stopPropagation()}>GitHub →</a>
                          )}
                          {p.live_url && (
                            <a href={p.live_url} target="_blank" rel="noopener"
                              className="text-[10px] font-mono px-3 py-2 rounded-xl hover-lift"
                              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                              onClick={(e) => e.stopPropagation()}>Demo →</a>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                          className="px-3 py-1.5 text-[10px] font-mono rounded-xl"
                          style={{ color: "var(--text-secondary)", border: "0.5px solid var(--glass-border)" }}>
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                          className="px-3 py-1.5 text-[10px] font-mono rounded-xl transition-all"
                          style={{ color: "#f87171", border: "0.5px solid rgba(248,65,65,0.25)" }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Section manage modal ── */}
      {showSectionModal && (
        <SectionModal
          sections={sections}
          onSave={handleSaveSections}
          onClose={() => setShowSectionModal(false)}
        />
      )}

      {/* ── Undo toast ── */}
      {undoState && (
        <UndoToast
          project={undoState.projectData}
          onUndo={handleUndo}
          onDismiss={() => {
            clearTimeout(undoState.timeoutId);
            deleteProject(undoState.projectId).then(reload);
            setUndoState(null);
          }}
          progress={undoProgress}
        />
      )}
    </div>
  );
}
