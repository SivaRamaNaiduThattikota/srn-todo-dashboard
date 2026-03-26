import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Google Calendar Live Sync URL
// Add this URL to Google Calendar ONCE → it auto-refreshes every few hours
// Google Calendar → Settings → Add calendar → From URL → paste:
// https://srn-todo-dashboard.vercel.app/api/export-calendar
//
// Every time Google Calendar refreshes, it pulls your latest tasks.
// No manual .ics downloads needed ever again.

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

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SRN Command Center//Tasks//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SRN Tasks",
    "X-WR-TIMEZONE:Asia/Kolkata",
    // Tell Google Calendar to refresh every 4 hours
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H",
    "X-PUBLISHED-TTL:PT4H",
  ];

  if (todos && todos.length > 0) {
    for (const todo of todos) {
      const dueDate = todo.due_date.replace(/-/g, "");
      const priorityNum = { critical: 1, high: 3, medium: 5, low: 9 }[todo.priority as string] || 5;
      const isDone = todo.status === "done";
      const statusText = { pending: "Pending", in_progress: "In Progress", done: "Done", blocked: "BLOCKED" }[todo.status] || todo.status;

      ics.push(
        "BEGIN:VEVENT",
        `UID:${todo.id}@srn-command-center`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dueDate}`,
        `DTEND;VALUE=DATE:${dueDate}`,
        `SUMMARY:${isDone ? "✓ " : todo.status === "blocked" ? "⛔ " : ""}[${todo.priority.toUpperCase()}] ${todo.title}`,
        `DESCRIPTION:Status: ${statusText}\\nPriority: ${todo.priority}\\nAgent: @${todo.assigned_agent}${todo.description ? "\\n\\n" + todo.description.replace(/\n/g, "\\n") : ""}`,
        `PRIORITY:${priorityNum}`,
        `STATUS:${isDone ? "COMPLETED" : todo.status === "in_progress" ? "IN-PROCESS" : "NEEDS-ACTION"}`,
        `CATEGORIES:SRN Tasks,${todo.priority}`,
        // Color coding via Apple/Google extended properties
        ...(todo.priority === "critical" ? ["COLOR:tomato"] : []),
        ...(todo.priority === "high" ? ["COLOR:tangerine"] : []),
        ...(isDone ? ["COLOR:sage"] : []),
        ...(todo.status === "blocked" ? ["COLOR:flamingo"] : []),
        "END:VEVENT"
      );
    }
  }

  ics.push("END:VCALENDAR");

  return new NextResponse(ics.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // No Content-Disposition: attachment — this makes it a live feed, not a download
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
