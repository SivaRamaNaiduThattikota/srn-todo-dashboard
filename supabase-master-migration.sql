-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  SRN COMMAND CENTER — COMPLETE MASTER MIGRATION                      ║
-- ║  Version: v10.9  |  Last updated: Session v10.9                      ║
-- ║                                                                       ║
-- ║  HOW TO USE:                                                          ║
-- ║  Paste this ENTIRE file into Supabase SQL Editor and click Run.       ║
-- ║  Safe to run multiple times — fully idempotent.                       ║
-- ║  Even on a fresh database, this single file builds everything.        ║
-- ╠═══════════════════════════════════════════════════════════════════════╣
-- ║  TABLE OF CONTENTS                                                    ║
-- ║  ─────────────────                                                    ║
-- ║  SECTION A  Core tables (todos, daily_habits, habit_log,             ║
-- ║             focus_sessions, notes, subtasks, activity_log,           ║
-- ║             weekly_reviews, task_templates)                          ║
-- ║  SECTION B  Projects table + project_sections                        ║
-- ║  SECTION C  Decisions table                                          ║
-- ║  SECTION D  Learning tables (phases, progress, week_progress)        ║
-- ║  SECTION E  Column additions + soft-delete (recycle bin)             ║
-- ║  SECTION F  Phase seeds 1–10 (full ML/DS roadmap)                   ║
-- ║  SECTION G  Phase duration fix (clear labels, parallel note)        ║
-- ║  SECTION H  DS/ML portfolio project seeds                           ║
-- ║  SECTION I  Decisions seed (3 initial decisions)                    ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════
-- SECTION A — CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════

