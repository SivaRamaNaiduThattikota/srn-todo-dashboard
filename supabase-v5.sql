-- ============================================================
-- SRN Command Center v5 — Career-focused features
-- Run in Supabase SQL Editor
-- ============================================================

-- Daily habits / streak tracking
CREATE TABLE IF NOT EXISTS daily_habits (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '',
  color       TEXT DEFAULT '#6ee7b7',
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_habits' AND policyname = 'Allow all on daily_habits') THEN
    CREATE POLICY "Allow all on daily_habits" ON daily_habits FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Habit completion log (one row per habit per day)
CREATE TABLE IF NOT EXISTS habit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id    UUID NOT NULL REFERENCES daily_habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);

ALTER TABLE habit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_log' AND policyname = 'Allow all on habit_log') THEN
    CREATE POLICY "Allow all on habit_log" ON habit_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Knowledge base / notes
CREATE TABLE IF NOT EXISTS notes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT DEFAULT '',
  tags        TEXT[] DEFAULT '{}',
  is_pinned   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Allow all on notes') THEN
    CREATE POLICY "Allow all on notes" ON notes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Auto update notes updated_at
CREATE OR REPLACE FUNCTION update_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_notes_timestamp();

-- Add category column to todos
ALTER TABLE todos ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'
  CHECK (category IN ('learning', 'project', 'interview-prep', 'work', 'personal', 'general'));

-- Weekly reviews
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start  DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  focus_minutes INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  reflection  TEXT DEFAULT '',
  goals_next_week TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_start)
);

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_reviews' AND policyname = 'Allow all on weekly_reviews') THEN
    CREATE POLICY "Allow all on weekly_reviews" ON weekly_reviews FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Focus sessions (Pomodoro)
CREATE TABLE IF NOT EXISTS focus_sessions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id     UUID REFERENCES todos(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  completed   BOOLEAN DEFAULT false,
  started_at  TIMESTAMPTZ DEFAULT now(),
  ended_at    TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Allow all on focus_sessions') THEN
    CREATE POLICY "Allow all on focus_sessions" ON focus_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed default habits (user can add/remove later)
INSERT INTO daily_habits (name, icon, color, sort_order) VALUES
  ('Python practice', 'P', '#3b82f6', 0),
  ('SQL practice', 'S', '#f59e0b', 1),
  ('ML concept', 'M', '#8b5cf6', 2),
  ('English speaking', 'E', '#10b981', 3)
ON CONFLICT DO NOTHING;
