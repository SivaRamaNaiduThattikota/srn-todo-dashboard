"use client";

import { useState, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { addTodo, type TodoPriority, type TodoCategory, type ResourceLink } from "@/lib/supabase";
import { AddTodoModal } from "@/components/AddTodoModal";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  isSameDay, isSameMonth, addMonths, subMonths, isToday, isBefore,
} from "date-fns";

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ff6b6b",
  high:     "#ff9500",
  medium:   "#f5a623",
  low:      "#8e8e93",
};

export default function CalendarPage() {
  const { todos, loading } = useRealtimeTodos();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [prefillDate, setPrefillDate]   = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  const days = useMemo(() => {
    const start   = startOfMonth(currentMonth);
    const end     = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">
      {/* Header */}
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)", fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.025em" }}>
          Calendar
        </h1>
        <p className="text-xs sm:text-sm font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          Tasks by due date · click a day to add a task
        </p>
      </header>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="glass rounded-xl px-3 sm:px-4 py-2 transition-all"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-medium font-mono" style={{ color: "var(--text-primary)" }}>
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          {/* Today button — only visible when not on current month */}
          {!isCurrentMonth && (
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 text-[10px] font-mono rounded-[10px] transition-all"
              style={{
                background: "var(--accent-muted)",
                color: "var(--accent)",
                border: "0.5px solid var(--accent-dim)",
              }}
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="glass rounded-xl px-3 sm:px-4 py-2 transition-all"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-[10px] sm:text-xs font-mono py-2"
            style={{ color: "var(--text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
        {days.map((day, i) => {
          const dayTodos      = todosWithDueDate.filter((t) => isSameDay(new Date(t.due_date!), day));
          const inCurrentMonth = isSameMonth(day, currentMonth);
          const isNow         = isToday(day);
          const dateStr       = format(day, "yyyy-MM-dd");

          return (
            <div
              key={i}
              onClick={() => handleDayClick(day)}
              className="glass rounded-xl transition-all duration-200"
              style={{
                minHeight: "60px",
                padding: "6px 6px 6px 8px",
                opacity: !inCurrentMonth ? 0.25 : 1,
                outline: isNow ? "1.5px solid var(--accent)" : "none",
                outlineOffset: "1px",
                cursor: inCurrentMonth ? "pointer" : "default",
                background: isNow ? "var(--glass-fill-hover)" : undefined,
              }}
            >
              {/* Day number */}
              <div
                className="text-[10px] sm:text-xs font-mono mb-1"
                style={{ color: isNow ? "var(--accent)" : "var(--text-muted)", fontWeight: isNow ? 600 : 400 }}
              >
                {format(day, "d")}
              </div>

              {/* Task dots */}
              <div className="space-y-0.5">
                {dayTodos.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1"
                    style={{ opacity: t.status === "done" ? 0.4 : 1 }}
                  >
                    <span
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full flex-shrink-0"
                      style={{ background: PRIORITY_COLOR[t.priority] }}
                    />
                    <span
                      className="text-[8px] sm:text-[10px] truncate font-mono"
                      style={{
                        color:
                          isBefore(new Date(t.due_date!), new Date()) && t.status !== "done"
                            ? "#ff6b6b"
                            : "var(--text-secondary)",
                      }}
                    >
                      {t.title}
                    </span>
                  </div>
                ))}
                {dayTodos.length > 3 && (
                  <span className="text-[8px] font-mono" style={{ color: "var(--text-muted)" }}>
                    +{dayTodos.length - 3} more
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
          <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
            Click any day to add a task with that date.
          </p>
        </div>
      )}

      {/* Add task modal — pre-filled with clicked date */}
      {prefillDate && (
        <AddTodoModal
          prefillDueDate={prefillDate}
          onAdd={handleAdd}
          onClose={() => setPrefillDate(null)}
        />
      )}
    </div>
  );
}
