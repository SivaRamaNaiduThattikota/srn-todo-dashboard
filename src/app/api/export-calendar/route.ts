import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: todos } = await supabase
    .from("todos")
    .select("*")
    .not("due_date", "is", null)
    .neq("status", "done")
    .order("due_date", { ascending: true });

  if (!todos || todos.length === 0) {
    return NextResponse.json({ error: "No tasks with due dates" }, { status: 404 });
  }

  // Build ICS calendar file
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SRN Command Center//Tasks//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SRN Tasks",
  ];

  for (const todo of todos) {
    const dueDate = todo.due_date.replace(/-/g, "");
    const priority = { critical: 1, high: 3, medium: 5, low: 9 }[todo.priority as string] || 5;

    ics.push(
      "BEGIN:VEVENT",
      `UID:${todo.id}@srn-command-center`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dueDate}`,
      `DTEND;VALUE=DATE:${dueDate}`,
      `SUMMARY:[${todo.priority.toUpperCase()}] ${todo.title}`,
      `DESCRIPTION:Status: ${todo.status}\\nAgent: @${todo.assigned_agent}${todo.description ? "\\n\\n" + todo.description : ""}`,
      `PRIORITY:${priority}`,
      `STATUS:${todo.status === "in_progress" ? "IN-PROCESS" : "NEEDS-ACTION"}`,
      "END:VEVENT"
    );
  }

  ics.push("END:VCALENDAR");

  return new NextResponse(ics.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="srn-tasks-${new Date().toISOString().slice(0, 10)}.ics"`,
    },
  });
}
