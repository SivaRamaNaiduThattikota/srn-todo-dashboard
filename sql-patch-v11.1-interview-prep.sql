-- ════════════════════════════════════════════════════════════════════════════
-- SRN COMMAND CENTER — SQL PATCH v11.1
-- Run this in Supabase SQL Editor to add the interview_prep table
-- This is a SAFE patch — uses CREATE TABLE IF NOT EXISTS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS interview_prep (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        UNIQUE NOT NULL,
  data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_interview_prep" ON interview_prep;
CREATE POLICY "anon_all_interview_prep"
  ON interview_prep FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ✅ After running this, the Interview Prep page checkboxes will persist
--    across all browsers and devices via Supabase.
--
-- ⚠️  IMPORTANT — DATA vs SCHEMA:
--    This file (and supabase-master-migration.sql) creates SCHEMA only.
--    Your actual data (tasks, focus sessions, habits, notes, interview
--    progress) is NOT included here.
--    Use Settings → Export & Backup to download your real data as JSON.
--
-- Supabase free tier: 500MB storage, no time limit.
-- For your usage (personal dashboard), this lasts 3-5+ years easily.
