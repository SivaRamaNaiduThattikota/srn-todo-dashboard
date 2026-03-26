-- ============================================================
-- SUPABASE MIGRATION: Add rich task fields
-- Run this in Supabase SQL Editor (one time)
-- ============================================================

-- Add new columns for rich task details
ALTER TABLE todos ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- Auto-set completed_at when status changes to 'done'
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_completion ON todos;
CREATE TRIGGER track_completion
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();
