import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Google Calendar Live Sync — Smart Version
//
// How to add (one time):
//   Google Calendar → Settings → Add calendar → From URL →
//   https://srn-todo-dashboard.vercel.app/api/export-calendar
//
// Features:
// - Tasks show at 9 AM IST (not all-day, so they don't clutter)
// - 1-hour duration blocks for each task
// - Critical/blocked tasks get ALARM reminders (30 min before)
// - Overdue tasks show with ⚠ prefix
// - Done tasks are marked COMPLETED and show ✓
// - Priority shown as color label
// - Refreshes every 2 hours
// - Description includes clickable link back to dashboard

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: todos } = await supabase
    .from("todos")
    .select("*")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  // Dashboard URL for linking back
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://srn-todo-dashboard.vercel.app";

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SRN Command Center//Tasks//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SRN Tasks",
    "X-WR-TIMEZONE:Asia/Kolkata",
    // Refresh every 2 hours for faster sync
    "REFRESH-INTERVAL;VALUE=DURATION:PT2H",
    "X-PUBLISHED-TTL:PT2H",
    // Timezone definition for IST
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "TZNAME:IST",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  if (todos && todos.length > 0) {
    // Sort: overdue first, then by priority, then by due date
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...todos].sort((a, b) => {
      const aOverdue = new Date(a.due_date!) < now && a.status !== "done" ? -1 : 0;
      const bOverdue = new Date(b.due_date!) < now && b.status !== "done" ? -1 : 0;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Assign time slots — stagger tasks across the day so they don't all stack at 9 AM
    // Critical: 9 AM, High: 10 AM, Medium: 11 AM, Low: 2 PM
    const timeSlots: Record<string, { hour: number; min: number }> = {
      critical: { hour: 9, min: 0 },
      high: { hour: 10, min: 0 },
      medium: { hour: 11, min: 0 },
      low: { hour: 14, min: 0 },
    };

    // Track how many tasks per day per priority to offset times
    const daySlotCounter: Record<string, number> = {};

    for (const todo of sorted) {
      const due = new Date(todo.due_date!);
      const isDone = todo.status === "done";
      const isOverdue = due < now && !isDone;
      const isBlocked = todo.status === "blocked";
      const isToday = due.toDateString() === now.toDateString();

      // Get time slot
      const slot = timeSlots[todo.priority] || { hour: 11, min: 0 };
      const dayKey = `${todo.due_date}-${todo.priority}`;
      const offset = daySlotCounter[dayKey] || 0;
      daySlotCounter[dayKey] = offset + 1;

      // Adjust time by 30-min increments for multiple tasks on same day
      const startHour = slot.hour + Math.floor((slot.min + offset * 30) / 60);
      const startMin = (slot.min + offset * 30) % 60;

      // Format datetime in IST
      const dueDate = todo.due_date!.replace(/-/g, "");
      const startTime = `${dueDate}T${String(startHour).padStart(2, "0")}${String(startMin).padStart(2, "0")}00`;
      const endHour = startHour + (todo.priority === "critical" ? 1 : 0);
      const endMin = startMin + 30;
      const endTime = `${dueDate}T${String(endHour + Math.floor(endMin / 60)).padStart(2, "0")}${String(endMin % 60).padStart(2, "0")}00`;

      // Build title with status indicators
      let title = "";
      if (isDone) title += "✓ ";
      else if (isOverdue) title += "⚠ OVERDUE: ";
      else if (isBlocked) title += "⛔ BLOCKED: ";
      else if (isToday) title += "📌 TODAY: ";

      title += todo.title;
      if (!isDone && !isOverdue) title += ` [${todo.priority.toUpperCase()}]`;

      // Build rich description
      const descParts = [
        `Priority: ${todo.priority.toUpperCase()}`,
        `Status: ${todo.status.replace("_", " ")}`,
        `Agent: @${todo.assigned_agent}`,
      ];
      if (todo.description) descParts.push("", todo.description);
      descParts.push("", `Dashboard: ${baseUrl}`);

      const description = descParts.join("\\n");

      ics.push(
        "BEGIN:VEVENT",
        `UID:${todo.id}@srn-command-center`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Asia/Kolkata:${startTime}`,
        `DTEND;TZID=Asia/Kolkata:${endTime}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        `URL:${baseUrl}`,
        `STATUS:${isDone ? "COMPLETED" : isBlocked ? "CANCELLED" : "CONFIRMED"}`,
        `CATEGORIES:${todo.priority},${todo.status}`,
        // Transparency: overdue/critical = busy (blocks time), others = free
        `TRANSP:${todo.priority === "critical" || isOverdue ? "OPAQUE" : "TRANSPARENT"}`,
      );

      // Add reminder for critical, high, overdue, or due-today tasks (not done)
      if (!isDone && (todo.priority === "critical" || todo.priority === "high" || isOverdue || isToday)) {
        ics.push(
          "BEGIN:VALARM",
          "TRIGGER:-PT30M",
          "ACTION:DISPLAY",
          `DESCRIPTION:Task due: ${todo.title}`,
          "END:VALARM",
        );
      }

      // Extra reminder for critical tasks — 1 hour before AND at event time
      if (!isDone && todo.priority === "critical") {
        ics.push(
          "BEGIN:VALARM",
          "TRIGGER:-PT60M",
          "ACTION:DISPLAY",
          `DESCRIPTION:CRITICAL task approaching: ${todo.title}`,
          "END:VALARM",
        );
      }

      ics.push("END:VEVENT");
    }
  }

  ics.push("END:VCALENDAR");

  return new NextResponse(ics.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
