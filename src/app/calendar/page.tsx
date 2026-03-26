"use client";

import { useState, useMemo } from "react";
import { useRealtimeTodos } from "@/lib/useRealtimeTodos";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, isSameMonth, addMonths, subMonths, isToday, isBefore } from "date-fns";

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-priority-critical",
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

export default function CalendarPage() {
  const { todos, loading } = useRealtimeTodos();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });

    // Pad start to Monday
    const startDay = start.getDay();
    const padStart = startDay === 0 ? 6 : startDay - 1;
    const paddedStart = [];
    for (let i = padStart; i > 0; i--) {
      const d = new Date(start);
      d.setDate(d.getDate() - i);
      paddedStart.push(d);
    }

    return [...paddedStart, ...allDays];
  }, [currentMonth]);

  const todosWithDueDate = useMemo(() => {
    return todos.filter((t) => t.due_date);
  }, [todos]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-6 sm:mb-8 animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Calendar</h1>
        <p className="text-xs sm:text-sm text-text-muted font-mono mt-1">Tasks by due date</p>
      </header>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="glass rounded-xl px-3 sm:px-4 py-2 text-sm text-text-secondary hover:text-white transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-base sm:text-lg font-medium text-white font-mono">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="glass rounded-xl px-3 sm:px-4 py-2 text-sm text-text-secondary hover:text-white transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-[10px] sm:text-xs font-mono text-text-muted py-2">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
        {days.map((day, i) => {
          const dayTodos = todosWithDueDate.filter((t) => isSameDay(new Date(t.due_date!), day));
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isNow = isToday(day);

          return (
            <div
              key={i}
              className={`glass rounded-xl min-h-[60px] sm:min-h-[80px] p-1.5 sm:p-2 transition-all duration-300 ${
                !isCurrentMonth ? "opacity-30" : ""
              } ${isNow ? "ring-1 ring-[var(--accent)] ring-opacity-40" : ""}`}
            >
              <div className={`text-[10px] sm:text-xs font-mono mb-1 ${
                isNow ? "text-[var(--accent)] font-medium" : "text-text-muted"
              }`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayTodos.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-1 ${
                      t.status === "done" ? "opacity-40" : ""
                    }`}
                  >
                    <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                    <span className={`text-[8px] sm:text-[10px] truncate font-mono ${
                      isBefore(new Date(t.due_date!), new Date()) && t.status !== "done"
                        ? "text-priority-critical"
                        : "text-text-secondary"
                    }`}>
                      {t.title}
                    </span>
                  </div>
                ))}
                {dayTodos.length > 3 && (
                  <span className="text-[8px] font-mono text-text-muted">+{dayTodos.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {todosWithDueDate.length === 0 && !loading && (
        <div className="text-center py-12 mt-6 glass rounded-2xl animate-fade-in">
          <p className="text-sm text-text-muted font-mono">No tasks have due dates yet.</p>
          <p className="text-xs text-text-muted/60 font-mono mt-1">Add due dates to tasks to see them here.</p>
        </div>
      )}
    </div>
  );
}
