"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchProjects, addProject, updateProject, deleteProject, type Project } from "@/lib/supabase";

/* ─── Constants ─── */
const STATUS_OPTIONS = [
  { value: "planning",    label: "Planning",     color: "#94a3b8", emoji: "📋" },
  { value: "in-progress", label: "In Progress",  color: "#60a5fa", emoji: "🔨" },
  { value: "completed",   label: "Completed",    color: "#6ee7b7", emoji: "✅" },
  { value: "deployed",    label: "Deployed",     color: "#a78bfa", emoji: "🚀" },
];

const CATEGORY_PRESETS = [
  "Classical ML", "NLP", "Deep Learning", "LLMs & GenAI",
  "MLOps", "RecSys", "Data Engineering", "Computer Vision",
  "Healthcare ML", "Time Series", "Full Stack",
];

/* ─── Tier system — A/B/C ─── */
const TIERS = [
  {
    id: "A",
    label: "Tier A — Foundation ML",
    subtitle: "Classical ML · SQL Analytics · Stats",
    description: "Build your ML fundamentals. These projects prove you can do end-to-end ML work — the minimum bar for any DS/MLE role.",
    color: "#5ecf95",
    accent: "rgba(94,207,149,0.12)",
    border: "rgba(94,207,149,0.28)",
    categories: ["Classical ML", "Data Engineering", "Time Series"],
  },
  {
    id: "B",
    label: "Tier B — NLP & Deep Learning",
    subtitle: "NLP · Deep Learning · LLMs",
    description: "The stack that separates ML Engineers from analysts. Transformers, fine-tuning, RAG — this is what top MNCs test.",
    color: "#4da6ff",
    accent: "rgba(77,166,255,0.12)",
    border: "rgba(77,166,255,0.28)",
    categories: ["NLP", "Deep Learning", "LLMs & GenAI", "Computer Vision"],
  },
  {
    id: "C",
    label: "Tier C — MLOps & Systems",
    subtitle: "MLOps · RecSys · Deployment",
    description: "Production ML skills. Docker, APIs, monitoring, recommendation systems — what you build in the Hackathon.",
    color: "#b48eff",
    accent: "rgba(180,142,255,0.12)",
    border: "rgba(180,142,255,0.28)",
    categories: ["MLOps", "RecSys", "Full Stack", "Healthcare ML"],
  },
];

type SortBy = "sort_order" | "progress" | "status" | "title" | "updated";
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "sort_order", label: "Default" },
  { value: "progress",   label: "Progress" },
  { value: "status",     label: "Status" },
  { value: "title",      label: "A–Z" },
  { value: "updated",    label: "Recent" },
];
const STATUS_ORDER: Record<string, number> = { deployed: 0, completed: 1, "in-progress": 2, planning: 3 };

