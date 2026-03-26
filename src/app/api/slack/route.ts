import { NextRequest, NextResponse } from "next/server";

// Slack notification API
// To activate: add SLACK_WEBHOOK_URL to .env.local
// Get webhook from: https://api.slack.com/messaging/webhooks

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json({ error: "SLACK_WEBHOOK_URL not set" }, { status: 500 });
  }

  try {
    const { title, message, type } = await req.json();
    const emoji = { overdue: ":warning:", completed: ":white_check_mark:", created: ":clipboard:", blocked: ":no_entry:" }[type as string] || ":clipboard:";

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: `${emoji} *${title}*\n${message}` } },
          { type: "context", elements: [{ type: "mrkdwn", text: `_SRN Command Center · ${new Date().toLocaleTimeString("en-IN")}_` }] },
        ],
      }),
    });

    if (!res.ok) return NextResponse.json({ error: `Slack returned ${res.status}` }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
