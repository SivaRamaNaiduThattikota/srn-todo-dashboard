"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchProjects, addProject, updateProject, deleteProject, type Project } from "@/lib/supabase";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning", color: "#94a3b8", emoji: "📋" },
  { value: "in-progress", label: "In Progress", color: "#60a5fa", emoji: "🔨" },
  { value: "completed", label: "Completed", color: "#6ee7b7", emoji: "✅" },
  { value: "deployed", label: "Deployed", color: "#a78bfa", emoji: "🚀" },
];

const CATEGORY_PRESETS = ["Healthcare ML", "NLP", "Computer Vision", "RecSys", "Time Series", "MLOps", "Data Engineering", "GenAI", "Full Stack"];
type SortBy = "sort_order" | "progress" | "status" | "title" | "updated";
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "sort_order", label: "Default" },
  { value: "progress", label: "Progress" },
  { value: "status", label: "Status" },
  { value: "title", label: "Title A-Z" },
  { value: "updated", label: "Recently updated" },
];

const STATUS_ORDER: Record<string, number> = { "deployed": 0, "completed": 1, "in-progress": 2, "planning": 3 };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("sort_order");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [techInput, setTechInput] = useState("");
  const [status, setStatus] = useState<Project["status"]>("planning");
  const [progress, setProgress] = useState(0);
  const [github, setGithub] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [highlightsInput, setHighlightsInput] = useState("");

  useEffect(() => { fetchProjects().then((d) => { setProjects(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const reload = async () => setProjects(await fetchProjects());

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory(""); setTechInput(""); setStatus("planning");
    setProgress(0); setGithub(""); setLiveUrl(""); setHighlightsInput("");
    setShowForm(false); setEditingId(null); setSaving(false);
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const tech = techInput.split(",").map((t) => t.trim()).filter(Boolean);
      const highlights = highlightsInput.split("\n").map((h) => h.trim()).filter(Boolean);
      const data: Partial<Project> = { title: title.trim(), description: description.trim(), category: category.trim(), tech, status, progress, github_url: github.trim(), live_url: liveUrl.trim(), highlights };
      if (editingId) await updateProject(editingId, data); else await addProject(data);
      await reload(); resetForm();
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: editingId ? "Project updated" : "Project added", type: "success" } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: err?.message || "Failed", type: "error" } }));
      setSaving(false);
    }
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id); setTitle(p.title); setDescription(p.description || ""); setCategory(p.category || "");
    setTechInput(p.tech?.join(", ") || ""); setStatus(p.status); setProgress(p.progress);
    setGithub(p.github_url || ""); setLiveUrl(p.live_url || ""); setHighlightsInput(p.highlights?.join("\n") || "");
    setShowForm(true); setExpandedId(null);
  };

  const handleDelete = async (id: string) => { await deleteProject(id); await reload(); };

  const handleProgressUpdate = async (id: string, val: number) => {
    const updates: Partial<Project> = { progress: val };
    if (val === 100) updates.status = "completed"; else if (val > 0) updates.status = "in-progress"; else updates.status = "planning";
    await updateProject(id, updates); await reload();
  };

  const handleStatusChange = async (id: string, s: Project["status"]) => {
    const updates: Partial<Project> = { status: s };
    if (s === "completed" || s === "deployed") updates.progress = 100; else if (s === "planning") updates.progress = 0;
    await updateProject(id, updates); await reload();
  };

  // Sort + filter
  const sorted = useMemo(() => {
    let list = filterStatus ? projects.filter((p) => p.status === filterStatus) : projects;
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "progress": return b.progress - a.progress;
        case "status": return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        case "title": return a.title.localeCompare(b.title);
        case "updated": return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default: return a.sort_order - b.sort_order;
      }
    });
  }, [projects, sortBy, filterStatus]);

  const totalProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    projects.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [projects]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>ML Portfolio</h1>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>{projects.filter((p) => p.status === "completed" || p.status === "deployed").length}/{projects.length} done · {totalProgress}%</p>
          </div>
          {!showForm && (
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="liquid-glass px-4 py-2 text-xs font-medium rounded-2xl hover-lift cursor-pointer"
              style={{ color: "var(--accent)" }}>
              + Add project
            </button>
          )}
        </div>
      </header>

      {/* Stats row — claymorphism cards */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
          {STATUS_OPTIONS.map((s) => {
            const count = statusCounts[s.value] || 0;
            const isActive = filterStatus === s.value;
            return (
              <button key={s.value} onClick={() => setFilterStatus(isActive ? "" : s.value)}
                className="clay rounded-2xl p-4 text-left transition-all hover-lift"
                style={{ borderColor: isActive ? `${s.color}40` : "var(--border-subtle)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{s.emoji}</span>
                  <span className="text-lg font-bold font-mono" style={{ color: s.color }}>{count}</span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: isActive ? s.color : "var(--text-muted)" }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sort + overall progress */}
      {projects.length > 0 && (
        <div className="flex items-center gap-3 mb-4 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <div className="flex-1">
            <div className="h-1.5 rounded-full overflow-hidden skeuo-inset" style={{ background: "var(--bg-input)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${totalProgress}%`, background: `linear-gradient(90deg, var(--accent), hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 15%), 1))` }} />
            </div>
          </div>
          <span className="text-[10px] font-mono" style={{ color: "var(--accent)" }}>{totalProgress}%</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="glass rounded-xl px-3 py-1.5 text-[10px] font-mono focus:outline-none cursor-pointer"
            style={{ color: "var(--text-secondary)" }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* Add/Edit form — spatial panel */}
      {showForm && (
        <div className="spatial p-5 sm:p-6 mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit project" : "New project"}</h2>
            <button onClick={resetForm} className="text-xs px-2.5 py-1 rounded-xl skeuo-raised" style={{ color: "var(--text-muted)" }}>Cancel</button>
          </div>
          <div className="space-y-3">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title *" autoFocus
              className="w-full rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />

            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this project do? What problem does it solve?" rows={2}
              className="w-full rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />

            <div>
              <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Category</span>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_PRESETS.map((c) => (
                  <button key={c} onClick={() => setCategory(c)}
                    className="px-2.5 py-1 text-[10px] font-mono rounded-xl transition-all skeuo-raised"
                    style={{ background: category === c ? "var(--accent-muted)" : "var(--bg-card)", color: category === c ? "var(--accent)" : "var(--text-muted)", borderColor: category === c ? "hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.2)" : "var(--border-default)" }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)} placeholder="Tech stack: Python, PyTorch, FastAPI..."
              className="w-full rounded-2xl px-4 py-2.5 text-xs font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />

            <textarea value={highlightsInput} onChange={(e) => setHighlightsInput(e.target.value)} placeholder={"Key deliverables (one per line):\nMulti-class classification\nSHAP explainability\nREST API deployment"} rows={3}
              className="w-full rounded-2xl px-4 py-2.5 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />

            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="GitHub URL"
                className="rounded-2xl px-3 py-2.5 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
              <input type="text" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="Live demo URL"
                className="rounded-2xl px-3 py-2.5 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "0.5px solid var(--border-default)", color: "var(--text-primary)" }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Status</span>
                <div className="flex gap-1">
                  {STATUS_OPTIONS.map((s) => (
                    <button key={s.value} onClick={() => setStatus(s.value as Project["status"])}
                      className="flex-1 py-2 text-[9px] font-mono rounded-xl transition-all"
                      style={{ background: status === s.value ? `${s.color}15` : "var(--bg-input)", color: status === s.value ? s.color : "var(--text-muted)", border: `0.5px solid ${status === s.value ? `${s.color}40` : "var(--border-default)"}` }}>
                      {s.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Progress: {progress}%</span>
                <input type="range" min="0" max="100" step="5" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full mt-1" />
              </div>
            </div>

            <button onClick={handleSave} disabled={!title.trim() || saving}
              className="w-full py-3 text-xs font-medium rounded-2xl transition-all disabled:opacity-30 skeuo-raised"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add project"}
            </button>
          </div>
        </div>
      )}

      {/* Project cards */}
      {loading ? (
        <div className="text-center py-16"><span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading...</span></div>
      ) : sorted.length === 0 ? (
        <div className="spatial p-10 text-center animate-fade-in">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>{projects.length === 0 ? "No projects yet" : "No projects match filter"}</p>
          <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>Track your ML portfolio journey</p>
          {projects.length === 0 && (
            <button onClick={() => setShowForm(true)} className="px-5 py-2.5 text-xs font-medium rounded-2xl skeuo-raised" style={{ background: "var(--accent)", color: "#0a0a0b" }}>Add first project</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((p, i) => {
            const sc = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className="liquid-glass rounded-2xl overflow-hidden hover-lift animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms` }}>
                <div className="p-4 sm:p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm">{sc.emoji}</span>
                        <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl skeuo-raised"
                          style={{ background: `${sc.color}10`, color: sc.color }}>{sc.label}</span>
                        {p.category && <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{p.category}</span>}
                      </div>
                      {p.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{p.description}</p>}
                    </div>

                    {/* Progress ring */}
                    <div className="flex-shrink-0 relative">
                      <svg width="52" height="52" viewBox="0 0 52 52">
                        <circle cx="26" cy="26" r="22" fill="none" strokeWidth="3" style={{ stroke: "var(--border-default)" }} />
                        <circle cx="26" cy="26" r="22" fill="none" strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 * (1 - p.progress / 100)}
                          style={{ stroke: sc.color, transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.5s ease" }} />
                        <text x="26" y="26" textAnchor="middle" dominantBaseline="central"
                          style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace", fontWeight: 500, fill: sc.color }}>{p.progress}%</text>
                      </svg>
                    </div>
                  </div>

                  {/* Progress slider */}
                  <div className="mt-3 flex items-center gap-3">
                    <input type="range" min="0" max="100" step="5" value={p.progress}
                      onChange={(e) => handleProgressUpdate(p.id, Number(e.target.value))} className="flex-1" />
                  </div>

                  {/* Tech tags */}
                  {p.tech && p.tech.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {p.tech.map((t) => (
                        <span key={t} className="text-[9px] font-mono px-2 py-0.5 rounded-lg skeuo-raised"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 space-y-4 animate-fade-in" style={{ borderTop: "0.5px solid var(--border-default)" }}>
                      {/* Status switcher */}
                      <div>
                        <span className="text-[10px] font-mono block mb-2" style={{ color: "var(--text-muted)" }}>Status</span>
                        <div className="flex gap-1.5">
                          {STATUS_OPTIONS.map((s) => (
                            <button key={s.value} onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, s.value as Project["status"]); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded-xl transition-all skeuo-raised"
                              style={{ background: p.status === s.value ? `${s.color}15` : "var(--bg-card)", color: p.status === s.value ? s.color : "var(--text-muted)", borderColor: p.status === s.value ? `${s.color}30` : "var(--border-default)" }}>
                              <span>{s.emoji}</span> {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Highlights */}
                      {p.highlights && p.highlights.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Deliverables</span>
                          <div className="space-y-1.5">
                            {p.highlights.map((h, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.color }} />
                                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Links */}
                      {(p.github_url || p.live_url) && (
                        <div className="flex gap-2">
                          {p.github_url && (
                            <a href={p.github_url} target="_blank" rel="noopener"
                              className="text-[10px] font-mono px-3 py-2 rounded-xl skeuo-raised hover-lift inline-flex items-center gap-1"
                              style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
                              onClick={(e) => e.stopPropagation()}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                              GitHub
                            </a>
                          )}
                          {p.live_url && (
                            <a href={p.live_url} target="_blank" rel="noopener"
                              className="text-[10px] font-mono px-3 py-2 rounded-xl skeuo-raised hover-lift inline-flex items-center gap-1"
                              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                              onClick={(e) => e.stopPropagation()}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              Live Demo
                            </a>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                          className="px-3 py-1.5 text-[10px] font-mono rounded-xl skeuo-raised" style={{ color: "var(--text-secondary)" }}>Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                          className="px-3 py-1.5 text-[10px] font-mono rounded-xl" style={{ color: "#f87171" }}>Delete</button>
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