function ColoredSlider({ value, color, onChange }: { value: number; color: string; onChange: (v: number) => void }) {
  return (
    <input type="range" min="0" max="100" step="5" value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
      style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, var(--bg-input) ${value}%, var(--bg-input) 100%)` }}
    />
  );
}

/* ─── Helper: assign tier from category ─── */
function getTierForProject(category: string): string {
  for (const tier of TIERS) {
    if (tier.categories.includes(category)) return tier.id;
  }
  return "A"; // default
}

export default function ProjectsPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [sortBy, setSortBy]         = useState<SortBy>("sort_order");
  const [activeTier, setActiveTier] = useState<string>("A");
  const [filterStatus, setFilterStatus] = useState<string>("");

  /* form state */
  const [title, setTitle]                   = useState("");
  const [description, setDescription]       = useState("");
  const [category, setCategory]             = useState("");
  const [techInput, setTechInput]           = useState("");
  const [status, setStatus]                 = useState<Project["status"]>("planning");
  const [progress, setProgress]             = useState(0);
  const [github, setGithub]                 = useState("");
  const [liveUrl, setLiveUrl]               = useState("");
  const [highlightsInput, setHighlightsInput] = useState("");

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
    setShowForm(true); setExpandedId(null);
  };

  const handleDelete = async (id: string) => { await deleteProject(id); await reload(); };

  const handleProgressUpdate = async (id: string, val: number) => {
    const updates: Partial<Project> = { progress: val };
    if (val === 100)    updates.status = "completed";
    else if (val > 0)   updates.status = "in-progress";
    else                updates.status = "planning";
    await updateProject(id, updates); await reload();
  };

  const handleStatusChange = async (id: string, s: Project["status"]) => {
    const updates: Partial<Project> = { status: s };
    if (s === "completed" || s === "deployed") updates.progress = 100;
    else if (s === "planning")                 updates.progress = 0;
    await updateProject(id, updates); await reload();
  };

  /* ─── Computed ─── */
  const tierProjects = useMemo(() => {
    const currentTier = TIERS.find((t) => t.id === activeTier)!;
    let list = projects.filter((p) => {
      const tier = getTierForProject(p.category || "");
      return tier === activeTier;
    });
    // Projects with unrecognised category go into Tier A
    if (activeTier === "A") {
      const categorised = new Set(TIERS.flatMap((t) => t.categories));
      list = [
        ...list,
        ...projects.filter((p) => !categorised.has(p.category || "")),
      ];
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
  }, [projects, activeTier, sortBy, filterStatus]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const categorised = new Set(TIERS.flatMap((t) => t.categories));
    projects.forEach((p) => {
      const tier = getTierForProject(p.category || "");
      counts[tier] = (counts[tier] || 0) + 1;
    });
    // uncategorised go to A
    projects.filter((p) => !categorised.has(p.category || "")).forEach(() => {
      counts["A"] = (counts["A"] || 0); // already counted above
    });
    return counts;
  }, [projects]);

  const totalProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    projects.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [projects]);

  const activeTierData = TIERS.find((t) => t.id === activeTier)!;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <header className="mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              ML Portfolio
            </h1>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              {projects.filter((p) => p.status === "completed" || p.status === "deployed").length}/{projects.length} done · {totalProgress}% overall
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="liquid-glass px-4 py-2 text-xs font-medium rounded-2xl hover-lift cursor-pointer"
              style={{ color: "var(--accent)" }}
            >
              + Add project
            </button>
          )}
        </div>
      </header>

      {/* ── Overall progress bar ── */}
      {projects.length > 0 && (
        <div className="flex items-center gap-3 mb-4 animate-fade-in-up" style={{ animationDelay: "20ms" }}>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${totalProgress}%`,
                background: `linear-gradient(90deg, var(--accent), hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 15%), 1))`,
              }}
            />
          </div>
          <span className="text-[10px] font-mono" style={{ color: "var(--accent)" }}>{totalProgress}%</span>
        </div>
      )}

      {/* ── Status filter pills ── */}
      {projects.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4 animate-fade-in-up" style={{ animationDelay: "30ms" }}>
          {STATUS_OPTIONS.map((s) => {
            const count  = statusCounts[s.value] || 0;
            const active = filterStatus === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setFilterStatus(active ? "" : s.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-mono transition-all"
                style={{
                  background: active ? `${s.color}18` : "var(--glass-fill)",
                  border: `0.5px solid ${active ? `${s.color}40` : "var(--glass-border)"}`,
                  color: active ? s.color : "var(--text-muted)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
                <span style={{ opacity: 0.65 }}>({count})</span>
              </button>
            );
          })}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="ml-auto glass rounded-xl px-3 py-1.5 text-[10px] font-mono focus:outline-none cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* ── A / B / C Tier Tabs ── */}
      <div className="mb-5 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        <div
          className="flex gap-2 p-1.5 rounded-[18px]"
          style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border)" }}
        >
          {TIERS.map((tier) => {
            const isActive = activeTier === tier.id;
            const count    = tierCounts[tier.id] || 0;
            return (
              <button
                key={tier.id}
                onClick={() => { setActiveTier(tier.id); setExpandedId(null); }}
                className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-3 rounded-[13px] transition-all duration-250 relative overflow-hidden"
                style={{
                  background:   isActive ? "var(--cc-glass-hover)" : "transparent",
                  border:       `0.5px solid ${isActive ? tier.border : "transparent"}`,
                  backdropFilter: isActive ? "blur(20px) saturate(1.8)" : "none",
                  boxShadow:    isActive
                    ? `inset 0 1px 0 var(--specular-top), 0 4px 16px ${tier.accent}`
                    : "none",
                  transform:    isActive ? "translateY(0)" : "translateY(0)",
                }}
              >
                {/* specular top on active */}
                {isActive && (
                  <div style={{
                    position: "absolute", top: 0, left: "10%", right: "10%", height: "0.5px",
                    background: `linear-gradient(90deg, transparent, ${tier.color}60, transparent)`,
                    pointerEvents: "none",
                  }} />
                )}
                {/* Tier badge */}
                <span
                  className="text-base sm:text-xl font-bold font-mono leading-none"
                  style={{
                    color: isActive ? tier.color : "var(--cc-text-muted)",
                    textShadow: isActive ? `0 0 12px ${tier.color}50` : "none",
                    transition: "color 0.2s, text-shadow 0.2s",
                  }}
                >
                  {tier.id}
                </span>
                <div className="flex flex-col items-center sm:items-start">
                  <span
                    className="text-[10px] sm:text-[11px] font-medium leading-none"
                    style={{
                      color: isActive ? "var(--text-primary)" : "var(--cc-text-muted)",
                      transition: "color 0.2s",
                    }}
                  >
                    {tier.subtitle.split("·")[0].trim()}
                  </span>
                  {/* Project count dot */}
                  <span
                    className="text-[9px] font-mono mt-0.5"
                    style={{ color: isActive ? tier.color : "var(--text-muted)" }}
                  >
                    {count} project{count !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active tier description */}
        <div
          className="mt-2 px-4 py-2.5 rounded-[13px] animate-fade-in"
          style={{
            background: activeTierData.accent,
            border: `0.5px solid ${activeTierData.border}`,
          }}
        >
          <p className="text-[11px] font-medium" style={{ color: activeTierData.color }}>
            {activeTierData.label}
          </p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {activeTierData.description}
          </p>
        </div>
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
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this project do..." rows={2}
              className="w-full rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />

            {/* Category — grouped by tier */}
            <div>
              <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Category (sets Tier automatically)</span>
              <div className="space-y-2">
                {TIERS.map((tier) => (
                  <div key={tier.id}>
                    <span className="text-[9px] font-mono uppercase tracking-wider block mb-1" style={{ color: tier.color }}>
                      Tier {tier.id} — {tier.subtitle}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tier.categories.map((c) => (
                        <button key={c} onClick={() => setCategory(c)}
                          className="px-2.5 py-1 text-[10px] font-mono rounded-xl transition-all skeuo-raised"
                          style={{
                            background: category === c ? `${tier.color}18` : "var(--bg-card)",
                            color:      category === c ? tier.color : "var(--text-muted)",
                            border:     `0.5px solid ${category === c ? `${tier.color}40` : "var(--border-default)"}`,
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)}
              placeholder="Tech stack: Python, PyTorch, FastAPI, Docker..."
              className="w-full rounded-2xl px-4 py-2.5 text-xs font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />

            <textarea value={highlightsInput} onChange={(e) => setHighlightsInput(e.target.value)}
              placeholder={"Key deliverables (one per line)\ne.g. Train model achieving >90% F1\nDeploy as FastAPI endpoint"}
              rows={3} className="w-full rounded-2xl px-4 py-2.5 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />

            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={github}  onChange={(e) => setGithub(e.target.value)}  placeholder="GitHub URL"   className="rounded-2xl px-3 py-2.5 text-xs font-mono focus:outline-none" style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
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
                      }}
                    >
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
              className="w-full py-3 text-xs font-medium rounded-2xl transition-all disabled:opacity-30 skeuo-raised"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}
            >
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
      ) : tierProjects.length === 0 ? (
        <div
          className="p-10 text-center rounded-[22px] animate-fade-in"
          style={{ background: activeTierData.accent, border: `0.5px solid ${activeTierData.border}` }}
        >
          <p className="text-2xl font-bold mb-2" style={{ color: activeTierData.color }}>Tier {activeTierData.id}</p>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No projects here yet</p>
          <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>{activeTierData.description}</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 text-xs font-medium rounded-2xl transition-all"
            style={{ background: activeTierData.color, color: "#0a0a0b" }}
          >
            + Add Tier {activeTierData.id} project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tierProjects.map((p, i) => {
            const sc         = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
            const tierData   = TIERS.find((t) => t.id === getTierForProject(p.category || "")) || TIERS[0];
            const isExpanded = expandedId === p.id;

            return (
              <div
                key={p.id}
                className="liquid-glass rounded-[22px] overflow-hidden hover-lift animate-fade-in-up"
                style={{
                  animationDelay: `${i * 40}ms`,
                  borderColor: isExpanded ? tierData.border : "var(--glass-border)",
                }}
              >
                {/* Tier colour top stripe */}
                <div style={{ height: "2px", background: `linear-gradient(90deg, ${tierData.color}60, transparent)` }} />

                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm">{sc.emoji}</span>
                        <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
                        {/* Status badge */}
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl"
                          style={{ background: `${sc.color}12`, color: sc.color, border: `0.5px solid ${sc.color}30` }}>
                          {sc.label}
                        </span>
                        {/* Tier badge */}
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl"
                          style={{ background: tierData.accent, color: tierData.color, border: `0.5px solid ${tierData.border}` }}>
                          Tier {tierData.id}
                        </span>
                        {p.category && (
                          <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{p.category}</span>
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

                  {/* Progress slider */}
                  <div className="mt-3">
                    <ColoredSlider value={p.progress} color={sc.color} onChange={(v) => handleProgressUpdate(p.id, v)} />
                  </div>

                  {/* Tech tags */}
                  {p.tech && p.tech.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {p.tech.map((t) => (
                        <span key={t} className="text-[9px] font-mono px-2 py-0.5 rounded-lg skeuo-raised"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 space-y-4 animate-fade-in" style={{ borderTop: "0.5px solid var(--border-default)" }}>
                      {/* Status changer */}
                      <div>
                        <span className="text-[10px] font-mono block mb-2" style={{ color: "var(--text-muted)" }}>Status</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {STATUS_OPTIONS.map((s) => (
                            <button key={s.value}
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, s.value as Project["status"]); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded-xl transition-all skeuo-raised"
                              style={{
                                background: p.status === s.value ? `${s.color}15` : "var(--bg-card)",
                                color:      p.status === s.value ? s.color : "var(--text-muted)",
                              }}
                            >
                              <span>{s.emoji}</span> {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Deliverables */}
                      {p.highlights && p.highlights.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>
                            Deliverables
                          </span>
                          {p.highlights.map((h, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-1.5">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tierData.color }} />
                              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Links */}
                      {(p.github_url || p.live_url) && (
                        <div className="flex gap-2">
                          {p.github_url && (
                            <a href={p.github_url} target="_blank" rel="noopener"
                              className="text-[10px] font-mono px-3 py-2 rounded-xl skeuo-raised hover-lift"
                              style={{ color: "var(--text-secondary)" }}
                              onClick={(e) => e.stopPropagation()}>
                              GitHub →
                            </a>
                          )}
                          {p.live_url && (
                            <a href={p.live_url} target="_blank" rel="noopener"
                              className="text-[10px] font-mono px-3 py-2 rounded-xl skeuo-raised hover-lift"
                              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                              onClick={(e) => e.stopPropagation()}>
                              Demo →
                            </a>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                          className="px-3 py-1.5 text-[10px] font-mono rounded-xl skeuo-raised"
                          style={{ color: "var(--text-secondary)" }}>
                          Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                          className="px-3 py-1.5 text-[10px] font-mono rounded-xl"
                          style={{ color: "#f87171" }}>
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
    </div>
  );
}
