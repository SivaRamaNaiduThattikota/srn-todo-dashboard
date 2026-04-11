"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { addTodo, updateTodo, type TodoPriority, type TodoCategory, type ResourceLink, type Todo } from "@/lib/supabase";
import { AddTodoModal } from "@/components/AddTodoModal";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  isSameDay, isSameMonth, addMonths, subMonths, isToday, isBefore,
} from "date-fns";
import CalendarWeekStrip from "@/components/CalendarWeekStrip";

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ff6b6b",
  high:     "#ff9500",
  medium:   "#f5a623",
  low:      "#8e8e93",
};

const EVENT_COLORS = ["#ec4899", "#3b82f6", "#7c6ffd", "#10b981", "#f59e0b", "#f87171", "#a78bfa"];

export default function CalendarPage() {
  const { todos, loading } = useRealtimeTodos();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [prefillDate, setPrefillDate]   = useState<string | null>(null);
  const [selectedDay, setSelectedDay]   = useState<string | null>(null);

  // Drag state
  const [draggingTodo, setDraggingTodo] = useState<Todo | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [touchDragging, setTouchDragging] = useState<Todo | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  const days = useMemo(() => {
    const start    = startOfMonth(currentMonth);
    const end      = endOfMonth(currentMonth);
    const allDays  = eachDayOfInterval({ start, end });
    const startDay = start.getDay();
    const padStart = startDay === 0 ? 6 : startDay - 1;
    const paddedStart: Date[] = [];
    for (let i = padStart; i > 0; i--) {
      const d = new Date(start);
      d.setDate(d.getDate() - i);
      paddedStart.push(d);
    }
    return [...paddedStart, ...allDays];
  }, [currentMonth]);

  const todosWithDueDate = useMemo(() => todos.filter((t) => t.due_date), [todos]);

  const handleDayClick = (day: Date) => {
    if (!isSameMonth(day, currentMonth)) return;
    if (draggingTodo || touchDragging) return;
    setSelectedDay(format(day, "yyyy-MM-dd"));
    setPrefillDate(format(day, "yyyy-MM-dd"));
  };

  const handleAdd = async (data: {
    title: string; description: string; priority: TodoPriority;
    assigned_agent: string; due_date: string | null; category: TodoCategory;
    tags: string[]; resource_links: ResourceLink[]; estimated_mins: number | null;
  }) => {
    await addTodo({ ...data, status: "pending" });
    setPrefillDate(null);
  };

  // ── Desktop drag handlers ──────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, todo: Todo) => {
    setDraggingTodo(todo);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", todo.id);
    // Make drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggingTodo(null);
    setDragOverDate(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateStr);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!isSameMonth(day, currentMonth)) return;
    if (!draggingTodo) return;
    const newDate = format(day, "yyyy-MM-dd");
    if (newDate === draggingTodo.due_date) return; // no change
    await updateTodo(draggingTodo.id, { due_date: newDate });
    setDraggingTodo(null);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Moved to ${format(day, "MMM d")}`, type: "success" } }));
  }, [draggingTodo, currentMonth]);

  // ── Touch drag handlers (mobile) ───────────────────────────────────
  // On mobile we show a long-press indicator; actual rescheduling done via
  // a date-picker bottom sheet instead of HTML5 drag (which doesn't work on iOS).
  const [touchPickTodo, setTouchPickTodo]   = useState<Todo | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent, todo: Todo) => {
    longPressRef.current = setTimeout(() => {
      setTouchPickTodo(todo);
      // vibrate if available
      if (navigator.vibrate) navigator.vibrate(40);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }, []);

  const handleTouchReschedule = async (day: Date) => {
    if (!touchPickTodo) return;
    if (!isSameMonth(day, currentMonth)) return;
    const newDate = format(day, "yyyy-MM-dd");
    await updateTodo(touchPickTodo.id, { due_date: newDate });
    setTouchPickTodo(null);
    window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Moved to ${format(day, "MMM d")}`, type: "success" } }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">
      <header className="mb-5 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}>
          Calendar
        </h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          {touchPickTodo
            ? `Tap a date to move "${touchPickTodo.title}"`
            : "Tap a day to add · drag tasks to reschedule · long-press on mobile"}
        </p>
      </header>

      {/* Touch-reschedule cancel bar */}
      {touchPickTodo && (
        <div className="liquid-glass rounded-2xl px-4 py-3 mb-4 flex items-center justify-between animate-fade-in-up"
          style={{ border: "0.5px solid var(--accent-dim)", background: "var(--accent-muted)" }}>
          <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>
            Tap any date to reschedule "{touchPickTodo.title}"
          </span>
          <button onClick={() => setTouchPickTodo(null)}
            className="text-xs font-mono px-3 py-1 rounded-xl"
            style={{ color: "var(--text-muted)", border: "0.5px solid var(--glass-border)" }}>
            Cancel
          </button>
        </div>
      )}

      {/* Week strip — v12.1 */}
      <CalendarWeekStrip
        selectedDate={currentMonth}
        onSelectDate={(d) => setCurrentMonth(d)}
      />

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="glass rounded-xl px-3 sm:px-4 py-2 transition-all" style={{ color: "var(--text-secondary)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-medium font-mono" style={{ color: "var(--text-primary)" }}>{format(currentMonth, "MMMM yyyy")}</h2>
          {!isCurrentMonth && (
            <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-[10px] font-mono rounded-[10px] transition-all" style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>Today</button>
          )}
        </div>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="glass rounded-xl px-3 sm:px-4 py-2 transition-all" style={{ color: "var(--text-secondary)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center py-2" style={{ color: "var(--text-muted)", fontSize: "clamp(8px, 2.2vw, 12px)", fontFamily: "monospace" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
        {days.map((day, i) => {
          const dayTodos       = todosWithDueDate.filter((t) => isSameDay(new Date(t.due_date!), day));
          const inCurrentMonth = isSameMonth(day, currentMonth);
          const isNow          = isToday(day);
          const dateStr        = format(day, "yyyy-MM-dd");
          const isDragOver     = dragOverDate === dateStr && inCurrentMonth;
          const isTouchTarget  = !!touchPickTodo && inCurrentMonth;

          return (
            <div
              key={i}
              draggable={false}
              onClick={() => {
                if (touchPickTodo && inCurrentMonth) { handleTouchReschedule(day); return; }
                handleDayClick(day);
              }}
              onDragOver={(e) => inCurrentMonth ? handleDragOver(e, dateStr) : undefined}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className="glass rounded-xl transition-all duration-200"
              style={{
                minHeight: "clamp(52px, 10vw, 80px)",
                padding:   "clamp(4px, 1.2vw, 8px)",
                opacity:   !inCurrentMonth ? 0.25 : 1,
                outline:   isNow ? "1.5px solid var(--accent)" : isDragOver ? "1.5px solid var(--accent-dim)" : "none",
                outlineOffset: "1px",
                cursor:    inCurrentMonth ? "pointer" : "default",
                background: isDragOver
                  ? "var(--glass-fill-hover)"
                  : isNow
                  ? "var(--glass-fill-hover)"
                  : isTouchTarget
                  ? "var(--accent-muted)"
                  : undefined,
                boxShadow: isDragOver ? "0 0 0 2px var(--accent-dim), var(--shadow-md)" : undefined,
                transition: "background 0.15s, box-shadow 0.15s, outline 0.15s",
              }}
            >
              {/* Day number */}
              <div style={{ color: isNow ? "var(--accent)" : "var(--text-muted)", fontWeight: isNow ? 600 : 400, fontSize: "clamp(9px, 2.5vw, 12px)", fontFamily: "monospace", marginBottom: "2px" }}>
                {format(day, "d")}
              </div>

              {/* Task dots */}
              <div className="space-y-0.5">
                {dayTodos.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, t)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onClick={(e) => e.stopPropagation()} // prevent day-click while interacting with task
                    className="flex items-center gap-1"
                    style={{ opacity: t.status === "done" ? 0.4 : 1, cursor: "grab", userSelect: "none", touchAction: "none" }}
                  >
                    <span className="rounded-full flex-shrink-0" style={{ width: "clamp(4px, 1.2vw, 6px)", height: "clamp(4px, 1.2vw, 6px)", background: PRIORITY_COLOR[t.priority] }} />
                    <span className="truncate font-mono" style={{
                      fontSize: "clamp(7px, 2vw, 10px)",
                      color: isBefore(new Date(t.due_date!), new Date()) && t.status !== "done" ? "#ff6b6b" : "var(--text-secondary)",
                    }}>
                      {t.title}
                    </span>
                  </div>
                ))}
                {dayTodos.length > 3 && (
                  <span className="font-mono" style={{ fontSize: "clamp(6px, 1.8vw, 8px)", color: "var(--text-muted)" }}>
                    +{dayTodos.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {todosWithDueDate.length === 0 && !loading && (
        <div className="text-center py-12 mt-6 glass rounded-2xl animate-fade-in">
          <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>No tasks have due dates yet.</p>
          <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Click any day to add a task with that date.</p>
        </div>
      )}

      {/* Drag tip — desktop only */}
      {todosWithDueDate.length > 0 && (
        <p className="hidden sm:block text-center text-[10px] font-mono mt-4" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          Drag any task to a different day to reschedule it
        </p>
      )}

      {prefillDate && (
        <AddTodoModal prefillDueDate={prefillDate} onAdd={handleAdd} onClose={() => setPrefillDate(null)} />
      )}

      {/* Day timeline view — v12.2 */}
      {selectedDay && (() => {
        const dayTasks = todosWithDueDate
          .filter((t) => t.due_date === selectedDay)
          .sort((a, b) => {
            // Sort by start_date if available, else by estimated_mins
            if (a.start_date && b.start_date) return a.start_date.localeCompare(b.start_date);
            if (a.start_date) return -1;
            if (b.start_date) return 1;
            return (a.estimated_mins ?? 0) - (b.estimated_mins ?? 0);
          });
        return (
          <div className="mt-6 animate-fade-in-up liquid-glass rounded-[22px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {format(new Date(selectedDay + "T12:00:00"), "EEEE, MMM d")}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""} scheduled
                </div>
              </div>
              <button onClick={() => setSelectedDay(null)}
                style={{ fontSize: "18px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {dayTasks.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace" }}>No tasks scheduled. Click a day to add one.</p>
            ) : (
              <div className="space-y-3">
                {dayTasks.map((t, i) => {
                  const color = EVENT_COLORS[i % EVENT_COLORS.length];
                  const estMins = t.estimated_mins;
                  return (
                    <div key={t.id}>
                      {/* Break tag between events */}
                      {i > 0 && i % 2 === 0 && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245,158,11,0.12)", border: "0.5px solid rgba(245,158,11,0.28)", borderRadius: "99px", padding: "4px 14px", fontSize: "12px", color: "#fcd34d", margin: "4px 0 8px" }}>
                          ☕ Break &nbsp;·&nbsp; {estMins ? `~${estMins}m` : "buffer time"}
                        </div>
                      )}
                      {/* Event card */}
                      <div style={{ borderRadius: "14px", padding: "14px 14px 14px 22px", background: `${color}12`, border: `0.5px solid ${color}28`, position: "relative" }}>
                        <div style={{ position: "absolute", left: "10px", top: "10px", bottom: "10px", width: "3px", borderRadius: "99px", background: color }} />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{t.title}</div>
                          <span style={{ fontSize: "10px", fontFamily: "monospace", padding: "2px 8px", borderRadius: "99px", background: `${PRIORITY_COLOR[t.priority]}20`, color: PRIORITY_COLOR[t.priority] }}>{t.priority}</span>
                        </div>
                        {/* Time row: start_date as start time + estimated_mins as duration */}
                        <div style={{ fontSize: "12px", color, fontFamily: "monospace", marginBottom: t.description ? "4px" : 0 }}>
                          {t.start_date
                            ? `${format(new Date(t.start_date), "h:mm a")}${estMins ? ` – ${format(new Date(new Date(t.start_date).getTime() + estMins * 60000), "h:mm a")}` : ""}`
                            : estMins ? `~${estMins >= 60 ? `${Math.floor(estMins/60)}h ${estMins%60>0?estMins%60+"m":""}`.trim() : estMins+"m"}` : "No duration set"
                          }
                          {t.status === "done" && " ✓ Done"}
                        </div>
                        {t.description && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{t.description.slice(0, 80)}{t.description.length > 80 ? "…" : ""}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
