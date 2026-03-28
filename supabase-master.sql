-- =============================================================================
-- SRN Command Center — Supabase Master SQL (v9)
-- Run this once on a fresh Supabase project to set up the full schema.
-- Last updated: 2026-03-26
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TODOS (main task table)
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
  event_type  text NOT NULL,   -- created | status_changed | completed | deleted
  old_value   text,
  new_value   text,
  note        text,
  created_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- 4. TASK TEMPLATES
-- =============================================================================
CREATE TABLE IF NOT EXISTS task_templates (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            text NOT NULL,
  title           text NOT NULL,
  description     text DEFAULT '',
  priority        text DEFAULT 'medium',
  category        text DEFAULT 'general',
  estimated_mins  int DEFAULT NULL,
  tags            text[] DEFAULT '{}'::text[],
  resource_links  jsonb DEFAULT '[]'::jsonb,
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
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id    uuid NOT NULL REFERENCES daily_habits(id) ON DELETE CASCADE,
  log_date    date NOT NULL DEFAULT CURRENT_DATE,
  completed   boolean DEFAULT false,
  note        text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(habit_id, log_date)
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
  category    text DEFAULT 'general',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- =============================================================================
-- 8. FOCUS SESSIONS (Pomodoro)
-- =============================================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  todo_id       uuid REFERENCES todos(id) ON DELETE SET NULL,
  duration_mins int NOT NULL,
  started_at    timestamptz DEFAULT now(),
  ended_at      timestamptz,
  completed     boolean DEFAULT false,
  note          text
);

-- =============================================================================
-- 9. WEEKLY REVIEWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start      date NOT NULL,
  tasks_done      int DEFAULT 0,
  habits_done     int DEFAULT 0,
  focus_mins      int DEFAULT 0,
  reflection      text DEFAULT '',
  wins            text DEFAULT '',
  improvements    text DEFAULT '',
  next_week_goals text DEFAULT '',
  mood_score      int CHECK (mood_score BETWEEN 1 AND 10),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(week_start)
);

-- =============================================================================
-- 10. PROJECTS (ML portfolio tracker)
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            text NOT NULL,
  description     text DEFAULT '',
  status          text DEFAULT 'planning'
                  CHECK (status IN ('planning','in_progress','paused','completed','archived')),
  domain          text DEFAULT 'general',
  tech_stack      text[] DEFAULT '{}'::text[],
  github_url      text,
  demo_url        text,
  progress_pct    int DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  target_date     date,
  is_featured     boolean DEFAULT false,
  notes           text DEFAULT '',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- =============================================================================
-- 11. DECISIONS (NEW — v9)
-- Strategic decisions log with review system
-- =============================================================================
CREATE TABLE IF NOT EXISTS decisions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            text NOT NULL,
  context          text DEFAULT '',          -- What problem / situation prompted this decision
  decision         text NOT NULL,            -- The actual decision made
  reasoning        text DEFAULT '',          -- Why this decision was made
  alternatives     text DEFAULT '',          -- What other options were considered
  expected_outcome text DEFAULT '',          -- What success looks like
  category         text DEFAULT 'general'
                   CHECK (category IN (
                     'career','technical','project','learning',
                     'financial','personal','general'
                   )),
  status           text DEFAULT 'active'
                   CHECK (status IN ('active','reviewing','revised','reversed','completed')),
  impact_level     text DEFAULT 'medium'
                   CHECK (impact_level IN ('critical','high','medium','low')),
  tags             text[] DEFAULT '{}'::text[],
  review_date      date,                     -- When to review this decision
  review_flag      boolean DEFAULT false,    -- Flagged for immediate review
  review_notes     text DEFAULT '',          -- Notes added during review
  reviewed_at      timestamptz,              -- When it was last reviewed
  decided_at       date DEFAULT CURRENT_DATE,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Index for quick upcoming-review queries
CREATE INDEX IF NOT EXISTS idx_decisions_review_date ON decisions(review_date);
CREATE INDEX IF NOT EXISTS idx_decisions_status      ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_category    ON decisions(category);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Helper: generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at on todos
DROP TRIGGER IF EXISTS todos_updated_at ON todos;
CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- updated_at on subtasks
DROP TRIGGER IF EXISTS subtasks_updated_at ON subtasks;
CREATE TRIGGER subtasks_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- updated_at on notes
DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- updated_at on projects
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- updated_at on decisions
DROP TRIGGER IF EXISTS decisions_updated_at ON decisions;
CREATE TRIGGER decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set completed_at when todo status becomes 'done'
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
CREATE TRIGGER todos_set_completed_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION set_completed_at();

-- Log activity when todo is created or status changes
CREATE OR REPLACE FUNCTION log_todo_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log(todo_id, event_type, new_value)
    VALUES (NEW.id, 'created', NEW.title);
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO activity_log(todo_id, event_type, old_value, new_value)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status);
    IF NEW.status = 'done' THEN
      INSERT INTO activity_log(todo_id, event_type, new_value)
      VALUES (NEW.id, 'completed', NEW.title);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS todos_log_activity ON todos;
CREATE TRIGGER todos_log_activity
  AFTER INSERT OR UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION log_todo_activity();

-- =============================================================================
-- REALTIME
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE todos;

-- =============================================================================
-- SEED DATA — Default habits (SRN daily practice)
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
-- SEED DATA — Initial decisions (migrated from decisions.csv)
-- =============================================================================
INSERT INTO decisions (
  title, decision, reasoning, expected_outcome,
  category, impact_level, review_date, decided_at
) VALUES
  (
    'Career Pivot to ML/Data Science',
    'Pivot career toward ML/Data Science',
    'Strong market demand + genuine interest in AI + existing technical foundation from Power BI',
    'Land 20+ LPA role at Google/Microsoft/Amazon within 18 months',
    'career', 'critical', '2026-04-24', '2026-03-25'
  ),
  (
    'Dashboard Tech Stack',
    'Use Next.js + Supabase for dashboard',
    'Modern stack with realtime support + good for portfolio + widely used in industry',
    'Working production-grade dashboard demonstrating full-stack skills',
    'technical', 'high', '2026-04-24', '2026-03-25'
  ),
  (
    'Healthcare ML Project Focus',
    'Focus on healthcare ML projects',
    'Domain expertise differentiator + meaningful impact + strong demand in industry',
    'Portfolio projects that stand out from generic ML work',
    'project', 'high', '2026-04-24', '2026-03-25'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- END OF MASTER SQL v9
-- Tables: todos, subtasks, activity_log, task_templates, daily_habits,
--         habit_log, notes, focus_sessions, weekly_reviews, projects, decisions
-- =============================================================================
