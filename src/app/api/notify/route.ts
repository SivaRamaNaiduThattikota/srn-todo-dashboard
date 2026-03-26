import { NextRequest, NextResponse } from "next/server";

// Email notification API
// To activate: add RESEND_API_KEY to .env.local
// Get key from: https://resend.com (free, 100 emails/day)

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFICATION_EMAIL;

  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set. Get one free at resend.com" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { subject, message, type } = body;

    const emoji = { overdue: "⏰", completed: "✅", created: "📋", blocked: "🚫" }[type as string] || "📋";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "SRN Command Center <notifications@resend.dev>",
        to: [toEmail || "delivered@resend.dev"],
        subject: `${emoji} ${subject}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: #0d0d10; border-radius: 16px; padding: 24px; color: #f0f0f3;">
              <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 600;">${emoji} ${subject}</h2>
              <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.6;">${message}</p>
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 16px 0;" />
              <p style="margin: 0; font-size: 11px; color: #636370;">SRN Command Center</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status });
    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
