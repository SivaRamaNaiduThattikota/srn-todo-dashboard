#!/usr/bin/env node

/**
 * Agent Task Updater — CLI tool for AI agents to update task status
 * Usage: node agent-update.mjs <task-id> <new-status>
 * Example: node agent-update.mjs abc123 done
 *
 * Writes directly to Supabase -> dashboard updates instantly via WebSocket
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const [, , taskId, newStatus] = process.argv;
const VALID_STATUSES = ["pending", "in_progress", "done", "blocked"];

if (!taskId || !newStatus) {
  console.error("Usage: node agent-update.mjs <task-id> <new-status>");
  console.error(`Valid statuses: ${VALID_STATUSES.join(", ")}`);
  process.exit(1);
}

if (!VALID_STATUSES.includes(newStatus)) {
  console.error(`Invalid status: ${newStatus}. Valid: ${VALID_STATUSES.join(", ")}`);
  process.exit(1);
}

async function main() {
  const { data, error } = await supabase
    .from("todos")
    .update({ status: newStatus })
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.error("Update failed:", error.message);
    process.exit(1);
  }
  console.log(`Task "${data.title}" -> ${newStatus} | @${data.assigned_agent} | ${data.priority}`);
}

main();
