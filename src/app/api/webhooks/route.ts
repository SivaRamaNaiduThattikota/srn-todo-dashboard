import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// External webhook API — agents and automations can create/update tasks via HTTP
// POST /api/webhooks { action: "create", title: "...", priority: "high", ... }
// POST /api/webhooks { action: "update", id: "uuid", status: "done" }
// POST /api/webhooks { action: "list" }
// Auth: Bearer token from WEBHOOK_SECRET in .env

export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { title, description, priority, assigned_agent, due_date, status } = body;
      if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
      const { data, error } = await supabase.from("todos").insert({
        title, description: description || "", priority: priority || "medium",
        assigned_agent: assigned_agent || "webhook", due_date: due_date || null,
        status: status || "pending",
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, todo: data });
    }

    if (action === "update") {
      const { id, ...updates } = body;
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      delete updates.action;
      const { data, error } = await supabase.from("todos").update(updates).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, todo: data });
    }

    if (action === "list") {
      const { data, error } = await supabase.from("todos").select("*").order("updated_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ todos: data });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action. Use: create, update, list, delete" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
