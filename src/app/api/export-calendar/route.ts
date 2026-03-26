import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Google Calendar Sync — Honest Version
//
// Tasks are DATE-only (no time picker in dashboard), so they stay as all-day events.
// Smart features: overdue markers, priority in title, reminders, status tracking.
//
// Two ways to use:
// 1. SUBSCRIBE: Google Calendar → From URL → paste this endpoint URL (auto-refreshes)
// 2. INSTANT:   GET /api/export-calendar?download=true → downloads .ics for manual import

export async function GET(req: NextRequest) {
  const download = req.nextUrl.searchParams.get("download") === "true";

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://srn-todo-dashboard.vercel.app";

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SRN Command Center//Tasks//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SRN Tasks",
    "X-WR-TIMEZONE:Asia/Kolkata",
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H",
    "X-PUBLISHED-TTL:PT4H",
  ];

  if (todos && todos.length > 0) {
    for (const todo of todos) {
      const due = new Date(todo.due_date!);
      const isDone = todo.status === "done";
      const isOverdue = due < now && !isDone;
      const isBlocked = todo.status === "blocked";
      const isToday = due.toDateString() === now.toDateString();
      const dueDate = todo.due_date!.replace(/-/g, "");

      // Next day for all-day event end (iCal spec: DTEND is exclusive)
      const nextDay = new Date(due);
      nextDay.setDate(nextDay.getDate() + 1);
      const endDate = nextDay.toISOString().slice(0, 10).replace(/-/g, "");

      // Smart title
      let title = "";
      if (isDone) title += "✓ ";
      else if (isOverdue) title += "⚠ OVERDUE — ";
      else if (isBlocked) title += "⛔ BLOCKED — ";
      else if (isToday) title += "📌 ";

      title += todo.title;

      // Priority indicator (visible in calendar list view)
      if (!isDone) {
        const dots: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "⚪" };
        title += ` ${dots[todo.priority] || ""}`;
      }

      // Description
      const desc = [
        `Priority: ${todo.priority.toUpperCase()}`,
        `Status: ${todo.status.replace("_", " ")}`,
        `Agent: @${todo.assigned_agent}`,
        ...(todo.description ? ["", todo.description] : []),
        "",
        `Open dashboard: ${baseUrl}`,
      ].join("\\n");

      ics.push(
        "BEGIN:VEVENT",
        `UID:${todo.id}@srn-command-center`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dueDate}`,
        `DTEND;VALUE=DATE:${endDate}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${desc}`,
        `URL:${baseUrl}`,
        `STATUS:${isDone ? "COMPLETED" : "CONFIRMED"}`,
        `TRANSP:TRANSPARENT`,
      );

      // Reminders — morning of the due date at 8:30 AM IST
      if (!isDone) {
        // Reminder at 8:30 AM on the due date
        ics.push(
          "BEGIN:VALARM",
          "TRIGGER;VALUE=DATE-TIME:" + `${dueDate}T030000Z`,
          "ACTION:DISPLAY",
          `DESCRIPTION:Task due today: ${todo.title} [${todo.priority}]`,
          "END:VALARM",
        );

        // Critical + overdue get a day-before reminder too
        if (todo.priority === "critical" || isOverdue) {
          ics.push(
            "BEGIN:VALARM",
            "TRIGGER:-P1D",
            "ACTION:DISPLAY",
            `DESCRIPTION:Task due tomorrow: ${todo.title} [CRITICAL]`,
            "END:VALARM",
          );
        }
      }

      ics.push("END:VEVENT");
    }
  }

  ics.push("END:VCALENDAR");

  const headers: Record<string, string> = {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Access-Control-Allow-Origin": "*",
  };

  // If download=true, add Content-Disposition to trigger file download
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="srn-tasks-${now.toISOString().slice(0, 10)}.ics"`;
  }

  return new NextResponse(ics.join("\r\n"), { headers });
}
