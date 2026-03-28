-- =============================================================================
-- SRN Command Center — Supabase Master SQL (v10)
-- Run this once on a fresh Supabase project to set up the full schema.
-- Last updated: 2026-03-29 Session 12
-- Tables: todos, subtasks, activity_log, task_templates, daily_habits,
--         habit_log, notes, focus_sessions, weekly_reviews, projects, decisions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TODOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS todos (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           text NOT NULL,
  description     text DEFAULT '',
  status          text DEFAULT 'pending'
                  CHECK (status IN ('pending','in_progress','done','blocked')),
  priority        text DEFAULT 'medium'
                  CHECK (priority IN ('critical','high','medium','low')),
  assigned_agent  text DEFAULT 'unassigned',
  due_date        date,
  completed_at    timestamptz,
  sort_order      int DEFAULT 0,
  category        text DEFAULT 'general'
                  CHECK (category IN ('learning','project','interview-prep','work','personal','general')),
  resource_links  jsonb DEFAULT '[]'::jsonb,
  tags            text[] DEFAULT '{}'::text[],
  estimated_mins  int DEFAULT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- =============================================================================
-- 2. SUBTASKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS subtasks (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  todo_id     uuid NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title       text NOT NULL,
  is_done     boolean DEFAULT false,
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- 3. ACTIVITY LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  todo_id     uuid REFERENCES todos(id) ON DELETE SET NULL,
  action      text NOT NULL,   -- created | status_changed | completed | deleted
  old_value   text,
  new_value   text,
  created_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- 4. TASK TEMPLATES
-- =============================================================================
CREATE TABLE IF NOT EXISTS task_templates (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           text NOT NULL,
  description     text DEFAULT '',
  priority        text DEFAULT 'medium',
  assigned_agent  text DEFAULT 'unassigned',
  recurrence      text CHECK (recurrence IN ('daily','weekly','monthly')),
  is_active       boolean DEFAULT true,
  last_created_at timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- =============================================================================
-- 5. DAILY HABITS
-- =============================================================================
CREATE TABLE IF NOT EXISTS daily_habits (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  icon        text DEFAULT '✅',
  color       text DEFAULT '#3B82F6',
  sort_order  int DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- 6. HABIT LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS habit_log (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id       uuid NOT NULL REFERENCES daily_habits(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);

-- =============================================================================
-- 7. NOTES (ML knowledge base)
-- =============================================================================
CREATE TABLE IF NOT EXISTS notes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       text NOT NULL,
  content     text DEFAULT '',
  tags        text[] DEFAULT '{}'::text[],
  is_pinned   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- 8. FOCUS SESSIONS (Pomodoro + manual log)
-- =============================================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  todo_id          uuid REFERENCES todos(id) ON DELETE SET NULL,
  duration_minutes int NOT NULL,
  completed        boolean DEFAULT false,
  started_at       timestamptz DEFAULT now(),
  ended_at         timestamptz
);

-- =============================================================================
-- 9. WEEKLY REVIEWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start       date NOT NULL,
  tasks_completed  int DEFAULT 0,
  focus_minutes    int DEFAULT 0,
  streak_days      int DEFAULT 0,
  reflection       text DEFAULT '',
  goals_next_week  text DEFAULT '',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(week_start)
);

-- =============================================================================
-- 10. PROJECTS (ML portfolio tracker)
-- Column names match the app's supabase.ts Project type exactly.
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       text NOT NULL,
  description text DEFAULT '',
  category    text DEFAULT '',        -- Determines which section the project appears in
  tech        text[] DEFAULT '{}'::text[],
  status      text DEFAULT 'planning'
              CHECK (status IN ('planning','in-progress','completed','deployed')),
  progress    int DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  github_url  text DEFAULT '',
  live_url    text DEFAULT '',
  highlights  text[] DEFAULT '{}'::text[],
  start_date  date,
  end_date    date,
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- 11. DECISIONS (v9+)
-- =============================================================================
CREATE TABLE IF NOT EXISTS decisions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision         text NOT NULL,
  reasoning        text DEFAULT '',
  expected_outcome text DEFAULT '',
  category         text DEFAULT 'general'
                   CHECK (category IN ('career','technical','learning','financial','personal','project')),
  status           text DEFAULT 'active'
                   CHECK (status IN ('active','reviewed','reversed','validated')),
  review_date      date,
  review_notes     text DEFAULT '',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_review_date ON decisions(review_date);
CREATE INDEX IF NOT EXISTS idx_decisions_status      ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_category    ON decisions(category);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS todos_updated_at        ON todos;
DROP TRIGGER IF EXISTS subtasks_updated_at     ON subtasks;
DROP TRIGGER IF EXISTS notes_updated_at        ON notes;
DROP TRIGGER IF EXISTS projects_updated_at     ON projects;
DROP TRIGGER IF EXISTS decisions_updated_at    ON decisions;
DROP TRIGGER IF EXISTS weekly_reviews_updated_at ON weekly_reviews;

CREATE TRIGGER todos_updated_at          BEFORE UPDATE ON todos          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subtasks_updated_at       BEFORE UPDATE ON subtasks       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notes_updated_at          BEFORE UPDATE ON notes          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at       BEFORE UPDATE ON projects       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER decisions_updated_at      BEFORE UPDATE ON decisions      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER weekly_reviews_updated_at BEFORE UPDATE ON weekly_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set completed_at when todo → done
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS todos_set_completed_at ON todos;
CREATE TRIGGER todos_set_completed_at BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION set_completed_at();

-- Activity log on todo create / status change
CREATE OR REPLACE FUNCTION log_todo_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log(todo_id, action, new_value) VALUES (NEW.id, 'created', NEW.title);
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO activity_log(todo_id, action, old_value, new_value) VALUES (NEW.id, 'status_changed', OLD.status, NEW.status);
    IF NEW.status = 'done' THEN
      INSERT INTO activity_log(todo_id, action, new_value) VALUES (NEW.id, 'completed', NEW.title);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS todos_log_activity ON todos;
CREATE TRIGGER todos_log_activity AFTER INSERT OR UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION log_todo_activity();

-- =============================================================================
-- REALTIME
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE todos;

-- =============================================================================
-- SEED — Default daily habits (SRN practice routine)
-- =============================================================================
INSERT INTO daily_habits (name, icon, color, sort_order) VALUES
  ('Python Coding',    '🐍', '#3B82F6', 1),
  ('SQL Practice',     '🗄️', '#8B5CF6', 2),
  ('ML Concept',       '🧠', '#10B981', 3),
  ('English Speaking', '🗣️', '#F59E0B', 4),
  ('LeetCode',         '⚡', '#EF4444', 5),
  ('Read/Research',    '📚', '#06B6D4', 6)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SEED — Initial decisions
-- =============================================================================
INSERT INTO decisions (decision, reasoning, expected_outcome, category, status, review_date)
VALUES
  (
    'Pivot career toward ML/Data Science',
    'Strong market demand + genuine interest in AI + existing technical foundation from Power BI',
    'Land 20+ LPA role at Google/Microsoft/Amazon within 18 months',
    'career', 'active', CURRENT_DATE + INTERVAL '30 days'
  ),
  (
    'Use Next.js + Supabase for SRN Command Center',
    'Modern stack with realtime support, good for portfolio, widely used in industry',
    'Working production-grade dashboard demonstrating full-stack skills',
    'technical', 'active', CURRENT_DATE + INTERVAL '30 days'
  ),
  (
    'Focus on healthcare ML projects for differentiation',
    'Domain expertise differentiator + meaningful impact + strong demand',
    'Portfolio projects that stand out from generic ML work',
    'project', 'active', CURRENT_DATE + INTERVAL '30 days'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SEED — 11 ML portfolio projects (run ds-projects-seed.sql separately
--         OR uncomment and include here)
-- =============================================================================
-- \i ds-projects-seed.sql

-- =============================================================================
-- END OF MASTER SQL v10
-- =============================================================================
