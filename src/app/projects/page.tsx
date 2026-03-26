"use client";

import { useState, useEffect } from "react";
import { fetchProjects, addProject, updateProject, deleteProject, type Project } from "@/lib/supabase";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning", color: "#94a3b8" },
  { value: "in-progress", label: "In Progress", color: "#60a5fa" },
  { value: "completed", label: "Completed", color: "#6ee7b7" },
  { value: "deployed", label: "Deployed", color: "#a78bfa" },
];

const CATEGORY_PRESETS = ["Healthcare ML", "NLP", "Computer Vision", "RecSys", "Time Series", "MLOps", "Data Engineering", "GenAI", "Other"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
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
      const data: Partial<Project> = {
        title: title.trim(), description: description.trim(), category: category.trim(),
        tech, status, progress, github_url: github.trim(), live_url: liveUrl.trim(), highlights,
      };
      if (editingId) { await updateProject(editingId, data); }
      else { await addProject(data); }
      await reload();
      resetForm();
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: editingId ? "Project updated" : "Project added", type: "success" } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: err?.message || "Failed to save", type: "error" } }));
      setSaving(false);
    }
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id); setTitle(p.title); setDescription(p.description || ""); setCategory(p.category || "");
    setTechInput(p.tech?.join(", ") || ""); setStatus(p.status); setProgress(p.progress);
    setGithub(p.github_url || ""); setLiveUrl(p.live_url || "");
    setHighlightsInput(p.highlights?.join("\n") || "");
    setShowForm(true); setExpandedId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id); await reload();
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Project deleted", type: "info" } }));
  };

  const handleProgressUpdate = async (id: string, newProgress: number) => {
    const updates: Partial<Project> = { progress: newProgress };
    if (newProgress === 100) updates.status = "completed";
    else if (newProgress > 0) updates.status = "in-progress";
    else updates.status = "planning";
    await updateProject(id, updates);
    await reload();
  };

  const handleStatusChange = async (id: string, newStatus: Project["status"]) => {
    const updates: Partial<Project> = { status: newStatus };
    if (newStatus === "completed") updates.progress = 100;
    else if (newStatus === "deployed") updates.progress = 100;
    else if (newStatus === "planning") updates.progress = 0;
    await updateProject(id, updates);
    await reload();
  };

  const totalProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const completed = projects.filter((p) => p.status === "completed" || p.status === "deployed").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>ML Portfolio</h1>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>{completed}/{projects.length} done · {totalProgress}% overall</p>
          </div>
          {!showForm && (
            <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 text-xs font-medium rounded-xl"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}>+ Add project</button>
          )}
        </div>
      </header>

      {/* Overall progress */}
      {projects.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Portfolio</span>
            <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>{totalProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${totalProgress}%`, background: "var(--accent)" }} />
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="glass rounded-2xl p-5 mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit project" : "New project"}</h2>
            <button onClick={resetForm} className="text-xs px-2 py-1 rounded-lg" style={{ color: "var(--text-muted)" }}>Cancel</button>
          </div>
          <div className="space-y-3">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title *"
              className="w-full rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />

            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this project do?" rows={2}
              className="w-full rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />

            {/* Category presets */}
            <div>
              <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Category</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CATEGORY_PRESETS.map((c) => (
                  <button key={c} onClick={() => setCategory(c)} className="px-2.5 py-1 text-[10px] font-mono rounded-lg transition-all"
                    style={{ background: category === c ? "var(--accent-muted)" : "var(--bg-input)", color: category === c ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${category === c ? "hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.2)" : "var(--border-default)"}` }}>
                    {c}
                  </button>
                ))}
              </div>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Or type custom category..."
                className="w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
            </div>

            <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)} placeholder="Tech stack (comma separated): Python, PyTorch, FastAPI..."
              className="w-full rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />

            <textarea value={highlightsInput} onChange={(e) => setHighlightsInput(e.target.value)} placeholder="Key deliverables (one per line):\nMulti-class classification\nSHAP explainability\nREST API deployment" rows={3}
              className="w-full rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />

            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="GitHub URL"
                className="rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
              <input type="text" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="Live demo URL"
                className="rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}
                  className="w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Progress: {progress}%</span>
                <input type="range" min="0" max="100" step="5" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full" />
              </div>
            </div>

            <button onClick={handleSave} disabled={!title.trim() || saving}
              className="w-full py-2.5 text-xs font-medium rounded-xl transition-all disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add project"}
            </button>
          </div>
        </div>
      )}

      {/* Project cards */}
      {loading ? (
        <div className="text-center py-16"><span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading...</span></div>
      ) : projects.length === 0 && !showForm ? (
        <div className="text-center py-16 glass rounded-2xl">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>No projects yet</p>
          <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>Start tracking your ML portfolio</p>
          <button onClick={() => setShowForm(true)} className="px-5 py-2 text-xs font-medium rounded-xl" style={{ background: "var(--accent)", color: "#0a0a0b" }}>Add first project</button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p, i) => {
            const sc = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className="glass rounded-2xl overflow-hidden hover-lift animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg" style={{ background: `${sc.color}15`, color: sc.color }}>{sc.label}</span>
                        {p.category && <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{p.category}</span>}
                      </div>
                      {p.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{p.description}</p>}
                    </div>
                    <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0">
                      <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3" style={{ stroke: "var(--border-default)" }} />
                      <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - p.progress / 100)}
                        style={{ stroke: sc.color, transform: "rotate(-90deg)", transformOrigin: "center" }} />
                      <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
                        style={{ fontSize: "11px", fontFamily: "monospace", fill: "var(--text-secondary)" }}>{p.progress}%</text>
                    </svg>
                  </div>

                  {/* Progress slider */}
                  <div className="mt-2 flex items-center gap-3">
                    <input type="range" min="0" max="100" step="5" value={p.progress}
                      onChange={(e) => handleProgressUpdate(p.id, Number(e.target.value))}
                      className="flex-1" style={{ accentColor: sc.color }} />
                    <span className="text-[10px] font-mono w-8 text-right" style={{ color: "var(--text-muted)" }}>{p.progress}%</span>
                  </div>

                  {/* Tech tags */}
                  {p.tech && p.tech.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.tech.map((t) => (
                        <span key={t} className="text-[9px] font-mono px-2 py-0.5 rounded-lg" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border-default)" }}>
                      {/* Status quick-switch */}
                      <div>
                        <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Change status</span>
                        <div className="flex gap-1.5">
                          {STATUS_OPTIONS.map((s) => (
                            <button key={s.value} onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, s.value as Project["status"]); }}
                              className="px-2.5 py-1 text-[10px] font-mono rounded-lg transition-all"
                              style={{ background: p.status === s.value ? `${s.color}20` : "var(--bg-input)", color: p.status === s.value ? s.color : "var(--text-muted)", border: `1px solid ${p.status === s.value ? `${s.color}40` : "var(--border-default)"}` }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Highlights */}
                      {p.highlights && p.highlights.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Deliverables</span>
                          {p.highlights.map((h, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-1">
                              <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: sc.color }} />
                              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Links */}
                      {(p.github_url || p.live_url) && (
                        <div className="flex gap-2">
                          {p.github_url && <a href={p.github_url} target="_blank" rel="noopener" className="text-[10px] font-mono px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-input)", color: "var(--accent)" }} onClick={(e) => e.stopPropagation()}>GitHub →</a>}
                          {p.live_url && <a href={p.live_url} target="_blank" rel="noopener" className="text-[10px] font-mono px-3 py-1.5 rounded-lg" style={{ background: "var(--accent-muted)", color: "var(--accent)" }} onClick={(e) => e.stopPropagation()}>Demo →</a>}
                        </div>
                      )}

                      {/* Edit / Delete */}
                      <div className="flex gap-2 pt-1">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="px-3 py-1.5 text-[10px] font-mono rounded-lg" style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="px-3 py-1.5 text-[10px] font-mono rounded-lg" style={{ color: "#f87171" }}>Delete</button>
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
