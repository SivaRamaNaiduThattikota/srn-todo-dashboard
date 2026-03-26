-- ============================================================
-- Add a reference project (run after supabase-projects.sql)
-- This shows what a well-documented completed project looks like
-- ============================================================

INSERT INTO projects (title, description, category, tech, status, progress, github_url, live_url, highlights, sort_order, start_date, end_date) VALUES
  (
    'SRN Command Center',
    'Full-stack real-time task dashboard with 60+ features. Built with Next.js, Supabase, Tailwind. Features: habit tracking, Pomodoro timer, knowledge base, kanban board, analytics with burndown charts, Google Calendar sync, webhook API, PWA offline mode.',
    'Full Stack',
    ARRAY['Next.js','TypeScript','Supabase','Tailwind CSS','Framer Motion','Vercel'],
    'deployed',
    100,
    'https://github.com/YOUR_USERNAME/srn-todo-dashboard',
    'https://srn-todo-dashboard.vercel.app',
    ARRAY['12 pages with real-time WebSocket updates','Supabase PostgreSQL with triggers and RLS','Glassmorphism UI with dark/light mode','Google Calendar live sync via ICS feed','Webhook API for external automations','PWA with service worker offline mode','Daily habit streak tracker with heatmap','Pomodoro focus timer with analytics'],
    -1,
    '2026-03-26',
    '2026-03-26'
  )
ON CONFLICT DO NOTHING;
