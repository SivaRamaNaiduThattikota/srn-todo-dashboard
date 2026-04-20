"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── All searchable items ──────────────────────────────────────────────────────
const PAGES = [
  { label: "Today",         sub: "/today",         icon: "⏰", type: "page" },
  { label: "Tasks",         sub: "/",              icon: "☑️", type: "page" },
  { label: "Focus",         sub: "/focus",         icon: "🎯", type: "page" },
  { label: "Streaks",       sub: "/streaks",       icon: "🔥", type: "page" },
  { label: "Notes",         sub: "/notes",         icon: "📝", type: "page" },
  { label: "Projects",      sub: "/projects",      icon: "🏠", type: "page" },
  { label: "Learning",      sub: "/learning",      icon: "🎓", type: "page" },
  { label: "Interview Prep",sub: "/interview",     icon: "💻", type: "page" },
  { label: "Board",         sub: "/board",         icon: "📋", type: "page" },
  { label: "Notebooks",     sub: "/notebooks",     icon: "📚", type: "page" },
  { label: "Analytics",     sub: "/analytics",     icon: "📊", type: "page" },
  { label: "AI Assistant",  sub: "/assistant",     icon: "🤖", type: "page" },
  { label: "Review",        sub: "/review",        icon: "✍️", type: "page" },
  { label: "Decisions",     sub: "/decisions",     icon: "⚖️", type: "page" },
  { label: "Briefing",      sub: "/briefing",      icon: "💬", type: "page" },
  { label: "Notifications", sub: "/notifications", icon: "🔔", type: "page" },
  { label: "Calendar",      sub: "/calendar",      icon: "📅", type: "page" },
  { label: "Settings",      sub: "/settings",      icon: "⚙️", type: "page" },
];

const ACTIONS = [
  { label: "New task",        sub: "Quick add",       icon: "＋", type: "action", key: "new-task" },
  { label: "Start focus",     sub: "Go to Focus",     icon: "▶", type: "action", key: "focus" },
  { label: "New note",        sub: "Go to Notes",     icon: "📄", type: "action", key: "notes" },
];

type Item = { label: string; sub: string; icon: string; type: string; key?: string };

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter results
  const q = query.trim().toLowerCase();
  const filteredPages = q
    ? PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.sub.includes(q))
    : PAGES;
  const filteredActions = q
    ? ACTIONS.filter((a) => a.label.toLowerCase().includes(q))
    : ACTIONS;

  const allItems: Item[] = [...filteredActions, ...filteredPages];

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setClosing(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Clamp active index when results change
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(allItems.length - 1, 0)));
  }, [allItems.length]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(".cmd-active");
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 160);
  }, [onClose]);

  const runItem = useCallback((item: Item) => {
    if (item.type === "page") {
      router.push(item.sub);
    } else if (item.type === "action") {
      if (item.key === "new-task") window.dispatchEvent(new CustomEvent("srn:new-task"));
      else if (item.key === "focus") router.push("/focus");
      else if (item.key === "notes") router.push("/notes");
    }
    close();
  }, [router, close]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (allItems[activeIdx]) runItem(allItems[activeIdx]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, activeIdx, allItems, close, runItem]);

  if (!open) return null;

  const showActions = filteredActions.length > 0;
  const showPages   = filteredPages.length > 0;

  // Index offset so arrow keys work across both sections
  const actionOffset = 0;
  const pageOffset   = filteredActions.length;

  return (
    <>
      {/* Backdrop */}
      <div className="cmd-backdrop" onClick={close} />

      {/* Modal */}
      <div className={`cmd-modal ${closing ? "closing" : ""}`}>
        {/* Top specular */}
        <div style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: "0.5px",
          background: "linear-gradient(90deg, transparent, var(--specular-top), transparent)",
          pointerEvents: "none", zIndex: 2,
        }} />

        {/* Input row */}
        <div className="cmd-input-wrap">
          <span className="cmd-input-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages, actions, tasks…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="cmd-kbd">ESC</span>
        </div>

        {/* Results */}
        <div className="cmd-results" ref={listRef}>
          {allItems.length === 0 && (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {showActions && (
            <>
              <div className="cmd-section-label">Quick actions</div>
              {filteredActions.map((item, i) => (
                <div
                  key={item.key}
                  className={`cmd-item ${activeIdx === actionOffset + i ? "cmd-active" : ""}`}
                  onClick={() => runItem(item)}
                  onMouseEnter={() => setActiveIdx(actionOffset + i)}
                >
                  <div className="cmd-item-icon">{item.icon}</div>
                  <span className="cmd-item-label">{item.label}</span>
                  <span className="cmd-item-sub">{item.sub}</span>
                  <div className="cmd-item-enter">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>
                    </svg>
                  </div>
                </div>
              ))}
            </>
          )}

          {showPages && (
            <>
              <div className="cmd-section-label">Pages</div>
              {filteredPages.map((item, i) => (
                <div
                  key={item.sub}
                  className={`cmd-item ${activeIdx === pageOffset + i ? "cmd-active" : ""}`}
                  onClick={() => runItem(item)}
                  onMouseEnter={() => setActiveIdx(pageOffset + i)}
                >
                  <div className="cmd-item-icon">{item.icon}</div>
                  <span className="cmd-item-label">{item.label}</span>
                  <span className="cmd-item-sub">{item.sub}</span>
                  <div className="cmd-item-enter">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>
                    </svg>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="cmd-footer">
          <div className="cmd-footer-hint">
            <span className="cmd-kbd">↑↓</span> navigate
          </div>
          <div className="cmd-footer-hint">
            <span className="cmd-kbd">↵</span> open
          </div>
          <div className="cmd-footer-hint">
            <span className="cmd-kbd">ESC</span> close
          </div>
        </div>
      </div>
    </>
  );
}
