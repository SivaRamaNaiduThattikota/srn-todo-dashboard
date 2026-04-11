/**
 * CalendarWeekStrip.tsx — SRN Command Center v12.1
 * Inspired by "My Calendar" screen (Image 5)
 * Replaces the date navigation in /calendar page.
 * Usage: import CalendarWeekStrip from "@/components/CalendarWeekStrip";
 */

"use client";

import { addDays, format, isToday, startOfWeek } from "date-fns";

interface CalendarWeekStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  weekOffset?: number; // 0 = current week
}

export default function CalendarWeekStrip({
  selectedDate,
  onSelectDate,
  weekOffset = 0,
}: CalendarWeekStripProps) {
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        overflowX: "auto",
        padding: "4px 0 14px",
        scrollbarWidth: "none",
      }}
    >
      {days.map((day, i) => {
        const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
        const isTodayDay = isToday(day);

        return (
          <button
            key={i}
            onClick={() => onSelectDate(day)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              minWidth: "42px",
              padding: "8px 4px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s, transform 0.1s",
              background: isSelected
                ? "linear-gradient(135deg, #7c6ffd, #a78bfa)"
                : isTodayDay
                ? "rgba(124,111,253,0.14)"
                : "transparent",
              boxShadow: isSelected ? "0 4px 16px rgba(124,111,253,0.35)" : "none",
              transform: isSelected ? "scale(1.05)" : "scale(1)",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: isSelected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)",
              }}
            >
              {DAY_NAMES[i]}
            </span>
            <span
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: isSelected ? "#fff" : isTodayDay ? "#a78bfa" : "rgba(255,255,255,0.75)",
              }}
            >
              {format(day, "d")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
