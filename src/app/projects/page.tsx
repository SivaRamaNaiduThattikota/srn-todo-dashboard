"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchProjects, addProject, updateProject, deleteProject, type Project } from "@/lib/supabase";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning", color: "#94a3b8" },
  { value: "in-progress", label: "In Progress", color: "#60a5fa" },
  { value: "completed", label: "Completed", color: "#6ee7b7" },
  { value: "deployed", label: "Deployed", color: "#a78bfa" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [techInput, setTechInput] = useState("");
  const [status, setStatus] = useState<Project["status"]>("planning");
  const [progress, setProgress] = useState(0);
  const [github, setGithub] = useState("");
  const [liveUrl, setLiveUrl] = useState("");

  useEffect(() => { fetchProjects().then((d) => { setProjects(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const reload = async () => setProjects(await fetchProjects());

  const resetForm = () => { setTitle(""); setDescription(""); setCategory(""); setTechInput(""); setStatus("planning"); setProgress(0); setGithub(""); setLiveUrl(""); setShowAdd(false); setEditingId(null); };

  const handleSave = async () => {
    if (!title.trim()) return;
    const tech = techInput.split(",").map((t) => t.trim()).filter(Boolean);
    const data: Partial<Project> = { title: title.trim(), description: description.trim(), category: category.trim(), tech, status, progress, github_url: github.trim(), live_url: liveUrl.trim() };
    if (editingId) { await updateProject(editingId, data); } else { await addProject(data); }
    await reload(); resetForm();
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id); setTitle(p.title); setDescription(p.description); setCategory(p.category);
    setTechInput(p.tech?.join(", ") || ""); setStatus(p.status); setProgress(p.progress);
    setGithub(p.github_url || ""); setLiveUrl(p.live_url || ""); setShowAdd(true);
  };

  const handleDelete = async (id: string) => { await deleteProject(id); await reload(); };

  const handleProgressUpdate = async (id: string, newProgress: number, newStatus?: Project["status"]) => {
    const updates: Partial<Project> = { progress: newProgress };
    if (newStatus) updates.status = newStatus;
    else if (newProgress === 100) updates.status = "completed";
    else if (newProgress > 0 && newProgress < 100) updates.status = "in-progress";
    await updateProject(id, updates);
    await reload();
  };

  const totalProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const completed = projects.filter((p) => p.status === "completed" || p.status === "deployed").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>ML Portfolio</h1>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>{completed}/{projects.length} done · {totalProgress}% overall</p>
          </div>
          <button onClick={() => { resetForm(); setShowAdd(true); }} className="px-4 py-2 text-xs font-medium rounded-xl"
            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>+ Add project</button>
        </div>
      </header>

      {/* Overall progress bar */}
      <div className="glass rounded-2xl p-4 mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Portfolio completion</span>
          <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>{totalProgress}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${totalProgress}%`, background: "var(--accent)" }} />
        </div>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="glass rounded-2xl p-5 mb-5 animate-slide-up">
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit project" : "New project"}</h2>
          <div className="space-y-3">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title..."
              className="w-full rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." rows={2}
              className="w-full rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g. NLP, CV)"
                className="rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
              <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)} placeholder="Tech (comma separated)"
                className="rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="GitHub URL (optional)"
                className="rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
              <input type="text" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="Live demo URL (optional)"
                className="rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}
                  className="w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Progress: {progress}%</label>
                <input type="range" min="0" max="100" step="5" value={progress} onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={resetForm} className="px-4 py-2 text-xs rounded-xl" style={{ color: "var(--text-muted)" }}>Cancel</button>
              <button onClick={handleSave} disabled={!title.trim()} className="px-5 py-2 text-xs font-medium rounded-xl disabled:opacity-30"
                style={{ background: "var(--accent)", color: "#0a0a0b" }}>{editingId ? "Save" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Project cards */}
      {loading ? (
        <div className="text-center py-16"><span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading...</span></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No projects yet</p>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Click "Add project" to start tracking your ML portfolio</p>
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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg" style={{ background: `${sc.color}15`, color: sc.color }}>{sc.label}</span>
                      </div>
                      <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{p.category}</p>
                      {p.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{p.description}</p>}
                    </div>

                    {/* Progress circle */}
                    <div className="flex-shrink-0">
                      <svg width="48" height="48" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3" style={{ stroke: "var(--border-default)" }} />
                        <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - p.progress / 100)}
                          style={{ stroke: sc.color, transform: "rotate(-90deg)", transformOrigin: "center" }} />
                        <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
                          style={{ fontSize: "11px", fontFamily: "monospace", fill: "var(--text-secondary)" }}>{p.progress}%</text>
                      </svg>
                    </div>
                  </div>

                  {/* Quick progress slider */}
                  <div className="mt-3 flex items-center gap-3">
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

                  {/* Expanded: details + actions */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--border-default)" }}>
                      {p.highlights && p.highlights.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Deliverables</span>
                          {p.highlights.map((h, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-1">
                              <span className="w-1 h-1 rounded-full" style={{ background: sc.color }} />
                              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Links */}
                      <div className="flex gap-2 flex-wrap">
                        {p.github_url && <a href={p.github_url} target="_blank" rel="noopener" className="text-[10px] font-mono px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-input)", color: "var(--accent)" }} onClick={(e) => e.stopPropagation()}>GitHub →</a>}
                        {p.live_url && <a href={p.live_url} target="_blank" rel="noopener" className="text-[10px] font-mono px-3 py-1.5 rounded-lg" style={{ background: "var(--accent-muted)", color: "var(--accent)" }} onClick={(e) => e.stopPropagation()}>Live Demo →</a>}
                      </div>

                      {/* Edit / Delete */}
                      <div className="flex gap-2">
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
