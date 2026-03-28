"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchDecisions, addDecision, updateDecision, deleteDecision, type Decision } from "@/lib/supabase";
import { format, isPast, differenceInDays } from "date-fns";

const CATEGORIES = [
  { value: "career",    label: "Career",    color: "#6ee7b7" },
  { value: "technical", label: "Technical", color: "#3b82f6" },
  { value: "learning",  label: "Learning",  color: "#8b5cf6" },
  { value: "financial", label: "Financial", color: "#f59e0b" },
  { value: "personal",  label: "Personal",  color: "#ec4899" },
  { value: "project",   label: "Project",   color: "#06b6d4" },
];

const STATUS_OPTIONS = [
  { value: "active",    label: "Active",    color: "#60a5fa" },
  { value: "reviewed",  label: "Reviewed",  color: "#6ee7b7" },
  { value: "validated", label: "Validated", color: "#a78bfa" },
  { value: "reversed",  label: "Reversed",  color: "#f87171" },
];

export default function DecisionsPage() {
  const [decisions, setDecisions]   = useState<Decision[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* Search + filter */
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState<string>("all");

  /* Form fields */
  const [decision, setDecision]             = useState("");
  const [reasoning, setReasoning]           = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [category, setCategory]             = useState<Decision["category"]>("career");
  const [reviewDays, setReviewDays]         = useState(30);

  /* Undo-delete */
  const [pendingDelete, setPendingDelete]   = useState<Decision | null>(null);
  const [undoTimer, setUndoTimer]           = useState<ReturnType<typeof setTimeout> | null>(null);
  const [undoSeconds, setUndoSeconds]       = useState(5);
  const [undoInterval, setUndoIntervalRef]  = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchDecisions().then((d) => { setDecisions(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const reload = async () => setDecisions(await fetchDecisions());

  const resetForm = () => {
    setDecision(""); setReasoning(""); setExpectedOutcome("");
    setCategory("career"); setReviewDays(30);
    setShowForm(false); setEditingId(null);
  };

  const handleSave = async () => {
    if (!decision.trim()) return;
    const reviewDate = new Date(); reviewDate.setDate(reviewDate.getDate() + reviewDays);
    const data: Partial<Decision> = {
      decision: decision.trim(), reasoning: reasoning.trim(),
      expected_outcome: expectedOutcome.trim(), category,
      review_date: format(reviewDate, "yyyy-MM-dd"),
    };
    if (editingId) await updateDecision(editingId, data); else await addDecision(data);
    await reload(); resetForm();
    window.dispatchEvent(new CustomEvent("srn:toast", {
      detail: { message: editingId ? "Decision updated" : "Decision logged", type: "success" },
    }));
  };

  const handleEdit = (d: Decision) => {
    setEditingId(d.id); setDecision(d.decision); setReasoning(d.reasoning);
    setExpectedOutcome(d.expected_outcome); setCategory(d.category);
    const days = differenceInDays(new Date(d.review_date), new Date(d.created_at));
    setReviewDays(days > 0 ? days : 30);
    setShowForm(true); setExpandedId(null);
  };

  const handleReview = async (id: string, status: Decision["status"], notes: string) => {
    await updateDecision(id, { status, review_notes: notes });
    await reload();
  };

  /* Soft-delete with 5s undo */
  const handleDelete = (d: Decision) => {
    if (undoTimer) clearTimeout(undoTimer);
    if (undoInterval) clearInterval(undoInterval);
    if (pendingDelete) deleteDecision(pendingDelete.id).then(reload);
    setPendingDelete(d);
    setUndoSeconds(5);
    const iv = setInterval(() => setUndoSeconds((s) => s - 1), 1000);
    setUndoIntervalRef(iv);
    const t = setTimeout(async () => {
      clearInterval(iv);
      await deleteDecision(d.id);
      setPendingDelete(null);
      await reload();
    }, 5000);
    setUndoTimer(t);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Decision deleted", type: "warning" } }));
  };

  const handleUndo = () => {
    if (undoTimer) clearTimeout(undoTimer);
    if (undoInterval) clearInterval(undoInterval);
    setPendingDelete(null);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Delete undone", type: "success" } }));
  };

  const dueForReview = useMemo(() => decisions.filter((d) => d.status === "active" && isPast(new Date(d.review_date))), [decisions]);

  /* Filtered list */
  const filtered = useMemo(() => {
    return decisions
      .filter((d) => d.id !== pendingDelete?.id)
      .filter((d) => filterCat === "all" || d.category === filterCat)
      .filter((d) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return d.decision.toLowerCase().includes(q) || d.reasoning.toLowerCase().includes(q);
      });
  }, [decisions, pendingDelete, filterCat, search]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto pb-32 md:pb-10">
      <header className="mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Decision logger</h1>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              {decisions.length} decisions · {dueForReview.length} due for review
            </p>
          </div>
          {!showForm && (
            <button onClick={() => { resetForm(); setShowForm(true); }} className="cc-btn cc-btn-accent px-4 py-2 text-xs font-medium rounded-2xl">
              <span style={{ position: "relative", zIndex: 3 }}>+ Log decision</span>
            </button>
          )}
        </div>
      </header>

      {/* Undo banner */}
      {pendingDelete && (
        <div className="liquid-glass rounded-2xl px-4 py-3 mb-4 flex items-center justify-between animate-fade-in-up"
          style={{ borderColor: "rgba(255,107,107,0.3)" }}>
          <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
            Deleting "<span style={{ color: "#ff6b6b" }}>{pendingDelete.decision.slice(0, 40)}{pendingDelete.decision.length > 40 ? "…" : ""}</span>" in{" "}
            <span style={{ color: "#ff6b6b" }}>{undoSeconds}s</span>…
          </span>
          <button onClick={handleUndo} className="px-3 py-1 text-[10px] font-mono rounded-xl"
            style={{ background: "rgba(94,207,149,0.12)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.3)" }}>
            Undo
          </button>
        </div>
      )}

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 animate-fade-in-up" style={{ animationDelay: "30ms" }}>
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions…"
            className="w-full glass rounded-xl pl-9 pr-4 py-2 text-xs font-mono focus:outline-none"
            style={{ color: "var(--text-primary)" }} />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          <button onClick={() => setFilterCat("all")}
            className="px-3 py-2 text-[10px] font-mono rounded-xl whitespace-nowrap transition-all"
            style={{ background: filterCat === "all" ? "var(--accent-muted)" : "var(--glass-fill)", color: filterCat === "all" ? "var(--accent)" : "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilterCat(filterCat === c.value ? "all" : c.value)}
              className="px-3 py-2 text-[10px] font-mono rounded-xl whitespace-nowrap transition-all"
              style={{ background: filterCat === c.value ? `${c.color}15` : "var(--glass-fill)", color: filterCat === c.value ? c.color : "var(--text-muted)", border: `0.5px solid ${filterCat === c.value ? `${c.color}40` : "var(--glass-border)"}` }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Due-for-review alert */}
      {dueForReview.length > 0 && (
        <div className="liquid-glass rounded-2xl p-4 mb-4 animate-fade-in-up" style={{ borderColor: "rgba(251,191,36,0.3)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">⏰</span>
            <span className="text-xs font-medium" style={{ color: "#fbbf24" }}>
              {dueForReview.length} decision{dueForReview.length > 1 ? "s" : ""} due for review
            </span>
          </div>
          {dueForReview.map((d) => (
            <div key={d.id} className="text-xs font-mono ml-6" style={{ color: "var(--text-secondary)" }}>
              {d.decision}{" "}
              <span style={{ color: "var(--text-muted)" }}>— due {format(new Date(d.review_date), "MMM d")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="spatial p-5 mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit" : "Log a decision"}</h2>
            <button onClick={resetForm} className="text-xs px-2 py-1 rounded-xl" style={{ color: "var(--text-muted)" }}>Cancel</button>
          </div>
          <div className="space-y-3">
            <input type="text" value={decision} onChange={(e) => setDecision(e.target.value)}
              placeholder="What did you decide? *" autoFocus
              className="w-full rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
            <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)}
              placeholder="Why? What's the reasoning behind this decision?" rows={2}
              className="w-full rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
            <textarea value={expectedOutcome} onChange={(e) => setExpectedOutcome(e.target.value)}
              placeholder="What outcome do you expect from this decision?" rows={2}
              className="w-full rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
              style={{ background: "var(--bg-input)", border: "0.5px solid var(--glass-border)", color: "var(--text-primary)" }} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Category</span>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((c) => (
                    <button key={c.value} onClick={() => setCategory(c.value as Decision["category"])}
                      className="px-2 py-1 text-[10px] font-mono rounded-xl transition-all"
                      style={{ background: category === c.value ? `${c.color}15` : "var(--bg-input)", color: category === c.value ? c.color : "var(--text-muted)", border: `0.5px solid ${category === c.value ? `${c.color}40` : "var(--glass-border)"}` }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono block mb-1.5" style={{ color: "var(--text-muted)" }}>Review in: {reviewDays} days</span>
                <div className="flex gap-1">
                  {[7, 14, 30, 60, 90].map((d) => (
                    <button key={d} onClick={() => setReviewDays(d)}
                      className="flex-1 py-1.5 text-[10px] font-mono rounded-xl transition-all"
                      style={{ background: reviewDays === d ? "var(--accent-muted)" : "var(--bg-input)", color: reviewDays === d ? "var(--accent)" : "var(--text-muted)" }}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleSave} disabled={!decision.trim()}
              className="w-full py-3 text-xs font-medium rounded-2xl transition-all disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}>
              {editingId ? "Save" : "Log decision"}
            </button>
          </div>
        </div>
      )}

      {/* Decision cards */}
      {loading ? (
        <div className="text-center py-16"><span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading…</span></div>
      ) : filtered.length === 0 && !showForm ? (
        <div className="spatial p-10 text-center">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            {search || filterCat !== "all" ? "No matching decisions" : "No decisions logged"}
          </p>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {search || filterCat !== "all" ? "Try a different search or filter" : "Track important decisions and revisit them later"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d, i) => {
            const cat        = CATEGORIES.find((c) => c.value === d.category);
            const st         = STATUS_OPTIONS.find((s) => s.value === d.status);
            const isExpanded = expandedId === d.id;
            const isDue      = d.status === "active" && isPast(new Date(d.review_date));
            const daysUntil  = differenceInDays(new Date(d.review_date), new Date());

            return (
              <div key={d.id} className="liquid-glass rounded-2xl overflow-hidden hover-lift animate-fade-in-up"
                style={{ animationDelay: `${i * 30}ms`, borderColor: isDue ? "rgba(251,191,36,0.3)" : undefined }}>
                <div className="p-4 sm:p-5">
                  <div className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : d.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{d.decision}</h3>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl"
                            style={{ background: `${cat?.color || "#999"}15`, color: cat?.color }}>{cat?.label}</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl"
                            style={{ background: `${st?.color || "#999"}15`, color: st?.color }}>{st?.label}</span>
                          {isDue && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-xl"
                              style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>Review due</span>
                          )}
                        </div>
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{d.reasoning}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{format(new Date(d.created_at), "MMM d")}</div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: isDue ? "#fbbf24" : "var(--text-muted)" }}>
                          {isDue ? `${Math.abs(daysUntil)}d overdue` : `Review in ${daysUntil}d`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 space-y-3 animate-fade-in" style={{ borderTop: "0.5px solid var(--glass-border)" }}>
                      {d.expected_outcome && (
                        <div>
                          <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Expected outcome</span>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{d.expected_outcome}</p>
                        </div>
                      )}
                      {d.review_notes && (
                        <div>
                          <span className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>Review notes</span>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{d.review_notes}</p>
                        </div>
                      )}

                      {d.status === "active" && (
                        <div>
                          <span className="text-[10px] font-mono block mb-2" style={{ color: "var(--text-muted)" }}>Mark as:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { status: "validated" as const, label: "Validated", color: "#6ee7b7" },
                              { status: "reversed"  as const, label: "Reversed",  color: "#f87171" },
                              { status: "reviewed"  as const, label: "Reviewed",  color: "#60a5fa" },
                            ].map((opt) => (
                              <button key={opt.status}
                                onClick={(e) => { e.stopPropagation(); handleReview(d.id, opt.status, ""); }}
                                className="px-3 py-1.5 text-[10px] font-mono rounded-xl transition-all"
                                style={{ background: `${opt.color}10`, color: opt.color, border: `0.5px solid ${opt.color}30` }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(d); }}
                          className="px-3 py-1.5 text-[10px] font-mono rounded-xl"
                          style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                          Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(d); }}
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
