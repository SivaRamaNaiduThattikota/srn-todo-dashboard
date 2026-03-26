-- ============================================================
-- SUPABASE UPGRADE v2 — Safe to re-run (handles existing objects)
-- ============================================================

-- Add new columns to todos table
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create subtasks table (if not exists)
CREATE TABLE IF NOT EXISTS subtasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id     UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  is_done     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subtasks' AND policyname = 'Allow all on subtasks') THEN
    CREATE POLICY "Allow all on subtasks" ON subtasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Safely add subtasks to realtime (ignore if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id     UUID REFERENCES todos(id) ON DELETE SET NULL,
  action      TEXT NOT NULL CHECK (action IN ('created', 'status_changed', 'completed', 'deleted')),
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'Allow all on activity_log') THEN
    CREATE POLICY "Allow all on activity_log" ON activity_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Auto-log status changes
CREATE OR REPLACE FUNCTION log_todo_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (todo_id, action, new_value)
    VALUES (NEW.id, 'created', NEW.title);
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO activity_log (todo_id, action, old_value, new_value)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status);
    IF NEW.status = 'done' THEN
      NEW.completed_at = now();
    ELSE
      NEW.completed_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_todo_changes_trigger ON todos;
CREATE TRIGGER log_todo_changes_trigger
  BEFORE INSERT OR UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION log_todo_changes();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_todos_due ON todos(due_date);
