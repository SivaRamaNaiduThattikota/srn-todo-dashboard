-- ============================================================
-- SRN Command Center — MASTER SQL
-- Run this ONCE on a fresh Supabase project to set up everything
-- Combines: setup + upgrade + hotfix + templates + v5 + projects
-- Safe to re-run (uses IF NOT EXISTS everywhere)
-- ============================================================

-- 1. TODOS TABLE
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  assigned_agent TEXT DEFAULT 'unassigned',
  due_date DATE DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general' CHECK (category IN ('learning','project','interview-prep','work','personal','general')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='todos' AND policyname='Allow all on todos') THEN CREATE POLICY "Allow all on todos" ON todos FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE todos; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. SUBTASKS
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL, is_done BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subtasks' AND policyname='Allow all on subtasks') THEN CREATE POLICY "Allow all on subtasks" ON subtasks FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

-- 3. ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created','status_changed','completed','deleted')),
  old_value TEXT, new_value TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_log' AND policyname='Allow all on activity_log') THEN CREATE POLICY "Allow all on activity_log" ON activity_log FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

-- 4. TRIGGERS (hotfix version — split BEFORE/AFTER)
DROP TRIGGER IF EXISTS set_completed_at_trigger ON todos;
DROP TRIGGER IF EXISTS log_todo_activity_trigger ON todos;
DROP TRIGGER IF EXISTS log_todo_changes_trigger ON todos;
DROP FUNCTION IF EXISTS log_todo_changes();

CREATE OR REPLACE FUNCTION set_completed_at() RETURNS TRIGGER AS $$
BEGIN IF OLD.status != NEW.status THEN IF NEW.status='done' THEN NEW.completed_at=now(); ELSE NEW.completed_at=NULL; END IF; END IF; RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_completed_at_trigger BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION set_completed_at();

CREATE OR REPLACE FUNCTION log_todo_activity() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP='INSERT' THEN INSERT INTO activity_log(todo_id,action,new_value) VALUES(NEW.id,'created',NEW.title);
  ELSIF TG_OP='UPDATE' AND OLD.status!=NEW.status THEN INSERT INTO activity_log(todo_id,action,old_value,new_value) VALUES(NEW.id,'status_changed',OLD.status,NEW.status);
  END IF; RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER log_todo_activity_trigger AFTER INSERT OR UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION log_todo_activity();

-- 5. TASK TEMPLATES
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, description TEXT DEFAULT '', priority TEXT DEFAULT 'medium',
  assigned_agent TEXT DEFAULT 'unassigned', recurrence TEXT CHECK (recurrence IN ('daily','weekly','monthly',NULL)),
  is_active BOOLEAN DEFAULT true, last_created_at TIMESTAMPTZ DEFAULT NULL, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='task_templates' AND policyname='Allow all on task_templates') THEN CREATE POLICY "Allow all on task_templates" ON task_templates FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

-- 6. DAILY HABITS
CREATE TABLE IF NOT EXISTS daily_habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, icon TEXT DEFAULT '', color TEXT DEFAULT '#6ee7b7',
  sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_habits' AND policyname='Allow all on daily_habits') THEN CREATE POLICY "Allow all on daily_habits" ON daily_habits FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

-- 7. HABIT LOG
CREATE TABLE IF NOT EXISTS habit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES daily_habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);
ALTER TABLE habit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='habit_log' AND policyname='Allow all on habit_log') THEN CREATE POLICY "Allow all on habit_log" ON habit_log FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

-- 8. NOTES
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, content TEXT DEFAULT '', tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notes' AND policyname='Allow all on notes') THEN CREATE POLICY "Allow all on notes" ON notes FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
CREATE OR REPLACE FUNCTION update_notes_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_notes_timestamp();

-- 9. FOCUS SESSIONS
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25, completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(), ended_at TIMESTAMPTZ DEFAULT NULL
);
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='focus_sessions' AND policyname='Allow all on focus_sessions') THEN CREATE POLICY "Allow all on focus_sessions" ON focus_sessions FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

-- 10. WEEKLY REVIEWS
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL, tasks_completed INTEGER DEFAULT 0, focus_minutes INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0, reflection TEXT DEFAULT '', goals_next_week TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(week_start)
);
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weekly_reviews' AND policyname='Allow all on weekly_reviews') THEN CREATE POLICY "Allow all on weekly_reviews" ON weekly_reviews FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

-- 11. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, description TEXT DEFAULT '', category TEXT DEFAULT 'general',
  tech TEXT[] DEFAULT '{}', status TEXT DEFAULT 'planning' CHECK (status IN ('planning','in-progress','completed','deployed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  github_url TEXT DEFAULT '', live_url TEXT DEFAULT '', highlights TEXT[] DEFAULT '{}',
  start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL, sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='projects' AND policyname='Allow all on projects') THEN CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
CREATE OR REPLACE FUNCTION update_projects_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_projects_timestamp();

-- 12. INDEXES
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_todos_due ON todos(due_date);

-- 13. SEED DEFAULT HABITS
INSERT INTO daily_habits (name, icon, color, sort_order) VALUES
  ('Python practice','P','#3b82f6',0), ('SQL practice','S','#f59e0b',1),
  ('ML concept','M','#8b5cf6',2), ('English speaking','E','#10b981',3)
ON CONFLICT DO NOTHING;