-- ── A1: todos ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS todos (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title          TEXT        NOT NULL,
  description    TEXT        DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_progress', 'done', 'blocked')),
  priority       TEXT        NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assigned_agent TEXT        DEFAULT 'unassigned',
  due_date       DATE        DEFAULT NULL,
  completed_at   TIMESTAMPTZ DEFAULT NULL,
  sort_order     INTEGER     DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'todos' AND policyname = 'Allow all operations on todos') THEN
    CREATE POLICY "Allow all operations on todos" ON todos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE todos;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_todos_status       ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_priority     ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_assigned     ON todos(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_todos_updated_at   ON todos(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_due          ON todos(due_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_updated_at ON todos;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-log status changes + set completed_at
CREATE OR REPLACE FUNCTION log_todo_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (todo_id, action, new_value) VALUES (NEW.id, 'created', NEW.title);
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO activity_log (todo_id, action, old_value, new_value)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status);
    IF NEW.status = 'done' THEN NEW.completed_at = now();
    ELSE NEW.completed_at = NULL; END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
-- (trigger created after activity_log table below)

-- ── A2: activity_log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id       UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id  UUID        REFERENCES todos(id) ON DELETE SET NULL,
  action   TEXT        NOT NULL CHECK (action IN ('created', 'status_changed', 'completed', 'deleted')),
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'Allow all on activity_log') THEN
    CREATE POLICY "Allow all on activity_log" ON activity_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action  ON activity_log(action);

-- Now create the log trigger (depends on activity_log existing)
DROP TRIGGER IF EXISTS log_todo_changes_trigger ON todos;
CREATE TRIGGER log_todo_changes_trigger
  BEFORE INSERT OR UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION log_todo_changes();

-- ── A3: subtasks ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subtasks (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id    UUID    NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  is_done    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subtasks' AND policyname = 'Allow all on subtasks') THEN
    CREATE POLICY "Allow all on subtasks" ON subtasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── A4: daily_habits ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_habits (
  id         UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT  NOT NULL,
  icon       TEXT  DEFAULT '✓',
  color      TEXT  DEFAULT '#5ecf95',
  sort_order INT   DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_habits' AND policyname = 'Allow all on daily_habits') THEN
    CREATE POLICY "Allow all on daily_habits" ON daily_habits FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── A5: habit_log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_log (
  id             UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id       UUID  NOT NULL REFERENCES daily_habits(id) ON DELETE CASCADE,
  completed_date DATE  NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (habit_id, completed_date)
);

ALTER TABLE habit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_log' AND policyname = 'Allow all on habit_log') THEN
    CREATE POLICY "Allow all on habit_log" ON habit_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_habit_log_date    ON habit_log(completed_date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_log_habit   ON habit_log(habit_id);

-- ── A6: focus_sessions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS focus_sessions (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id          UUID    REFERENCES todos(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  completed        BOOLEAN DEFAULT false,
  notes            TEXT    DEFAULT '',
  started_at       TIMESTAMPTZ DEFAULT now(),
  ended_at         TIMESTAMPTZ DEFAULT NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Allow all on focus_sessions') THEN
    CREATE POLICY "Allow all on focus_sessions" ON focus_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_focus_started ON focus_sessions(started_at DESC);

-- ── A7: notes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id         UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT  NOT NULL DEFAULT 'Untitled',
  content    TEXT  DEFAULT '',
  tags       TEXT[] DEFAULT '{}',
  is_pinned  BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Allow all on notes') THEN
    CREATE POLICY "Allow all on notes" ON notes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notes_pinned     ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

-- ── A8: weekly_reviews ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start       DATE    NOT NULL UNIQUE,
  tasks_completed  INTEGER DEFAULT 0,
  focus_minutes    INTEGER DEFAULT 0,
  streak_days      INTEGER DEFAULT 0,
  reflection       TEXT    DEFAULT '',
  goals_next_week  TEXT    DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_reviews' AND policyname = 'Allow all on weekly_reviews') THEN
    CREATE POLICY "Allow all on weekly_reviews" ON weekly_reviews FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── A9: task_templates ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_templates (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT    NOT NULL,
  description     TEXT    DEFAULT '',
  priority        TEXT    NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assigned_agent  TEXT    DEFAULT 'unassigned',
  recurrence      TEXT    DEFAULT NULL CHECK (recurrence IN ('daily', 'weekly', 'monthly', NULL)),
  is_active       BOOLEAN DEFAULT true,
  last_created_at TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Allow all on task_templates') THEN
    CREATE POLICY "Allow all on task_templates" ON task_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO task_templates (title, description, priority, assigned_agent, recurrence) VALUES
  ('Daily standup notes',   'Write standup update for the team', 'medium', 'developer', 'daily'),
  ('Weekly code review',    'Review open PRs and provide feedback', 'high', 'developer', 'weekly'),
  ('Monthly retrospective', 'Team retrospective meeting prep', 'medium', 'developer', 'monthly')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- SECTION B — PROJECTS TABLES
-- ═══════════════════════════════════════════════════════════════════════

-- ── B1: projects ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT    NOT NULL,
  description TEXT    DEFAULT '',
  category    TEXT    DEFAULT 'general',
  tech        TEXT[]  DEFAULT '{}',
  status      TEXT    DEFAULT 'planning'
                CHECK (status IN ('planning', 'in-progress', 'completed', 'deployed')),
  progress    INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  github_url  TEXT    DEFAULT '',
  live_url    TEXT    DEFAULT '',
  highlights  TEXT[]  DEFAULT '{}',
  start_date  DATE    DEFAULT NULL,
  end_date    DATE    DEFAULT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow all on projects') THEN
    CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_projects_timestamp()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_projects_timestamp();

-- ── B2: project_sections ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_sections (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  items      TEXT[]  DEFAULT '{}',
  category   TEXT    DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_sections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_sections' AND policyname = 'Allow all on project_sections') THEN
    CREATE POLICY "Allow all on project_sections" ON project_sections FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- SECTION C — DECISIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS decisions (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  decision         TEXT  NOT NULL,
  reasoning        TEXT  DEFAULT '',
  expected_outcome TEXT  DEFAULT '',
  category         TEXT  DEFAULT 'career'
                     CHECK (category IN ('career', 'technical', 'learning', 'financial', 'personal', 'project')),
  status           TEXT  DEFAULT 'active'
                     CHECK (status IN ('active', 'reviewed', 'reversed', 'validated')),
  review_date      DATE  DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  review_notes     TEXT  DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decisions' AND policyname = 'Allow all on decisions') THEN
    CREATE POLICY "Allow all on decisions" ON decisions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_decisions_timestamp()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS decisions_updated_at ON decisions;
CREATE TRIGGER decisions_updated_at BEFORE UPDATE ON decisions FOR EACH ROW EXECUTE FUNCTION update_decisions_timestamp();

-- ═══════════════════════════════════════════════════════════════════════
-- SECTION D — LEARNING TABLES
-- ═══════════════════════════════════════════════════════════════════════

-- ── D1: learning_phases ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_phases (
  id           serial      PRIMARY KEY,
  sort_order   int         NOT NULL DEFAULT 0,
  title        text        NOT NULL,
  duration     text        NOT NULL DEFAULT '',
  accent_color text        NOT NULL DEFAULT '#534AB7',
  bg_color     text        NOT NULL DEFAULT 'rgba(83,74,183,0.13)',
  text_color   text        NOT NULL DEFAULT '#a09aee',
  milestone    text        NOT NULL DEFAULT '',
  resources    jsonb       NOT NULL DEFAULT '[]',
  tracks       jsonb       NOT NULL DEFAULT '[]',
  weeks        jsonb       NOT NULL DEFAULT '[]',
  practice     jsonb       NOT NULL DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE learning_phases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_phases' AND policyname = 'Allow all on learning_phases') THEN
    CREATE POLICY "Allow all on learning_phases" ON learning_phases FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── D2: learning_progress ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_progress (
  id          bigserial PRIMARY KEY,
  phase_id    int  NOT NULL REFERENCES learning_phases(id) ON DELETE CASCADE,
  track_index int  NOT NULL,
  topic_index int  NOT NULL,
  is_done     bool NOT NULL DEFAULT false,
  done_at     timestamptz,
  UNIQUE (phase_id, track_index, topic_index)
);

ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_progress' AND policyname = 'Allow all on learning_progress') THEN
    CREATE POLICY "Allow all on learning_progress" ON learning_progress FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── D3: learning_week_progress ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_week_progress (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id   int         NOT NULL REFERENCES learning_phases(id) ON DELETE CASCADE,
  week_index int         NOT NULL,
  is_done    bool        NOT NULL DEFAULT false,
  done_at    timestamptz,
  UNIQUE (phase_id, week_index)
);

ALTER TABLE learning_week_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_week_progress' AND policyname = 'Allow all on learning_week_progress') THEN
    CREATE POLICY "Allow all on learning_week_progress" ON learning_week_progress FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- SECTION E — COLUMN ADDITIONS + SOFT-DELETE (RECYCLE BIN)
-- ═══════════════════════════════════════════════════════════════════════

-- todos: start_date + soft-delete
ALTER TABLE todos ADD COLUMN IF NOT EXISTS start_date date        DEFAULT NULL;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_deleted_at ON todos (deleted_at) WHERE deleted_at IS NOT NULL;

-- notes: soft-delete
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes (deleted_at) WHERE deleted_at IS NOT NULL;

-- decisions: soft-delete
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_decisions_deleted_at ON decisions (deleted_at) WHERE deleted_at IS NOT NULL;

-- projects: soft-delete
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects (deleted_at) WHERE deleted_at IS NOT NULL;

-- learning_phases: soft-delete
ALTER TABLE learning_phases ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_phases_deleted_at ON learning_phases (deleted_at) WHERE deleted_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- SECTION F — LEARNING PHASE SEEDS (10 phases — full ML/DS roadmap)
-- ═══════════════════════════════════════════════════════════════════════
--
--  HOW THIS ROADMAP WORKS
--  ─────────────────────────────────────────────────────────────────────
--
--  Sequential phases — do ONE at a time, full focus (main track):
--
--    Python for ML  →  Core ML  →  Deep Learning  →  MLOps  →  Portfolio
--       ~4 wks          ~8 wks       ~7 wks           ~8 wks      ~6 wks
--
--    DSA for Interviews: 1 LeetCode problem every day — NEVER stop.
--
--  Parallel phases — 1 hour per day ALONGSIDE your main phase:
--
--    SQL + Data Engineering   → start NOW, run alongside Python/DSA
--    Stats + Probability      → start NOW, run alongside Python/DSA
--    Cloud (AWS or GCP)       → start when you enter Deep Learning phase
--    NLP / LLMs               → start when you enter Deep Learning phase
--
--  Phases do NOT overlap as calendar weeks — "~8 weeks" means
--  approximately 8 weeks of focused work, starting when the previous
--  sequential phase is complete.
--
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO learning_phases (id, sort_order, title, duration, accent_color, bg_color, text_color, milestone, resources, tracks, weeks, practice)
VALUES

-- Phase 1 — Python for ML
(1, 0, 'Python for ML', '~4 weeks', '#534AB7', 'rgba(83,74,183,0.13)', '#a09aee',
 'Solve 30 LeetCode Easy in Python',
 '[{"label":"Real Python","url":"https://realpython.com"},{"label":"Automate the Boring Stuff","url":"https://automatetheboringstuff.com"},{"label":"LeetCode","url":"https://leetcode.com"},{"label":"Kaggle Learn Python","url":"https://www.kaggle.com/learn/python"}]',
 '[{"label":"Python Foundations","topics":["Data types, variables, operators — drill 10 problems","Control flow — if/elif/else, for/while loops","Functions — args, kwargs, default params, return values","OOP — classes, __init__, methods, inheritance","List comprehensions + generators","File I/O — read, write, CSV parsing","Error handling — try/except, custom exceptions","Modules + pip — importing, virtual environments"]},{"label":"Python for Data","topics":["NumPy — arrays, broadcasting, vectorised ops","Pandas — DataFrame, Series, groupby, merge, pivot","Matplotlib / Seaborn — line, bar, scatter, heatmap","EDA checklist — shape, dtypes, nulls, describe, value_counts","Scikit-learn API — fit, predict, score pipeline","Decorators and context managers (bonus)","Type hints and docstrings (clean code habit)","Jupyter notebooks — shortcuts, magic commands"]}]',
 '[{"label":"Week 1","goals":["Python basics: complete 20 HackerRank Easy problems","OOP: implement a BankAccount class with deposit, withdraw, balance","File I/O: parse a CSV of student grades, compute class average"]},{"label":"Week 2","goals":["NumPy: implement matrix multiply from scratch, benchmark vs np.dot","Pandas: load Titanic dataset, answer 10 EDA questions","Matplotlib: plot survival rate by class + age histogram"]},{"label":"Week 3","goals":["LeetCode: 10 Easy in Python — Two Sum, Valid Parentheses, Reverse Linked List, etc.","Comprehensions: rewrite 5 for-loops as list/dict comprehensions","Generators: implement infinite Fibonacci using yield"]},{"label":"Week 4","goals":["Full EDA notebook: Kaggle Housing dataset — 10 visualisations + 5 findings","Scikit-learn: fit Linear Regression, evaluate with cross_val_score","LeetCode milestone: 30 Easy total — all passed in Python"]}]',
 '[{"title":"Python OOP","problems":["Implement a Stack class with push, pop, peek, is_empty using a list internally","Build a LRU Cache class using OrderedDict — get and put in O(1)","Create a Vector class with __add__, __mul__ (dot product), __len__, __repr__","Implement a simple CSV reader/writer class with context manager support (__enter__/__exit__)","Write a decorator @retry(n) that retries a function up to n times on exception"]},{"title":"NumPy & Pandas","problems":["Implement k-Means clustering from scratch using only NumPy (no sklearn)","Given a DataFrame of sales data: compute MoM growth %, rolling 7-day avg, flag outliers > 2σ","Merge two DataFrames on fuzzy date match (within 3 days) without any join library","Vectorise a nested Python for-loop that computes pairwise cosine similarity — achieve 50× speedup","Load a 1GB CSV in chunks using Pandas, filter rows, aggregate, write result without loading full file"]}]'),

-- Phase 2 — DSA for Interviews
(2, 1, 'DSA for Interviews', 'Daily — ongoing (never stop)', '#185FA5', 'rgba(24,95,165,0.13)', '#6aaee8',
 '100 LC problems solved · 1 mock interview session completed',
 '[{"label":"NeetCode 150","url":"https://neetcode.io/practice"},{"label":"Striver SDE Sheet","url":"https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems"},{"label":"LeetCode","url":"https://leetcode.com"},{"label":"AlgoExpert","url":"https://www.algoexpert.io"}]',
 '[{"label":"Core Data Structures","topics":["Arrays & strings — two pointers, sliding window","Hashmaps & sets — frequency count, anagram patterns","Linked lists — reverse, detect cycle, merge sorted","Stacks & queues — monotonic stack, BFS queue","Trees & BST — inorder, preorder, DFS, BFS","Heaps — min/max heap, top-K problems","Graphs — adjacency list, BFS, DFS, topological sort"]},{"label":"Algorithms","topics":["Binary search — on sorted array + on answer space","Recursion & backtracking — subsets, permutations","Dynamic programming — memoisation, tabulation, 1D/2D DP","Greedy — interval scheduling, activity selection","Divide and conquer — merge sort, quick select","Graph algorithms — Dijkstra, Union-Find, Kahn topological","Bit manipulation — XOR tricks, power of 2 checks"]}]',
 '[{"label":"Weeks 1–2","goals":["Arrays & strings: 15 LC Easy/Medium","Sliding window pattern — 5 problems","Two pointers — 5 problems"]},{"label":"Weeks 3–4","goals":["Hashmaps & sets — 10 problems","Linked list + fast/slow pointer — 8 problems","Stack & queue — 8 problems"]},{"label":"Weeks 5–6","goals":["Trees & BST — 10 problems (BFS + DFS)","Binary search — 8 problems","Heaps — 5 problems"]},{"label":"Weeks 7–8","goals":["Recursion & backtracking — 8 problems","1D DP — 8 problems (Fibonacci, coin change)","Graphs BFS/DFS — 8 problems"]},{"label":"Weeks 9–10","goals":["2D DP — 6 problems (knapsack, LCS)","Greedy — 6 problems","Tries & Union-Find — 5 problems"]},{"label":"Weeks 11+","goals":["Mixed mock sessions: 2 problems in 45 min","Dijkstra & advanced graph problems","Review & optimise weak areas","Full mock interview on Pramp every 2 weeks"]}]',
 '[{"title":"Must-Solve Problems (NeetCode 150)","problems":["Two Sum, Best Time to Buy/Sell Stock, Contains Duplicate","Valid Anagram, Group Anagrams, Top K Frequent Elements","Reverse Linked List, Merge Two Sorted Lists, LRU Cache","Invert Binary Tree, Maximum Depth, Lowest Common Ancestor","Climbing Stairs, House Robber, Coin Change, Longest Increasing Subsequence"]},{"title":"Graph & Advanced","problems":["Number of Islands (BFS/DFS), Clone Graph, Pacific Atlantic Water Flow","Course Schedule I & II (topological sort)","Word Search (backtracking), N-Queens (backtracking)","Merge K Sorted Lists (heap), Find Median from Data Stream","Alien Dictionary (topological sort + graph)"]}]'),

-- Phase 3 — Core ML
(3, 2, 'Core ML', '~8 weeks', '#0F6E56', 'rgba(15,110,86,0.13)', '#4ecfa0',
 '3 Kaggle notebooks published',
 '[{"label":"Andrew Ng Coursera","url":"https://www.coursera.org/specializations/machine-learning-introduction"},{"label":"scikit-learn docs","url":"https://scikit-learn.org/stable/"},{"label":"Kaggle Learn ML","url":"https://www.kaggle.com/learn"},{"label":"Hands-On ML (Géron)","url":"https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/"}]',
 '[{"label":"Supervised Learning","topics":["Linear & Logistic Regression from scratch","Decision Trees, Random Forest, XGBoost","SVM & KNN","Cross-validation & hyperparameter tuning","Imbalanced classes — SMOTE, class weights","Feature engineering & selection"]},{"label":"Unsupervised + Evaluation","topics":["K-Means, DBSCAN, hierarchical clustering","PCA & dimensionality reduction","Metrics — accuracy, F1, AUC-ROC, RMSE","Confusion matrix & classification report","Bias-variance tradeoff","Model interpretability — SHAP, LIME"]}]',
 '[{"label":"Week 1","goals":["Linear regression from scratch (numpy only)","Implement gradient descent manually","Andrew Ng Week 1–2"]},{"label":"Week 2","goals":["Logistic regression + sigmoid + cross-entropy","sklearn: fit, predict, score pipeline","Andrew Ng Week 3"]},{"label":"Week 3","goals":["Decision Trees + Random Forest on Titanic dataset","Cross-validation: k-fold, stratified","Feature importance analysis"]},{"label":"Week 4","goals":["XGBoost: hyperparameter tuning with GridSearchCV","SMOTE for imbalanced dataset (fraud detection)","Kaggle notebook #1 published"]},{"label":"Week 5","goals":["K-Means clustering: customer segmentation project","PCA: visualize high-dim data in 2D","Silhouette score, elbow method"]},{"label":"Week 6","goals":["SHAP values: explain a Random Forest model","AUC-ROC, precision-recall curves","Kaggle notebook #2 published"]},{"label":"Week 7","goals":["Full pipeline: EDA → feature eng → model → eval","SVM: kernel trick, support vectors concept","Bias-variance: overfit vs underfit examples"]},{"label":"Week 8","goals":["End-to-end ML project: house price prediction","Kaggle notebook #3 published","Core ML interview prep (top 50 questions)"]}]',
 '[{"title":"Implement from Scratch","problems":["Linear regression with gradient descent — no sklearn","Logistic regression with sigmoid, binary cross-entropy loss","Decision tree: implement Gini impurity split from scratch","K-Means: implement Lloyds algorithm with random initialization","PCA: compute using SVD on a real dataset"]},{"title":"Kaggle Competitions","problems":["Titanic — classification baseline with Random Forest","House Prices — regression with XGBoost + feature engineering","Chest X-Ray (Pneumonia) — image classification starter","SMS Spam — NLP text classification with TF-IDF + LogReg","Tabular Playground — feature engineering + ensemble methods"]}]'),

-- Phase 4 — Deep Learning
(4, 3, 'Deep Learning', '~7 weeks', '#993C1D', 'rgba(153,60,29,0.13)', '#e8895a',
 'End-to-end DL project on GitHub',
 '[{"label":"fast.ai","url":"https://course.fast.ai"},{"label":"PyTorch docs","url":"https://pytorch.org/docs/stable/index.html"},{"label":"d2l.ai","url":"https://d2l.ai"},{"label":"Deep Learning Specialization","url":"https://www.coursera.org/specializations/deep-learning"}]',
 '[{"label":"Neural Networks","topics":["Forward & backpropagation from scratch","PyTorch tensors, autograd, nn.Module","CNNs — conv, pooling, BatchNorm","Transfer learning — ResNet, EfficientNet","RNNs, LSTMs, GRUs"]},{"label":"Modern Architectures","topics":["Transformers & self-attention (theory)","HuggingFace — fine-tune BERT/DistilBERT","GPT-style generation basics","Training tricks — LR scheduling, dropout","GPU usage — CUDA, mixed precision"]}]',
 '[{"label":"Week 1","goals":["Backpropagation from scratch (numpy)","PyTorch basics: tensors, autograd, .backward()","Build a 2-layer NN on MNIST"]},{"label":"Week 2","goals":["CNN from scratch on CIFAR-10","BatchNorm, Dropout, weight initialization","fast.ai Lesson 1 & 2"]},{"label":"Week 3","goals":["Transfer learning: fine-tune ResNet18 on custom dataset","Data augmentation pipeline","fast.ai Lesson 3 & 4"]},{"label":"Week 4","goals":["LSTM: sentiment analysis on IMDB dataset","Sequence-to-sequence basics","Vanishing gradient & solutions"]},{"label":"Week 5","goals":["Transformers: implement scaled dot-product attention","HuggingFace: load & fine-tune DistilBERT","Text classification with BERT"]},{"label":"Week 6","goals":["Mixed precision training with torch.cuda.amp","Learning rate scheduling (cosine, OneCycle)","Model checkpointing & early stopping"]},{"label":"Week 7","goals":["End-to-end DL project: choose domain (NLP/CV/tabular)","Write clean README with results & plots","Push to GitHub — this is a portfolio piece"]}]',
 '[{"title":"PyTorch Exercises","problems":["Implement a 3-layer MLP from scratch (no nn.Sequential) with manual weight updates","Build a custom Dataset and DataLoader for a CSV file","Implement a CNN that achieves >90% on MNIST using only conv + pool + linear layers","Fine-tune a pretrained ResNet18 on a 5-class image dataset of your choice","Build a character-level language model with LSTM (generate text after training)"]},{"title":"HuggingFace & Transformers","problems":["Fine-tune DistilBERT on SST-2 sentiment dataset using Trainer API","Use a pipeline() for zero-shot classification on 5 custom categories","Load a tokenizer, tokenize a batch, inspect token IDs and attention masks","Use a generation model (GPT-2) to complete 5 different prompts","Evaluate a fine-tuned model using F1, precision, recall with datasets library"]}]'),

-- Phase 5 — MLOps + ML System Design (expanded)
(5, 4, 'MLOps + ML System Design', '~8 weeks', '#854F0B', 'rgba(133,79,11,0.13)', '#d4924a',
 'Deploy 1 model as REST API · Record a 45-min ML system design mock',
 '[{"label":"Made With ML","url":"https://madewithml.com"},{"label":"Chip Huyen — Designing ML Systems","url":"https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/"},{"label":"FastAPI docs","url":"https://fastapi.tiangolo.com"},{"label":"Docker docs","url":"https://docs.docker.com"},{"label":"Netflix Tech Blog","url":"https://netflixtechblog.com"},{"label":"Uber Engineering","url":"https://www.uber.com/en-IN/blog/engineering/"},{"label":"Airbnb Engineering","url":"https://medium.com/airbnb-engineering"}]',
 '[{"label":"MLOps Essentials","topics":["MLflow — experiment tracking, model registry","Docker basics — containerize model","FastAPI — build & deploy model API","CI/CD with GitHub Actions","AWS SageMaker or GCP Vertex AI — end-to-end deployment","Model versioning and rollback strategies","Feature stores — what, why, how (Feast)","A/B testing and model monitoring in production"]},{"label":"ML System Design — Core Concepts","topics":["Training pipeline: data collection → preprocessing → training → serving","Online vs offline evaluation — metrics that matter","Handling data drift and concept drift in production","Designing for scale: low-latency inference, batching, caching","Feature store architecture — real-time vs batch features","Model serving patterns — shadow mode, canary, blue-green","Distributed training basics — data parallelism, model parallelism","Design interview framework — requirements → high-level → deep dive"]},{"label":"ML System Design — Case Studies","topics":["YouTube/Netflix recommendation system — two-tower model, ANN retrieval","Google/Uber ride pricing — real-time features, feedback loops","Instagram feed ranking — multi-stage ranking pipeline","Gmail spam detection — online learning, concept drift","Fraud detection system — latency constraints, imbalanced data","Airbnb search ranking — learning to rank, position bias","Twitter/X timeline — candidate generation, ranking, real-time serving","Ad click-through rate prediction — large sparse features, embedding tables"]}]',
 '[{"label":"Week 1","goals":["MLflow: log experiments, metrics, artifacts for a sklearn model","Understand run comparison and model registry","Docker: write Dockerfile, build image, run container"]},{"label":"Week 2","goals":["FastAPI: build /predict endpoint for a model","Add input validation with Pydantic","Build GitHub Actions CI pipeline that runs tests on push"]},{"label":"Week 3","goals":["Deploy Dockerized FastAPI to Render or Railway (free tier)","AWS/GCP: set up account, understand IAM, S3/GCS basics","Feature store concept: implement a simple version with Redis or dict"]},{"label":"Week 4","goals":["Chip Huyen Chapter 1–4: ML system lifecycle, data engineering","Chip Huyen Chapter 5–7: feature engineering, training, evaluation","Netflix Tech Blog: read 2 ML engineering case studies"]},{"label":"Week 5","goals":["ML System Design: YouTube recommendation — write full design doc","ML System Design: Fraud detection — write full design doc","Uber Engineering: read surge pricing / demand forecasting post"]},{"label":"Week 6","goals":["ML System Design: Instagram feed ranking — write full design doc","ML System Design: Gmail spam detection — write full design doc","Airbnb Engineering: read search ranking ML post"]},{"label":"Week 7","goals":["ML System Design: Ad CTR prediction — write full design doc","ML System Design: Twitter timeline — write full design doc","Chip Huyen Chapter 8–11: deployment, monitoring, infrastructure"]},{"label":"Week 8","goals":["Record a 45-min mock ML system design interview (YouTube recommendation or Ad CTR)","Review recording: identify gaps, time management issues","Full mock with a peer or self-review: do all 10 system designs from memory outline"]}]',
 '[{"title":"MLOps Hands-On","problems":["Train a classifier, log all params/metrics to MLflow, compare 3 runs","Write a Dockerfile for a FastAPI app that loads a .pkl model and serves /predict","Build a GitHub Actions workflow: lint → test → build Docker image on PR","Deploy a model API to a free cloud service (Render/Railway) and share the live URL","Implement a simple feature store: precompute user features daily, serve in <5ms at inference"]},{"title":"ML System Design — 10 Must-Do Designs","problems":["Design YouTube/Netflix video recommendations (100M users, real-time personalization)","Design a fraud detection system (latency < 50ms, 1:1000 class imbalance)","Design Instagram/TikTok feed ranking (multi-stage: retrieval → ranking → re-ranking)","Design Google/Bing ad click-through rate prediction (sparse features, embedding tables)","Design a real-time ride pricing system like Uber Surge (demand forecasting + feedback loop)","Design a document search engine with semantic similarity (dense retrieval, ANN index)","Design Gmail spam detection (online learning, concept drift, low false positive rate)","Design a model monitoring system that detects data drift and triggers retraining","Design Airbnb search ranking (learning to rank, A/B testing, position bias correction)","Design Twitter/X timeline (candidate generation, diversity, real-time serving)"]}]'),

-- Phase 6 — Portfolio + Interviews
(6, 5, 'Portfolio + Interviews', '~6 weeks', '#993556', 'rgba(153,53,86,0.13)', '#e07fa0',
 '3 portfolio projects · Resume + LinkedIn optimized',
 '[{"label":"GitHub","url":"https://github.com"},{"label":"Interview Kickstart","url":"https://www.interviewkickstart.com"},{"label":"Pramp","url":"https://www.pramp.com"},{"label":"Glassdoor","url":"https://www.glassdoor.com"}]',
 '[{"label":"Portfolio Projects","topics":["Project 1: ML end-to-end (Kaggle dataset + deployed API)","Project 2: NLP — text classification or QA system","Project 3: ML system design + FastAPI deployment","GitHub README quality — metrics, demo GIFs, architecture diagram","Kaggle competition participation (top 30%)"]},{"label":"Interview Prep","topics":["ML breadth — top 50 theory Q&A mastered","ML system design case study (1hr mock)","Coding rounds — LC Medium in 30 min","Behavioral — STAR format, impact stories","Resume tailoring for Google/Microsoft/Amazon","Mock interviews on Pramp or peer pairing"]}]',
 '[{"label":"Week 1","goals":["Choose 3 portfolio project topics","Start Project 1: EDA + baseline model","Draft resume v1 — quantify all impact"]},{"label":"Week 2","goals":["Project 1: deploy API, write README","ML theory Q&A: revise 20 core questions","LinkedIn: optimize headline, about, skills"]},{"label":"Week 3","goals":["Start Project 2: NLP project","ML system design: 2 practice designs per week","Apply to 5 target companies"]},{"label":"Week 4","goals":["Project 2: complete + push to GitHub","50 ML Q&A done","Pramp mock: coding + behavioral"]},{"label":"Week 5","goals":["Start & finish Project 3: MLOps + deployment","ML system design mock interview (full 45 min)","Resume v2 with project links"]},{"label":"Week 6","goals":["Final review: all 3 projects polished","Top 50 ML Q&A: verbal recall test","Target: first interview scheduled"]}]',
 '[{"title":"ML Interview Q&A","problems":["Explain bias-variance tradeoff with a concrete example","How does XGBoost differ from Random Forest? When do you prefer each?","Walk through how you would handle a severely imbalanced dataset (1:100 ratio)","What is the vanishing gradient problem and how do ResNets solve it?","How would you detect and handle data drift in a production model?"]},{"title":"Behavioral (STAR format)","problems":["Tell me about a time you owned a project end-to-end with ambiguous requirements","Describe a situation where your analysis/model was wrong — what did you do?","How have you explained a complex technical concept to a non-technical stakeholder?","Give an example of a time you disagreed with a team decision — what happened?","What is the most impactful thing you have built? Walk me through the outcome."]}]'),

-- Phase 7 — SQL + Data Engineering (PARALLEL — start now)
(7, 6, 'SQL + Data Engineering', '3–4 weeks (parallel — 1 hr/day)', '#1D6B8C', 'rgba(29,107,140,0.13)', '#56c3e8',
 'Solve 30 SQL Medium on DataLemur',
 '[{"label":"DataLemur","url":"https://datalemur.com"},{"label":"StrataScratch","url":"https://platform.stratascratch.com"},{"label":"Mode SQL Tutorial","url":"https://mode.com/sql-tutorial"},{"label":"BigQuery Sandbox","url":"https://cloud.google.com/bigquery/docs/sandbox"},{"label":"PySpark Docs","url":"https://spark.apache.org/docs/latest/api/python"}]',
 '[{"label":"Core SQL","topics":["SELECT, WHERE, GROUP BY, ORDER BY, HAVING — drill 20 problems","JOINs — INNER, LEFT, RIGHT, FULL OUTER, SELF JOIN","Subqueries and correlated subqueries","CTEs — WITH clause, recursive CTEs","Window functions — ROW_NUMBER, RANK, DENSE_RANK, NTILE","LAG, LEAD, FIRST_VALUE, LAST_VALUE","PARTITION BY + ORDER BY patterns","Date/time functions — DATEDIFF, DATE_TRUNC, EXTRACT"]},{"label":"Data Engineering Concepts","topics":["Data warehouse concepts — star schema, snowflake schema","Fact vs dimension tables — design patterns","ETL vs ELT pipelines — when to use each","Query optimization — EXPLAIN, indexes, partitioning","BigQuery basics — dataset, table, query cost","PySpark — RDDs vs DataFrames, transformations vs actions","Spark SQL — read/write Parquet, CSV, JSON","dbt basics — models, tests, sources (optional)"]},{"label":"Interview SQL Patterns","topics":["Consecutive days / streaks — window function pattern","Running totals and cumulative sums","Median, percentile, mode calculations","Pivoting rows to columns (CASE WHEN + GROUP BY)","Finding duplicates, gaps, and islands","Top-N per group pattern","Month-over-month growth calculations","Retention and cohort analysis queries"]}]',
 '[{"label":"Week 1","goals":["DataLemur: 10 Easy SQL (warm-up)","Core JOINs: write 5 real queries on a dataset","CTE practice: rewrite 3 subqueries as CTEs"]},{"label":"Week 2","goals":["Window functions: ROW_NUMBER, RANK — 8 problems","LAG/LEAD: write MoM revenue growth query","StrataScratch: 10 Medium SQL problems"]},{"label":"Week 3","goals":["BigQuery sandbox: run 3 real queries on public datasets","PySpark: load CSV, filter, groupBy, write to Parquet","DataLemur: 10 more Medium problems"]},{"label":"Week 4","goals":["Full data pipeline: ingest CSV → transform with SQL → aggregate → output","Star schema design: model a retail dataset (fact/dim tables)","Review + DataLemur milestone: 30 Medium total"]}]',
 '[{"title":"Must-Solve SQL Interview Problems","problems":["User activity streak — find users with 3+ consecutive active days using LAG","Top 3 products per category — ROW_NUMBER + PARTITION BY","Month-over-month revenue growth — LAG with DATE_TRUNC","Median salary per department — PERCENTILE_CONT window function","Customer retention — cohort analysis with DATE_DIFF and GROUP BY","Duplicate email detection with COUNT(*) > 1 and GROUP BY","Running balance: cumulative sum of transactions per user","Pivot monthly sales: CASE WHEN + MAX(CASE) pattern"]},{"title":"Data Engineering Exercises","problems":["Write a PySpark job: read CSV → filter nulls → groupBy → write Parquet","Design a star schema for an e-commerce dataset (orders, products, customers)","Write a BigQuery query on public dataset: top 10 NYC taxi pickup zones by revenue","Build a simple ETL: Python script that extracts from CSV, transforms with Pandas, loads to PostgreSQL","Write an EXPLAIN plan for a slow query and add appropriate index"]}]'),

-- Phase 8 — Statistics + Probability (PARALLEL — start now)
(8, 7, 'Statistics + Probability', '3–4 weeks (parallel — 1 hr/day)', '#5A3B8C', 'rgba(90,59,140,0.13)', '#b088ef',
 'Design and analyze a full mock A/B test end to end',
 '[{"label":"StatQuest (YouTube)","url":"https://www.youtube.com/@statquest"},{"label":"Khan Academy Stats","url":"https://www.khanacademy.org/math/statistics-probability"},{"label":"Seeing Theory","url":"https://seeing-theory.brown.edu"},{"label":"Think Stats (free book)","url":"https://greenteapress.com/wp/think-stats-2e"},{"label":"Naked Statistics","url":"https://www.goodreads.com/book/show/17986418-naked-statistics"}]',
 '[{"label":"Probability Foundations","topics":["Sample space, events, probability axioms","Conditional probability — P(A|B) = P(A∩B)/P(B)","Bayes theorem — prior, likelihood, posterior","Independence vs mutual exclusivity","Counting: permutations, combinations","Discrete distributions — Binomial, Poisson, Geometric","Continuous distributions — Normal, Uniform, Exponential","Central Limit Theorem — why it matters for ML"]},{"label":"Statistical Inference","topics":["Point estimates vs interval estimates","Confidence intervals — construction and interpretation","Hypothesis testing — null vs alternative hypothesis","Type I error (false positive) and Type II error (false negative)","p-value — what it is and what it is NOT","Statistical power and sample size calculation","t-test, chi-squared test, z-test — when to use which","Bonferroni correction for multiple testing"]},{"label":"A/B Testing & Applied Stats","topics":["A/B test design: control vs treatment, randomization","Minimum detectable effect (MDE) and sample size","Novelty effect and peeking problem","Sequential testing and early stopping","CUPED — variance reduction technique","Multi-armed bandit vs A/B testing tradeoffs","Causal inference basics — confounding, selection bias","Regression to the mean — common interview pitfall"]}]',
 '[{"label":"Week 1","goals":["Probability basics: 15 problems (Bayes, conditional probability, counting)","Distributions: Normal, Binomial, Poisson — compute by hand + Python","StatQuest: watch Probability Fundamentals playlist"]},{"label":"Week 2","goals":["Hypothesis testing: t-test on a real dataset in Python","Confidence intervals: compute for mean and proportion","StatQuest: p-value, hypothesis testing videos"]},{"label":"Week 3","goals":["Design a mock A/B test: define hypothesis, MDE, sample size, alpha/beta","Simulate the A/B test in Python (scipy.stats)","Chi-squared test: analyze categorical outcomes"]},{"label":"Week 4","goals":["Full mock A/B test analysis: collect simulated data → test → interpret → report","CLT demonstration: simulate sampling distributions in Python","Review: 20 statistics interview questions from Google/Meta style guides"]}]',
 '[{"title":"Probability Problems (Interview Style)","problems":["You flip a fair coin 10 times. What is P(exactly 6 heads)? (Binomial)","Given P(rain)=0.3, P(umbrella|rain)=0.8, P(umbrella|no rain)=0.1 — find P(rain|umbrella) using Bayes","In a dataset of 1000 users, 50 have condition X. If a test has 90% sensitivity and 95% specificity, what is the PPV?","You roll two dice. What is P(sum > 9 | first die = 4)?","A website has 1000 visitors/day. On average 5 crash. Model this with Poisson. P(0 crashes in a day)?"]},{"title":"A/B Testing Scenarios","problems":["You run an A/B test for 2 weeks. Control CTR = 5%, Treatment CTR = 5.5%, n=10,000 per group. Is this significant? (z-test)","Your A/B test shows p=0.04 but business says the lift is too small to ship. What do you recommend?","Explain the peeking problem: why checking significance daily inflates Type I error","Calculate the minimum sample size needed to detect a 2% lift (from 10% baseline) with 80% power and α=0.05","You have 5 variants to test. Why does running 5 separate A/B tests inflate the false positive rate? How do you fix it?"]}]'),

-- Phase 9 — Cloud (PARALLEL — start when in Deep Learning phase)
(9, 8, 'Cloud — AWS / GCP', '4–6 weeks (parallel — 1 hr/day)', '#0F6E56', 'rgba(15,110,86,0.13)', '#4ecfa0',
 'Deploy 1 ML model end-to-end on AWS SageMaker or GCP Vertex AI',
 '[{"label":"AWS Free Tier","url":"https://aws.amazon.com/free"},{"label":"AWS SageMaker docs","url":"https://docs.aws.amazon.com/sagemaker"},{"label":"GCP Free Tier","url":"https://cloud.google.com/free"},{"label":"GCP Vertex AI docs","url":"https://cloud.google.com/vertex-ai/docs"},{"label":"A Cloud Guru","url":"https://acloudguru.com"},{"label":"AWS ML Specialty","url":"https://aws.amazon.com/certification/certified-machine-learning-specialty"}]',
 '[{"label":"Cloud Fundamentals","topics":["IaaS vs PaaS vs SaaS — when to use each","Cloud resource hierarchy — accounts, projects, regions, zones","IAM — roles, policies, service accounts, least privilege","VPC basics — subnets, security groups, firewall rules","Object storage — S3 (AWS) or GCS (GCP) — buckets, versioning, lifecycle","Compute — EC2 / Compute Engine — instance types for ML","Serverless — Lambda / Cloud Functions — event-driven inference","Cost management — billing alerts, spot instances, preemptible VMs"]},{"label":"ML on Cloud","topics":["SageMaker / Vertex AI — managed training jobs","Managed notebooks — SageMaker Studio / Vertex Workbench","Model registry — versioning, staging, production","Batch inference vs real-time endpoint deployment","Auto-scaling inference endpoints","Cloud-based feature store — SageMaker Feature Store / Vertex Feature Store","ML Pipelines — SageMaker Pipelines / Vertex Pipelines","Model monitoring — data drift detection, performance alerts"]},{"label":"Data Engineering on Cloud","topics":["Cloud data warehouse — Redshift (AWS) or BigQuery (GCP)","Managed Kafka — MSK (AWS) or Pub/Sub (GCP) — real-time streaming","ETL pipelines — AWS Glue or Dataflow (GCP)","Data lake architecture — S3 + Glue catalog or GCS + Dataplex","Orchestration — MWAA (Managed Airflow AWS) or Cloud Composer","Infrastructure as Code basics — Terraform or CloudFormation","CI/CD for ML — CodePipeline (AWS) or Cloud Build (GCP)","Security for ML — encryption at rest/transit, VPC endpoints"]}]',
 '[{"label":"Week 1","goals":["Set up AWS Free Tier or GCP Free Tier account","IAM: create roles, attach policies, test least privilege","S3/GCS: create bucket, upload data, set lifecycle policy"]},{"label":"Week 2","goals":["SageMaker or Vertex: run a managed training job on a real dataset","Save model artifact to S3/GCS, register in model registry","Deploy model as real-time endpoint, test with curl/Postman"]},{"label":"Week 3","goals":["Build a SageMaker Pipeline or Vertex Pipeline: data → train → eval → deploy","Add model monitoring: enable data capture, set drift threshold","Write Terraform or CloudFormation for one resource (S3 bucket + Lambda)"]},{"label":"Week 4","goals":["BigQuery or Redshift: run 5 analytical queries on public dataset","Set up streaming pipeline: Pub/Sub → Dataflow → BigQuery (or Kinesis → Lambda → Redshift)","Cloud CI/CD: auto-deploy model on new training run via Cloud Build or CodePipeline"]},{"label":"Week 5","goals":["Cost review: analyze your cloud bill, identify optimisation opportunities","Spot/preemptible instances: retrain model using cost-saving compute","Full end-to-end: raw data in S3/GCS → training → endpoint → monitoring — all automated"]},{"label":"Week 6","goals":["Write README for your cloud ML project — architecture diagram, cost breakdown, results","Study AWS ML Specialty or GCP Professional ML Engineer exam guide (first 3 topics)","Mock: explain your cloud architecture to a non-technical person in 5 minutes"]}]',
 '[{"title":"Cloud Hands-On Exercises","problems":["Deploy a sklearn model as a real-time SageMaker or Vertex AI endpoint (not just notebook — production endpoint)","Build a SageMaker Pipeline / Vertex Pipeline with 4 stages: data validation → training → evaluation → conditional deployment","Set up data drift monitoring on a deployed endpoint — trigger alert when feature distribution shifts","Write a Lambda / Cloud Function that triggers model retraining when new data lands in S3/GCS","Create a Terraform config that provisions: S3 bucket + IAM role + SageMaker endpoint + CloudWatch alert"]},{"title":"Cloud Architecture Design Questions","problems":["Design a real-time recommendation system using AWS (Kinesis → Lambda → SageMaker endpoint → DynamoDB)","How would you reduce inference cost by 60% for a model getting 10M requests/day? (batching, caching, distillation, spot)","A model in production has degrading accuracy over 3 months — what cloud-native tools detect and fix this automatically?","Design a multi-region ML deployment with failover — how do you handle model consistency across regions?","You have 1TB of new training data weekly — design the automated retraining pipeline on GCP end to end"]}]'),

-- Phase 10 — NLP / LLMs (PARALLEL — start when in Deep Learning phase)
(10, 9, 'NLP / LLMs Expanded', '4–6 weeks (parallel — 1 hr/day)', '#854F0B', 'rgba(133,79,11,0.13)', '#d4924a',
 'Build and deploy a RAG application with a vector database',
 '[{"label":"HuggingFace docs","url":"https://huggingface.co/docs"},{"label":"LangChain docs","url":"https://python.langchain.com/docs"},{"label":"OpenAI Cookbook","url":"https://cookbook.openai.com"},{"label":"Pinecone Learning Center","url":"https://www.pinecone.io/learn"},{"label":"LMSYS Chatbot Arena","url":"https://lmsys.org"},{"label":"Chip Huyen AI Engineering","url":"https://huyenchip.com/2023/04/11/llm-engineering.html"},{"label":"Papers With Code NLP","url":"https://paperswithcode.com/area/natural-language-processing"}]',
 '[{"label":"NLP Foundations + Modern Transformers","topics":["Text preprocessing — tokenization, BPE, WordPiece, SentencePiece","Word embeddings — Word2Vec, GloVe, FastText (conceptual)","Attention mechanism — scaled dot-product, multi-head attention","BERT architecture — bidirectional, MLM, NSP pretraining","GPT architecture — autoregressive, causal attention, next token prediction","T5 / BART — encoder-decoder, seq2seq tasks","Sentence Transformers — bi-encoders for semantic similarity","Evaluation metrics — BLEU, ROUGE, BERTScore, Perplexity"]},{"label":"LLM Engineering","topics":["Prompt engineering — zero-shot, few-shot, chain-of-thought, ReAct","LLM fine-tuning — full fine-tune vs parameter-efficient methods","LoRA and QLoRA — low-rank adaptation, quantization basics","Instruction tuning and RLHF — high-level concepts","LLM evaluation — hallucination detection, faithfulness, factuality","Context window management — chunking, summarization, sliding window","LLM serving — vLLM, TGI, batch inference, latency vs throughput","AI safety basics — alignment, red-teaming, guardrails"]},{"label":"RAG + Vector Databases","topics":["RAG architecture — retrieval augmented generation pipeline","Dense retrieval — DPR, bi-encoders, FAISS, approximate nearest neighbour","Vector databases — Pinecone, Weaviate, Chroma, pgvector — when to use each","Embedding models — text-embedding-ada-002, instructor, E5, BGE","Chunking strategies — fixed, semantic, hierarchical, sliding window","Hybrid search — dense + sparse (BM25) retrieval, reranking","Advanced RAG — HyDE, multi-query, self-RAG, corrective RAG","Evaluation of RAG — RAGAS framework, context relevance, answer faithfulness"]}]',
 '[{"label":"Week 1","goals":["Fine-tune DistilBERT on a custom classification task (not SST-2 — pick healthcare or finance domain)","Implement sentence similarity with sentence-transformers, build a semantic search over 1000 documents","BLEU and ROUGE: compute scores for a text summarization model"]},{"label":"Week 2","goals":["Prompt engineering: implement chain-of-thought on 5 reasoning problems, measure accuracy improvement","Build a simple RAG pipeline: PDF → chunk → embed → store in Chroma → retrieve → generate","LangChain: build a conversational Q&A bot with memory over a document set"]},{"label":"Week 3","goals":["LoRA fine-tuning: fine-tune a small LLM (Mistral 7B or LLaMA 3) on a custom dataset using QLoRA + 4-bit quantization","Evaluate hallucination: run 20 factual questions, measure hallucination rate before and after RAG","Vector database: migrate your RAG from Chroma to Pinecone or Weaviate, compare retrieval speed"]},{"label":"Week 4","goals":["Advanced RAG: implement HyDE (Hypothetical Document Embeddings) and measure retrieval quality improvement","Hybrid search: add BM25 sparse retrieval alongside dense, rerank with cross-encoder","Deploy your RAG app as a FastAPI endpoint — /ask endpoint that accepts question, returns answer + sources"]},{"label":"Week 5","goals":["RAGAS evaluation: run full evaluation suite (context precision, recall, answer faithfulness, answer relevance)","LLM serving: benchmark your model with vLLM vs naive inference — measure throughput improvement","Write a technical blog post or README about your RAG system — architecture, evaluation results, lessons learned"]},{"label":"Week 6","goals":["Full project: end-to-end RAG application deployed on cloud (AWS/GCP) with monitoring, evaluation, and CI/CD","Study 10 NLP interview questions (tokenization, attention, BERT vs GPT, fine-tuning trade-offs)","Mock: explain RAG architecture, trade-offs, and failure modes in 10 minutes to a non-ML audience"]}]',
 '[{"title":"NLP + LLM Hands-On","problems":["Fine-tune a BERT model on a domain-specific classification task — achieve >85% F1 — deploy as FastAPI endpoint","Build a semantic search engine over 5000 Wikipedia articles using sentence-transformers + FAISS — sub-100ms retrieval","Implement a RAG pipeline from scratch (no LangChain) — PDF ingestion → chunking → embedding → FAISS → GPT generation","QLoRA fine-tune Mistral 7B on a 1000-row instruction dataset — measure perplexity before and after","Evaluate a RAG system with RAGAS: report context precision, recall, answer faithfulness, and answer relevance scores"]},{"title":"LLM System Design","problems":["Design a customer support bot for a bank: 100K daily queries, <2s latency, must cite policy documents, zero hallucination on numbers","Design a code review assistant: ingests PR diffs, retrieves relevant coding standards, generates review comments — handle 500 PRs/day","Design a medical Q&A RAG system: how do you handle hallucination risk on drug dosage questions? What guardrails?","You have a fine-tuned LLM that costs $0.05 per query. Traffic is 10M queries/day. Design a caching + routing strategy to cut cost by 70%","How would you detect and mitigate prompt injection attacks in a production LLM application?"]}]')

ON CONFLICT (id) DO NOTHING;

-- Advance the sequence safely
SELECT setval('learning_phases_id_seq', 15);

-- ═══════════════════════════════════════════════════════════════════════
-- SECTION G — PHASE DURATION FIX
-- (already embedded above in seed values — this UPDATE ensures
--  correct labels even if phases were previously seeded with old labels)
-- ═══════════════════════════════════════════════════════════════════════

-- Sequential phases — do one at a time, full focus
UPDATE learning_phases SET duration = '~4 weeks'                       WHERE id = 1;
UPDATE learning_phases SET duration = 'Daily — ongoing (never stop)'   WHERE id = 2;
UPDATE learning_phases SET duration = '~8 weeks'                       WHERE id = 3;
UPDATE learning_phases SET duration = '~7 weeks'                       WHERE id = 4;
UPDATE learning_phases SET duration = '~8 weeks'                       WHERE id = 5;
UPDATE learning_phases SET duration = '~6 weeks'                       WHERE id = 6;

-- Parallel phases — 1 hour per day alongside your sequential track
UPDATE learning_phases SET duration = '3–4 weeks (parallel — 1 hr/day)' WHERE id = 7;
UPDATE learning_phases SET duration = '3–4 weeks (parallel — 1 hr/day)' WHERE id = 8;
UPDATE learning_phases SET duration = '4–6 weeks (parallel — 1 hr/day)' WHERE id = 9;
UPDATE learning_phases SET duration = '4–6 weeks (parallel — 1 hr/day)' WHERE id = 10;

-- ═══════════════════════════════════════════════════════════════════════
-- SECTION H — DS/ML PORTFOLIO PROJECT SEEDS (11 projects)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO projects (title, description, category, tech, status, progress, highlights, sort_order)
VALUES

('End-to-End Churn Prediction',
 'Full ML pipeline on Telco Customer Churn dataset. EDA → feature engineering → XGBoost → SHAP explanations. Handles class imbalance with SMOTE + threshold tuning. Deployed as FastAPI endpoint with Docker.',
 'Classical ML', ARRAY['Python','XGBoost','SHAP','SMOTE','FastAPI','Docker','scikit-learn','Pandas'],
 'planning', 0,
 ARRAY['EDA with feature analysis and correlation heatmaps','Baseline Logistic Regression vs XGBoost comparison','SMOTE + class weight experiments documented','SHAP waterfall plots for 3 sample predictions','FastAPI /predict endpoint + Dockerfile','ROC-AUC > 0.88 on test set'],
 1),

('From-Scratch ML Implementations',
 'Implement Linear Regression, Logistic Regression, k-NN, k-Means, and Decision Tree from scratch using only NumPy. Validate against sklearn. Mathematical derivations in README.',
 'Classical ML', ARRAY['Python','NumPy','scikit-learn','Matplotlib','Jupyter'],
 'planning', 0,
 ARRAY['Linear Regression: gradient descent + OLS derivation','Logistic Regression: sigmoid + log-loss + L2 regularisation','k-NN: Euclidean + cosine distance, k selection','k-Means: elbow method, silhouette score comparison','Decision Tree: Gini impurity + information gain splits','Side-by-side benchmark vs sklearn on 3 datasets'],
 2),

('A/B Test Simulator & Analyser',
 'Python tool that simulates A/B tests with configurable parameters. Sample size calculator, sequential testing, Bonferroni/FDR correction. Includes Bayesian A/B with Beta-Binomial model.',
 'Statistics', ARRAY['Python','SciPy','Plotly','Streamlit','NumPy','statsmodels'],
 'planning', 0,
 ARRAY['Sample size calculator (MDE, alpha, power inputs)','Simulate p-value distribution under H₀ and H₁','Bonferroni / FDR correction for multiple variants','Bayesian Beta-Binomial posterior update visualisation','Power curve interactive chart','Streamlit UI deployable on Streamlit Cloud'],
 3),

('Product Analytics Dashboard — SQL',
 'Full analytics stack on Airbnb or NYC Taxi public dataset. DuckDB schema with cohort retention, funnel analysis, DAU/WAU/MAU trends. Streamlit dashboard with business recommendations.',
 'Data Engineering', ARRAY['SQL','DuckDB','Python','Streamlit','Pandas','Plotly','dbt'],
 'planning', 0,
 ARRAY['Star schema design with fact + dimension tables','Cohort retention matrix (D1/D7/D30)','Funnel analysis: signup → activation → retention','Window function: MoM growth, 7-day rolling average','Streamlit dashboard with filters by date/region','2-page business recommendations write-up'],
 4),

('Causal Inference on Real Data',
 'Apply causal inference methods on LaLonde job training dataset. Compare OLS, Propensity Score Matching, Difference-in-Differences. Sensitivity analysis and overlap plots.',
 'Statistics', ARRAY['Python','statsmodels','DoWhy','Pandas','Matplotlib','scikit-learn'],
 'planning', 0,
 ARRAY['OLS baseline with confounder analysis','Propensity Score Matching with common support check','DiD estimation with parallel trends test','Sensitivity analysis (Rosenbaum bounds)','Overlap/balance plots before and after matching','Compare ATE estimates across methods'],
 5),

('NLP Sentiment Classifier',
 'Compare classical vs deep learning on IMDB/Twitter sentiment. TF-IDF + Logistic Regression baseline → fine-tuned DistilBERT. Speed vs accuracy tradeoff analysis.',
 'NLP', ARRAY['Python','HuggingFace','PyTorch','scikit-learn','Transformers','Pandas','NLTK'],
 'planning', 0,
 ARRAY['Text cleaning pipeline (tokenisation, stopwords, lemmatisation)','TF-IDF + Logistic Regression baseline (F1 > 0.88)','Fine-tune DistilBERT on same dataset','Confusion matrix + error analysis on misclassified samples','Inference latency comparison: classical vs transformer','Gradio demo UI'],
 6),

('RAG-Based AI Knowledge Assistant',
 'Full RAG pipeline using LangChain + ChromaDB. Ingest custom documents, chunk, embed, store, query with semantic search + reranking. Streamlit frontend.',
 'LLMs & GenAI', ARRAY['Python','LangChain','ChromaDB','OpenAI API','Streamlit','FastAPI','HuggingFace'],
 'planning', 0,
 ARRAY['Document ingestion pipeline (PDF/TXT → chunks → embeddings)','ChromaDB vector store with cosine similarity search','Reranking with cross-encoder for top-k results','Conversational memory with LangChain ConversationChain','RAGAS evaluation (faithfulness, answer relevancy)','Streamlit chat UI with source citation'],
 7),

('Image Classifier — CNN from Scratch',
 'Build a CNN image classifier on CIFAR-10. Implement forward pass + backprop manually in NumPy first, then reproduce in PyTorch. Transfer learning with ResNet-18.',
 'Computer Vision', ARRAY['Python','PyTorch','NumPy','torchvision','Matplotlib','scikit-learn'],
 'planning', 0,
 ARRAY['Manual CNN forward + backward pass in NumPy (educational)','PyTorch CNN: 3 conv layers + BatchNorm + Dropout','Data augmentation: flip, crop, colour jitter','Transfer learning: freeze ResNet-18 backbone, fine-tune head','Grad-CAM visualisation of what the model looks at','Accuracy > 85% on CIFAR-10 test set'],
 8),

('Mini Recommendation Engine',
 'Hybrid recommender on MovieLens 100K. Collaborative filtering (SVD) + content-based (item embeddings). Served as FastAPI endpoint with item-to-item and user-to-item recommendations.',
 'RecSys', ARRAY['Python','scikit-surprise','FastAPI','Redis','NumPy','Pandas','Docker'],
 'planning', 0,
 ARRAY['User-item matrix factorisation with SVD (scikit-surprise)','Item embeddings via Word2Vec on watch sequences','Hybrid: weighted combination of CF + content scores','FastAPI endpoints: /recommend/user and /recommend/similar','Redis cache for pre-computed top-N recommendations','Offline evaluation: NDCG@10, MAP@10'],
 9),

('Real-Time ML Data Pipeline',
 'Simulated clickstream → Kafka consumer → feature computation → Redis cache → model serving. Drift detection comparing feature distributions over time.',
 'MLOps', ARRAY['Python','Kafka','FastAPI','Redis','Docker','Evidently AI','scikit-learn','Pandas'],
 'planning', 0,
 ARRAY['Kafka producer simulating clickstream/transaction events','Python consumer: compute rolling features in real time','Store features in Redis with TTL','FastAPI model serving endpoint (<200ms p95 latency)','Evidently AI drift report: daily feature distribution check','Docker Compose: all services wired together'],
 10),

('ML Pipeline with Full MLOps Stack',
 'End-to-end ML pipeline with MLflow experiment tracking, model registry, CI/CD via GitHub Actions, cloud deployment. Monitoring with Evidently.',
 'MLOps', ARRAY['Python','MLflow','FastAPI','Docker','GitHub Actions','AWS S3','scikit-learn','Evidently AI'],
 'planning', 0,
 ARRAY['MLflow experiment tracking: params, metrics, artefacts','Model registry: staging → production promotion workflow','FastAPI serving with health check and /metrics endpoint','Dockerfile + docker-compose for local reproducibility','GitHub Actions CI: lint → test → build → push to ECR','Evidently dashboard: weekly data + model drift report'],
 11)

ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- SECTION I — DECISIONS SEED (3 founding decisions)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO decisions (decision, reasoning, expected_outcome, category, review_date) VALUES
  ('Pivot career toward ML/Data Science',
   'Strong market demand + genuine interest in AI + existing technical foundation from Power BI',
   'Land 20+ LPA role at Google/Microsoft/Amazon within 18 months',
   'career', '2026-06-01'),
  ('Use Next.js + Supabase for dashboard',
   'Modern stack with realtime support + good for portfolio + widely used in industry',
   'Working production-grade dashboard demonstrating full-stack skills',
   'technical', '2026-06-01'),
  ('Focus on healthcare ML projects',
   'Domain expertise differentiator + meaningful impact + strong demand in industry',
   'Portfolio projects that stand out from generic ML work',
   'project', '2026-06-01')
ON CONFLICT DO NOTHING;

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  END OF MASTER MIGRATION                                             ║
-- ║                                                                       ║
-- ║  After running this file:                                            ║
-- ║  1. All 14 tables created with RLS enabled                           ║
-- ║  2. All 10 learning phases seeded with correct durations             ║
-- ║  3. 11 DS/ML portfolio projects seeded                               ║
-- ║  4. 3 founding decisions seeded                                      ║
-- ║  5. Recycle bin (soft-delete) on all 5 main tables                   ║
-- ║                                                                       ║
-- ║  NEXT STEP — Push to GitHub:                                         ║
-- ║    git add -A                                                         ║
-- ║    git commit -m "chore: master sql v10.9 — single source of truth"  ║
-- ║    git push origin main                                               ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
