-- ============================================================
-- HOTFIX: Fix the activity_log trigger
-- The trigger was running BEFORE INSERT, but the activity_log
-- has a foreign key to todos — the todo doesn't exist yet at
-- BEFORE INSERT time, causing the FK violation.
-- 
-- Solution: Split into two triggers:
--   1. BEFORE UPDATE — to set completed_at (needs to modify NEW)
--   2. AFTER INSERT/UPDATE — to log to activity_log (todo exists by then)
-- ============================================================

-- Drop the broken trigger
DROP TRIGGER IF EXISTS log_todo_changes_trigger ON todos;
DROP FUNCTION IF EXISTS log_todo_changes();

-- Trigger 1: BEFORE UPDATE — only sets completed_at
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    IF NEW.status = 'done' THEN
      NEW.completed_at = now();
    ELSE
      NEW.completed_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_completed_at_trigger
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();

-- Trigger 2: AFTER INSERT/UPDATE — logs to activity_log
CREATE OR REPLACE FUNCTION log_todo_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (todo_id, action, new_value)
    VALUES (NEW.id, 'created', NEW.title);
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO activity_log (todo_id, action, old_value, new_value)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_todo_activity_trigger
  AFTER INSERT OR UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION log_todo_activity();
