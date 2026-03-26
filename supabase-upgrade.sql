-- ============================================================
-- SUPABASE UPGRADE: Run this in SQL Editor (after initial setup)
-- Adds: due dates, descriptions, subtasks, completion tracking
-- ============================================================

-- Add new columns to todos table
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id     UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  is_done     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on subtasks" ON subtasks FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;

-- Create activity log for analytics
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id     UUID REFERENCES todos(id) ON DELETE SET NULL,
  action      TEXT NOT NULL CHECK (action IN ('created', 'status_changed', 'completed', 'deleted')),
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on activity_log" ON activity_log FOR ALL USING (true) WITH CHECK (true);

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

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_todos_due ON todos(due_date);
