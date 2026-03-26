-- ╔══════════════════════════════════════════════════════════════╗
-- ║     SRN COMMAND CENTER — COMPLETE MASTER SQL                 ║
-- ║     Version: v8 (Final)                                      ║
-- ║     Last updated: 2026-03-26                                 ║
-- ║                                                              ║
-- ║  Run this ONCE on a fresh Supabase project.                  ║
-- ║  Safe to re-run — uses IF NOT EXISTS everywhere.             ║
-- ║                                                              ║
-- ║  Tables created:                                             ║
-- ║    1. todos           — core task list (v8: links/tags)      ║
-- ║    2. subtasks        — checklist items per task             ║
-- ║    3. activity_log    — audit log of status changes          ║
-- ║    4. task_templates  — reusable recurring task templates    ║
-- ║    5. daily_habits    — habit definitions                    ║
-- ║    6. habit_log       — daily habit completion records       ║
-- ║    7. notes           — ML knowledge base                    ║
-- ║    8. focus_sessions  — pomodoro timer records               ║
-- ║    9. weekly_reviews  — weekly reflection entries            ║
-- ║   10. projects        — ML portfolio projects                ║
-- ╚══════════════════════════════════════════════════════════════╝


-- ══════════════════════════════════════════════════════════════
-- SECTION 1: TODOS (Core — includes all v8 columns)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS todos (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT        NOT NULL,
  description     TEXT        DEFAULT '',
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'done', 'blocked')),
  priority        TEXT        NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assigned_agent  TEXT        DEFAULT 'unassigned',
  due_date        DATE        DEFAULT NULL,
  completed_at    TIMESTAMPTZ DEFAULT NULL,
  sort_order      INTEGER     DEFAULT 0,
  category        TEXT        DEFAULT 'general'
                    CHECK (category IN ('learning', 'project', 'interview-prep', 'work', 'personal', 'general')),
  -- v8: Resource links stored as JSONB array [{title, url, type}]
  -- type: article | video | github | doc | tool | course | other
  resource_links  JSONB       DEFAULT '[]'::jsonb,
  -- v8: Tags stored as text array e.g. ['python', 'ml', 'sql']
  tags            TEXT[]      DEFAULT ARRAY[]::text[],
  -- v8: Estimated time in minutes (15/30/60/120/240/480)
  estimated_mins  INTEGER     DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'todos' AND policyname = 'Allow all on todos'
  ) THEN
    CREATE POLICY "Allow all on todos" ON todos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable realtime on todos
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE todos;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON todos;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ══════════════════════════════════════════════════════════════
-- SECTION 2: SUBTASKS (checklist items per task)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subtasks (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id     UUID    NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  is_done     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subtasks' AND policyname = 'Allow all on subtasks'
  ) THEN
    CREATE POLICY "Allow all on subtasks" ON subtasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- SECTION 3: ACTIVITY LOG (audit trail)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id     UUID REFERENCES todos(id) ON DELETE SET NULL,
  action      TEXT NOT NULL
                CHECK (action IN ('created', 'status_changed', 'completed', 'deleted')),
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'Allow all on activity_log'
  ) THEN
    CREATE POLICY "Allow all on activity_log" ON activity_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- SECTION 4: TRIGGERS (hotfix-safe split version)
-- ══════════════════════════════════════════════════════════════

-- Clean up any old broken trigger/function from early versions
DROP TRIGGER IF EXISTS log_todo_changes_trigger    ON todos;
DROP TRIGGER IF EXISTS set_completed_at_trigger    ON todos;
DROP TRIGGER IF EXISTS log_todo_activity_trigger   ON todos;
DROP FUNCTION IF EXISTS log_todo_changes();
DROP FUNCTION IF EXISTS set_completed_at();
DROP FUNCTION IF EXISTS log_todo_activity();

-- Trigger 1: BEFORE UPDATE — sets completed_at when status → done
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
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

-- Trigger 2: AFTER INSERT/UPDATE — writes to activity_log
-- (must be AFTER so the todo row exists when FK resolves)
CREATE OR REPLACE FUNCTION log_todo_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (todo_id, action, new_value)
    VALUES (NEW.id, 'created', NEW.title);
  ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
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


