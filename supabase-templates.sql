-- ============================================================
-- Task Templates + Recurring Tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS task_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assigned_agent TEXT DEFAULT 'unassigned',
  recurrence  TEXT DEFAULT NULL CHECK (recurrence IN ('daily', 'weekly', 'monthly', NULL)),
  is_active   BOOLEAN DEFAULT true,
  last_created_at TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Allow all on task_templates') THEN
    CREATE POLICY "Allow all on task_templates" ON task_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed some templates
INSERT INTO task_templates (title, description, priority, assigned_agent, recurrence) VALUES
  ('Daily standup notes', 'Write standup update for the team', 'medium', 'developer', 'daily'),
  ('Weekly code review', 'Review open PRs and provide feedback', 'high', 'developer', 'weekly'),
  ('Monthly retrospective', 'Team retrospective meeting prep', 'medium', 'developer', 'monthly');
