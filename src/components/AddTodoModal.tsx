"use client";

import { useState, useRef, useEffect } from "react";
import type { TodoPriority, TodoCategory, ResourceLink, ResourceLinkType } from "@/lib/supabase";

interface AddTaskPayload {
  title: string; description: string; priority: TodoPriority;
  assigned_agent: string; due_date: string | null; start_date: string | null;
  category: TodoCategory; tags: string[]; resource_links: ResourceLink[];
  estimated_mins: number | null;
}
interface Props {
  onAdd: (data: AddTaskPayload) => Promise<void>;
  onClose: () => void;
  prefillDueDate?: string;
}

const TABS = ["basics", "details", "resources"] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<Tab, string> = { basics: "Basics", details: "Details", resources: "Resources" };
const TAB_ICONS: Record<Tab, JSX.Element> = {
  basics:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  details:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  resources: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
};

const PRIORITY_CONFIG: Record<TodoPriority, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "#ff6b6b", bg: "rgba(255,107,107,0.14)", border: "rgba(255,107,107,0.35)", label: "Critical" },
  high:     { color: "#ff9500", bg: "rgba(255,149,0,0.14)",   border: "rgba(255,149,0,0.35)",   label: "High"     },
  medium:   { color: "#f5a623", bg: "rgba(245,166,35,0.14)",  border: "rgba(245,166,35,0.35)",  label: "Medium"   },
  low:      { color: "#8e8e93", bg: "rgba(142,142,147,0.14)", border: "rgba(142,142,147,0.35)", label: "Low"      },
};

const CATEGORIES: { value: TodoCategory; label: string; icon: string; color: string }[] = [
  { value: "learning",       label: "Learning",  icon: "📚", color: "#8b5cf6" },
  { value: "project",        label: "Project",   icon: "🚀", color: "#3b82f6" },
  { value: "interview-prep", label: "Interview", icon: "🎯", color: "#f59e0b" },
  { value: "work",           label: "Work",      icon: "💼", color: "#64748b" },
  { value: "personal",       label: "Personal",  icon: "🌱", color: "#10b981" },
  { value: "general",        label: "General",   icon: "📋", color: "#6b7280" },
];

const LINK_TYPES: { value: ResourceLinkType; label: string; icon: string; color: string }[] = [
  { value: "article", label: "Article", icon: "📄", color: "#60a5fa" },
  { value: "video",   label: "Video",   icon: "▶️", color: "#f87171" },
  { value: "github",  label: "GitHub",  icon: "🔗", color: "#a78bfa" },
  { value: "doc",     label: "Docs",    icon: "📘", color: "#34d399" },
  { value: "tool",    label: "Tool",    icon: "🛠", color: "#fb923c" },
  { value: "course",  label: "Course",  icon: "🎓", color: "#f59e0b" },
  { value: "other",   label: "Other",   icon: "🌐", color: "#94a3b8" },
];

const PRESET_TAGS = ["python","sql","ml","deep-learning","nlp","interview","system-design","dsa","cloud","aws","power-bi","urgent","research","reading","practice"];
const EST_OPTIONS = [{ mins: 15, label: "15m" },{ mins: 30, label: "30m" },{ mins: 60, label: "1h" },{ mins: 120, label: "2h" },{ mins: 240, label: "4h" },{ mins: 480, label: "8h" }];

function detectLinkType(url: string): ResourceLinkType {
  try {
    const u = new URL(url);
    if (u.hostname.includes("github.com")) return "github";
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) return "video";
    if (u.hostname.includes("coursera.org") || u.hostname.includes("udemy.com")) return "course";
    if (u.hostname.includes("docs.")) return "doc";
  } catch {}
  return "article";
}
function extractTitle(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url.slice(0, 40); }
}