-- ══════════════════════════════════════════════════════════════
-- SECTION 5: TASK TEMPLATES (reusable / recurring)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS task_templates (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT    NOT NULL,
  description     TEXT    DEFAULT '',
  priority        TEXT    NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assigned_agent  TEXT    DEFAULT 'unassigned',
  recurrence      TEXT    DEFAULT NULL
                    CHECK (recurrence IN ('daily', 'weekly', 'monthly', NULL)),
  is_active       BOOLEAN DEFAULT true,
  last_created_at TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Allow all on task_templates'
  ) THEN
    CREATE POLICY "Allow all on task_templates" ON task_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed templates
INSERT INTO task_templates (title, description, priority, assigned_agent, recurrence) VALUES
  ('Daily standup notes',    'Write standup update for the team',       'medium', 'developer', 'daily'),
  ('Weekly code review',     'Review open PRs and provide feedback',     'high',   'developer', 'weekly'),
  ('Monthly retrospective',  'Team retrospective meeting prep',          'medium', 'developer', 'monthly')
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- SECTION 6: DAILY HABITS (streak tracker)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS daily_habits (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT    NOT NULL,
  icon        TEXT    DEFAULT '',
  color       TEXT    DEFAULT '#6ee7b7',
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'daily_habits' AND policyname = 'Allow all on daily_habits'
  ) THEN
    CREATE POLICY "Allow all on daily_habits" ON daily_habits FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed SRN's default career habits
INSERT INTO daily_habits (name, icon, color, sort_order) VALUES
  ('Python practice',  'P', '#3b82f6', 0),
  ('SQL practice',     'S', '#f59e0b', 1),
  ('ML concept',       'M', '#8b5cf6', 2),
  ('English speaking', 'E', '#10b981', 3)
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- SECTION 7: HABIT LOG (one row per habit per day)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS habit_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id       UUID NOT NULL REFERENCES daily_habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (habit_id, completed_date)
);

ALTER TABLE habit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'habit_log' AND policyname = 'Allow all on habit_log'
  ) THEN
    CREATE POLICY "Allow all on habit_log" ON habit_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- SECTION 8: NOTES (ML knowledge base)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notes (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT    NOT NULL,
  content     TEXT    DEFAULT '',
  tags        TEXT[]  DEFAULT '{}',
  is_pinned   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Allow all on notes'
  ) THEN
    CREATE POLICY "Allow all on notes" ON notes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_timestamp();


-- ══════════════════════════════════════════════════════════════
-- SECTION 9: FOCUS SESSIONS (Pomodoro timer)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS focus_sessions (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id          UUID    REFERENCES todos(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  completed        BOOLEAN DEFAULT false,
  started_at       TIMESTAMPTZ DEFAULT now(),
  ended_at         TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Allow all on focus_sessions'
  ) THEN
    CREATE POLICY "Allow all on focus_sessions" ON focus_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- SECTION 10: WEEKLY REVIEWS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start       DATE    NOT NULL,
  tasks_completed  INTEGER DEFAULT 0,
  focus_minutes    INTEGER DEFAULT 0,
  streak_days      INTEGER DEFAULT 0,
  reflection       TEXT    DEFAULT '',
  goals_next_week  TEXT    DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (week_start)
);

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weekly_reviews' AND policyname = 'Allow all on weekly_reviews'
  ) THEN
    CREATE POLICY "Allow all on weekly_reviews" ON weekly_reviews FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- SECTION 11: PROJECTS (ML portfolio tracker)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projects (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT    NOT NULL,
  description  TEXT    DEFAULT '',
  category     TEXT    DEFAULT 'general',
  tech         TEXT[]  DEFAULT '{}',
  status       TEXT    DEFAULT 'planning'
                 CHECK (status IN ('planning', 'in-progress', 'completed', 'deployed')),
  progress     INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  github_url   TEXT    DEFAULT '',
  live_url     TEXT    DEFAULT '',
  highlights   TEXT[]  DEFAULT '{}',
  start_date   DATE    DEFAULT NULL,
  end_date     DATE    DEFAULT NULL,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow all on projects'
  ) THEN
    CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_projects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_timestamp();

