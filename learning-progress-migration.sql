-- ═══════════════════════════════════════════════════════════════════════
-- SRN Command Center — Learning Progress Migration
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Create learning_progress table
CREATE TABLE IF NOT EXISTS learning_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id     int  NOT NULL,
  track_index  int  NOT NULL,
  topic_index  int  NOT NULL,
  is_done      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase_id, track_index, topic_index)
);

-- 2. Index for fast fetches
CREATE INDEX IF NOT EXISTS idx_learning_progress_phase
  ON learning_progress (phase_id);

-- 3. Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_learning_progress_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_learning_progress_updated_at ON learning_progress;
CREATE TRIGGER trg_learning_progress_updated_at
  BEFORE UPDATE ON learning_progress
  FOR EACH ROW EXECUTE FUNCTION update_learning_progress_updated_at();

-- 4. RLS — allow full access (same pattern as your other tables)
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_learning_progress" ON learning_progress;
CREATE POLICY "allow_all_learning_progress"
  ON learning_progress FOR ALL
  USING (true)
  WITH CHECK (true);
