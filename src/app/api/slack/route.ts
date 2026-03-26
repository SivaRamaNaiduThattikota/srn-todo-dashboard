// Slack integration — reserved for future use
// Not needed for personal todo dashboard currently

import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ message: "Slack integration not configured. Add SLACK_WEBHOOK_URL to .env.local to activate." });
}