-- Seed 6 ML portfolio projects
INSERT INTO projects (title, description, category, tech, status, progress, highlights, sort_order)
VALUES
  (
    'Healthcare Disease Prediction',
    'ML pipeline for predicting diseases from patient symptoms. Classification models with explainability.',
    'Healthcare ML',
    ARRAY['Python','Scikit-learn','XGBoost','SHAP','FastAPI','Docker'],
    'planning', 0,
    ARRAY['Multi-class classification','Feature engineering','SHAP explainability','REST API deployment'],
    0
  ),
  (
    'Sentiment Analysis Engine',
    'NLP model for analyzing product reviews and social media sentiment. Fine-tuned transformer.',
    'NLP',
    ARRAY['Python','HuggingFace','PyTorch','NLTK','Streamlit'],
    'planning', 0,
    ARRAY['Text preprocessing pipeline','Fine-tuned BERT','Multi-language support','Streamlit demo'],
    1
  ),
  (
    'Image Classification System',
    'CNN-based image classifier with transfer learning. Custom dataset, augmentation, training, deployment.',
    'Computer Vision',
    ARRAY['Python','PyTorch','torchvision','OpenCV','Gradio'],
    'planning', 0,
    ARRAY['Transfer learning','Data augmentation','Grad-CAM visualizations','Gradio web demo'],
    2
  ),
  (
    'Movie Recommendation System',
    'Collaborative + content-based hybrid recommender. Matrix factorization and neural collaborative filtering.',
    'RecSys',
    ARRAY['Python','Surprise','TensorFlow','Pandas','FastAPI'],
    'planning', 0,
    ARRAY['Collaborative filtering','Content-based TF-IDF','Hybrid ensemble','Cold start handling'],
    3
  ),
  (
    'Stock Price Forecasting',
    'Time series prediction using LSTM, Prophet, and statistical models with backtesting framework.',
    'Time Series',
    ARRAY['Python','TensorFlow','Prophet','statsmodels','Plotly'],
    'planning', 0,
    ARRAY['ARIMA vs LSTM comparison','Technical indicators','Backtesting framework','Interactive dashboard'],
    4
  ),
  (
    'End-to-End MLOps Pipeline',
    'Production ML pipeline with experiment tracking, model registry, CI/CD, monitoring, drift detection.',
    'MLOps',
    ARRAY['Python','MLflow','DVC','Docker','GitHub Actions','AWS'],
    'planning', 0,
    ARRAY['MLflow tracking','DVC versioning','CI/CD pipeline','Drift detection'],
    5
  )
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- SECTION 12: INDEXES (performance)
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_todos_status        ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_priority      ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_agent         ON todos(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_todos_updated_at    ON todos(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_due           ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_tags          ON todos USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_todos_links         ON todos USING GIN (resource_links);
CREATE INDEX IF NOT EXISTS idx_activity_created    ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action     ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_habit_log_date      ON habit_log(completed_date DESC);
CREATE INDEX IF NOT EXISTS idx_focus_started       ON focus_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_pinned        ON notes(is_pinned DESC, updated_at DESC);


-- ══════════════════════════════════════════════════════════════
-- SECTION 13: SEED SAMPLE TASKS (optional — remove if unwanted)
-- ══════════════════════════════════════════════════════════════

INSERT INTO todos (title, description, status, priority, assigned_agent, category, tags, estimated_mins)
VALUES
  ('Python OOP practice',        'Classes, decorators, context managers', 'pending',     'medium', 'srn', 'learning',      ARRAY['python','practice'],        60),
  ('SQL window functions',        'RANK, DENSE_RANK, LAG, LEAD',          'in_progress', 'high',   'srn', 'interview-prep', ARRAY['sql','interview'],          45),
  ('Read ML paper: Attention',    'Attention is all you need — Vaswani',  'pending',     'high',   'srn', 'learning',       ARRAY['ml','deep-learning'],       90),
  ('Set up MLflow locally',       'Experiment tracking setup',            'pending',     'medium', 'srn', 'project',        ARRAY['mlops','python'],           30),
  ('Mock interview — DS round',   'Practice case study questions',        'pending',     'critical','srn','interview-prep', ARRAY['interview','system-design'],120),
  ('Update Power BI dashboard',   'Q1 metrics refresh',                  'in_progress', 'medium', 'srn', 'work',           ARRAY['power-bi'],                 60)
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- ✅ SETUP COMPLETE
-- Tables: todos, subtasks, activity_log, task_templates,
--         daily_habits, habit_log, notes, focus_sessions,
--         weekly_reviews, projects
-- Triggers: set_completed_at, log_todo_activity,
--           update_updated_at, notes_updated_at, projects_updated_at
-- Realtime: todos
-- ══════════════════════════════════════════════════════════════
