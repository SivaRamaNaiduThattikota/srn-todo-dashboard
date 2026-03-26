// Email notifications — not needed
// Google Calendar notifications via live sync URL is sufficient
// This file kept as placeholder in case email is needed later
// To activate: npm install resend, add RESEND_API_KEY to .env.local

import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ message: "Email notifications not configured. Using Google Calendar sync instead. See /api/export-calendar" });
}