export function AddTodoModal({ onAdd, onClose, prefillDueDate }: Props) {
  const [tab, setTab]             = useState<Tab>("basics");
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [priority, setPriority]   = useState<TodoPriority>("medium");
  const [agent, setAgent]         = useState("");
  const [dueDate, setDueDate]     = useState(prefillDueDate ?? "");
  const [startDate, setStartDate] = useState("");
  const [category, setCategory]   = useState<TodoCategory>("general");
  const [tags, setTags]           = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [estimatedMins, setEst]   = useState<number | null>(null);
  const [links, setLinks]         = useState<ResourceLink[]>([]);
  const [linkUrl, setLinkUrl]     = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkType, setLinkType]   = useState<ResourceLinkType>("article");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (tab === "basics") titleRef.current?.focus(); }, [tab]);
  useEffect(() => { if (prefillDueDate) setDueDate(prefillDueDate); }, [prefillDueDate]);

  const canSubmit = title.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError(null);
    try {
      await onAdd({ title: title.trim(), description: description.trim(), priority, assigned_agent: agent.trim() || "unassigned", due_date: dueDate || null, start_date: startDate || null, category, tags, resource_links: links, estimated_mins: estimatedMins });
    } catch (err: any) { setError(err?.message || "Failed to add task"); setLoading(false); }
  };

  const toggleTag = (t: string) => setTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
  const addCustomTag = () => { const t = customTag.trim().toLowerCase().replace(/\s+/g, "-"); if (t && !tags.includes(t)) setTags((p) => [...p, t]); setCustomTag(""); };
  const addLink = () => {
    if (!linkUrl.trim()) return;
    const url = linkUrl.trim().startsWith("http") ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    setLinks((p) => [...p, { url, title: linkTitle.trim() || extractTitle(url), type: detectLinkType(url) }]);
    setLinkUrl(""); setLinkTitle(""); setLinkType("article");
  };

  const tabStatus: Record<Tab, boolean> = { basics: title.trim().length > 0, details: tags.length > 0 || !!estimatedMins, resources: links.length > 0 };

  return (
    <>
      {/* ── Scrim — covers entire screen including nav bar ── */}
      <div
        className="fixed inset-0 z-[60] animate-fade-in"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/*
        ── Modal sheet ──
        On mobile: fixed, bottom = height of nav bar (64px) + safe-area,
                   so it sits perfectly ABOVE the bottom nav.
        On desktop (sm+): centered in viewport.
      */}
      <div
        className="fixed z-[61] left-0 right-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:px-4"
        /* On mobile the outer div IS the sheet anchored above nav.
           On desktop it's a flex container centering the inner card. */
      >
        {/* Inner card */}
        <div
          className="relative w-full sm:max-w-[480px] animate-slide-up flex flex-col"
          style={{
            background: "var(--glass-fill-hover)",
            backdropFilter: "blur(48px) saturate(2)",
            border: "0.5px solid var(--glass-border-hover)",
            /* Mobile: sheet from bottom, stops above the nav bar */
            borderRadius: "24px 24px 0 0",
            /* Key fix: reserve bottom nav height + safe area on mobile */
            marginBottom: 0,
            /* Max height = full viewport minus nav bar (64px) minus safe area */
            maxHeight: "calc(var(--dvh, 100dvh) - 64px - env(safe-area-inset-bottom, 0px))",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.30), inset 0 0.5px 0 rgba(255,255,255,0.20)",
          }}
        >
          {/* Override radius to fully rounded on desktop */}
          <style>{`@media(min-width:640px){.modal-card{border-radius:28px!important;}}`}</style>

          {/* Drag handle — mobile only */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div style={{ width: "36px", height: "4px", borderRadius: "100px", background: "var(--cc-text-muted)", opacity: 0.35 }} />
          </div>

          {/* Specular highlight */}
          <div style={{ position: "absolute", top: 0, left: "5%", right: "5%", height: "0.5px", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)", pointerEvents: "none", zIndex: 1 }} />

          {/* Header */}
          <div className="px-5 pt-3 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[17px] font-semibold tracking-tight" style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}>
                  {prefillDueDate ? `New task — ${prefillDueDate}` : "New task"}
                </h2>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {canSubmit ? `"${title.slice(0,28)}${title.length>28?"…":""}"` : "Fill in the details below"}
                </p>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)", color: "var(--text-muted)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Tab bar */}
            <div className="flex gap-1 p-1 rounded-[14px]" style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border)" }}>
              {TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] transition-all duration-200"
                  style={{ background: tab===t?"var(--glass-fill-hover)":"transparent", border: tab===t?"0.5px solid var(--glass-border)":"0.5px solid transparent", color: tab===t?"var(--text-primary)":"var(--text-muted)", fontSize: "11px", fontWeight: tab===t?600:400, fontFamily: "-apple-system, sans-serif" }}>
                  <span style={{ color: tab===t?"var(--accent)":"var(--text-muted)", opacity: tab===t?1:0.6 }}>{TAB_ICONS[t]}</span>
                  {TAB_LABELS[t]}
                  {tabStatus[t] && <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: "var(--accent)" }} />}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="mx-5 mb-2 px-3 py-2 rounded-[12px] text-xs font-mono flex-shrink-0" style={{ background: "rgba(255,107,107,0.12)", color: "#ff6b6b", border: "0.5px solid rgba(255,107,107,0.25)" }}>{error}</div>}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", minHeight: 0 }}>

            {/* ── BASICS ── */}
            {tab === "basics" && (
              <div className="space-y-3 py-2">
                <FieldLabel label="Title" required>
                  <input ref={titleRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    onKeyDown={(e) => { if (e.key==="Enter"&&!e.shiftKey) setTab("details"); }}
                    className="w-full focus:outline-none" style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Description" hint="optional">
                  <textarea value={description} onChange={(e) => setDesc(e.target.value)}
                    placeholder="Context, notes, acceptance criteria..." rows={2}
                    className="w-full focus:outline-none resize-none" style={inputStyle} />
                </FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <FieldLabel label="Start date">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="w-full focus:outline-none" style={{ ...inputStyle, colorScheme: "dark", fontSize: "12px" }} />
                  </FieldLabel>
                  <FieldLabel label="Due date">
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      className="w-full focus:outline-none" style={{ ...inputStyle, colorScheme: "dark", fontSize: "12px" }} />
                  </FieldLabel>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FieldLabel label="Category">
                    <select value={category} onChange={(e) => setCategory(e.target.value as TodoCategory)}
                      className="w-full focus:outline-none" style={{ ...inputStyle, fontSize: "12px" }}>
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                    </select>
                  </FieldLabel>
                  <FieldLabel label="Assigned to">
                    <input type="text" value={agent} onChange={(e) => setAgent(e.target.value)}
                      placeholder="yourself..." className="w-full focus:outline-none" style={{ ...inputStyle, fontSize: "12px" }} />
                  </FieldLabel>
                </div>
                <FieldLabel label="Priority">
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {(Object.entries(PRIORITY_CONFIG) as [TodoPriority, typeof PRIORITY_CONFIG[TodoPriority]][]).map(([p, cfg]) => (
                      <button key={p} type="button" onClick={() => setPriority(p)}
                        className="py-2 rounded-[10px] text-[11px] font-semibold transition-all"
                        style={{ background: priority===p?cfg.bg:"var(--cc-glass-base)", border: `0.5px solid ${priority===p?cfg.border:"var(--cc-tile-border)"}`, color: priority===p?cfg.color:"var(--cc-text-muted)" }}>
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </FieldLabel>
              </div>
            )}

            {/* ── DETAILS ── */}
            {tab === "details" && (
              <div className="space-y-3 py-2">
                <FieldLabel label="Estimated time" hint="optional">
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {EST_OPTIONS.map((o) => (
                      <button key={o.mins} type="button" onClick={() => setEst(estimatedMins===o.mins?null:o.mins)}
                        className="cc-chip px-3 py-1.5 text-[11px] font-mono font-semibold"
                        style={{ background: estimatedMins===o.mins?"var(--accent-dim)":"var(--cc-glass-base)", borderColor: estimatedMins===o.mins?"var(--accent)":"var(--cc-tile-border)", color: estimatedMins===o.mins?"var(--accent)":"var(--cc-text-muted)" }}>
                        <span style={{ position: "relative", zIndex: 2 }}>{o.label}</span>
                      </button>
                    ))}
                  </div>
                </FieldLabel>
                <FieldLabel label="Tags" hint="click to add">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PRESET_TAGS.map((t) => {
                      const active = tags.includes(t);
                      return (
                        <button key={t} type="button" onClick={() => toggleTag(t)}
                          className="cc-chip px-2 py-1 text-[10px] font-mono"
                          style={{ background: active?"var(--accent-muted)":"var(--cc-glass-base)", borderColor: active?"var(--accent)":"var(--cc-tile-border)", color: active?"var(--accent)":"var(--cc-text-muted)" }}>
                          <span style={{ position: "relative", zIndex: 2 }}>{active?"✓ ":""}{t}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input type="text" value={customTag} onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key==="Enter"){e.preventDefault();addCustomTag();} }}
                      placeholder="Custom tag..." className="flex-1 focus:outline-none"
                      style={{ ...inputStyle, fontSize: "11px", padding: "8px 12px" }} />
                    <button type="button" onClick={addCustomTag} disabled={!customTag.trim()}
                      className="cc-btn px-3 py-1.5 text-[11px] disabled:opacity-30" style={{ minWidth: "52px" }}>
                      <span style={{ position: "relative", zIndex: 3 }}>+ Add</span>
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[10px] font-mono"
                          style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
                          {t}<button type="button" onClick={() => toggleTag(t)} style={{ color: "var(--accent)", opacity: 0.6, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </FieldLabel>
                <FieldLabel label="Category">
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {CATEGORIES.map((c) => (
                      <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                        className="cc-tile flex flex-col items-center py-2.5 px-2 gap-1 rounded-[14px]"
                        style={{ background: category===c.value?`${c.color}22`:"var(--cc-glass-base)", borderColor: category===c.value?`${c.color}55`:"var(--cc-tile-border)" }}>
                        <span style={{ fontSize: "16px", position: "relative", zIndex: 3 }}>{c.icon}</span>
                        <span style={{ fontSize: "9px", fontFamily: "-apple-system, sans-serif", fontWeight: 500, color: category===c.value?c.color:"var(--cc-text-muted)", position: "relative", zIndex: 3 }}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </FieldLabel>
              </div>
            )}

            {/* ── RESOURCES ── */}
            {tab === "resources" && (
              <div className="space-y-3 py-2">
                <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>Attach reference links — articles, videos, GitHub repos, docs.</p>
                <div className="rounded-[16px] p-3 space-y-2" style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>
                  <div className="flex gap-1.5 flex-wrap">
                    {LINK_TYPES.map((lt) => (
                      <button key={lt.value} type="button" onClick={() => setLinkType(lt.value)}
                        className="cc-chip px-2 py-1 text-[9px] font-mono flex items-center gap-1"
                        style={{ background: linkType===lt.value?`${lt.color}20`:"var(--cc-glass-base)", borderColor: linkType===lt.value?`${lt.color}50`:"var(--cc-tile-border)", color: linkType===lt.value?lt.color:"var(--cc-text-muted)" }}>
                        <span style={{ position: "relative", zIndex: 2 }}>{lt.icon} {lt.label}</span>
                      </button>
                    ))}
                  </div>
                  <input type="url" value={linkUrl}
                    onChange={(e) => { setLinkUrl(e.target.value); if (!linkTitle) setLinkType(detectLinkType(e.target.value)); }}
                    onKeyDown={(e) => { if (e.key==="Enter"){e.preventDefault();addLink();} }}
                    placeholder="https://..." className="w-full focus:outline-none" style={{ ...inputStyle, fontSize: "12px" }} />
                  <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="Title (optional)" className="w-full focus:outline-none" style={{ ...inputStyle, fontSize: "12px" }} />
                  <button type="button" onClick={addLink} disabled={!linkUrl.trim()}
                    className="cc-btn cc-btn-accent w-full py-2.5 text-[12px] disabled:opacity-30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ position: "relative", zIndex: 3 }}><path d="M12 5v14M5 12h14"/></svg>
                    <span style={{ position: "relative", zIndex: 3 }}>Add link</span>
                  </button>
                </div>
                {links.length > 0 ? (
                  <div className="space-y-2">
                    {links.map((link, i) => {
                      const lt = LINK_TYPES.find((x) => x.value === link.type) || LINK_TYPES[0];
                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]" style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>
                          <span style={{ background: `${lt.color}18`, color: lt.color, fontSize: "9px", padding: "2px 6px", borderRadius: "6px", fontFamily: "monospace", fontWeight: 600, flexShrink: 0 }}>{lt.icon} {lt.label}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{link.title}</p>
                            <p className="text-[9px] font-mono truncate" style={{ color: "var(--text-muted)" }}>{link.url}</p>
                          </div>
                          <button type="button" onClick={() => setLinks((p) => p.filter((_,idx)=>idx!==i))}
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(255,107,107,0.10)", color: "#ff6b6b" }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 rounded-[14px]" style={{ border: "1.5px dashed var(--glass-border)", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "22px", marginBottom: "4px", opacity: 0.4 }}>🔗</div>
                    <p className="text-[11px] font-mono">No links yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── FOOTER — always pinned at bottom of the modal ── */}
          <div
            className="flex-shrink-0 px-5 pt-3 pb-4"
            style={{
              borderTop: "0.5px solid var(--glass-border)",
              background: "var(--glass-fill-deep)",
              borderRadius: "0 0 24px 24px",
            }}
          >
            {/* Pagination dots */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {TABS.map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  style={{ width: tab===t?"20px":"6px", height: "6px", borderRadius: "3px", background: tab===t?"var(--accent)":tabStatus[t]?"var(--accent-muted)":"var(--glass-border)", border: "none", padding: 0, cursor: "pointer", transition: "all 0.2s" }} />
              ))}
              <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{TABS.indexOf(tab)+1}/{TABS.length}</span>
            </div>

            {/* Action buttons — always fully visible */}
            <div className="flex gap-2">
              {/* Cancel */}
              <button type="button" onClick={onClose}
                className="cc-btn py-3 text-[13px] font-medium flex-shrink-0"
                style={{ minWidth: "76px" }}>
                <span style={{ position: "relative", zIndex: 3 }}>Cancel</span>
              </button>

              {/* Back (shown on tabs 2 & 3) */}
              {tab !== "basics" && (
                <button type="button" onClick={() => setTab(TABS[TABS.indexOf(tab)-1])}
                  className="cc-btn py-3 text-[13px] flex-shrink-0"
                  style={{ minWidth: "64px" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ position: "relative", zIndex: 3 }}><path d="M15 18l-6-6 6-6"/></svg>
                  <span style={{ position: "relative", zIndex: 3 }}>Back</span>
                </button>
              )}

              {/* Next / Add task */}
              {tab !== "resources" ? (
                <button type="button"
                  onClick={() => setTab(TABS[TABS.indexOf(tab)+1])}
                  className="cc-btn cc-btn-accent py-3 text-[13px] font-medium"
                  style={{ flex: 1, opacity: tab==="basics"&&!canSubmit?0.35:1 }}
                  disabled={tab==="basics"&&!canSubmit}>
                  <span style={{ position: "relative", zIndex: 3 }}>Next</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ position: "relative", zIndex: 3 }}><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ) : (
                <button type="button" onClick={handleSubmit}
                  disabled={!canSubmit||loading}
                  className="cc-btn cc-btn-accent py-3 text-[13px] font-medium"
                  style={{ flex: 1, opacity: !canSubmit||loading?0.35:1 }}>
                  {loading ? (
                    <span style={{ position: "relative", zIndex: 3 }}>Adding…</span>
                  ) : (
                    <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ position: "relative", zIndex: 3 }}><path d="M12 5v14M5 12h14"/></svg>
                    <span style={{ position: "relative", zIndex: 3 }}>Add task</span></>
                  )}
                </button>
              )}

              {/* Quick add on basics/details */}
              {tab !== "resources" && canSubmit && (
                <button type="button" onClick={handleSubmit} disabled={loading}
                  className="flex-shrink-0 text-[10px] font-mono px-2"
                  style={{ color: "var(--text-muted)" }}>
                  {loading ? "…" : "Quick"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FieldLabel({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>{label}</span>
        {required && <span style={{ color: "var(--accent)", fontSize: "10px" }}>*</span>}
        {hint && <span className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>({hint})</span>}
      </div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", borderRadius: "12px",
  padding: "10px 12px", fontSize: "13px", fontFamily: "-apple-system, 'SF Pro Display', sans-serif",
  color: "var(--text-primary)", width: "100%", display: "block", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.07)",
};
