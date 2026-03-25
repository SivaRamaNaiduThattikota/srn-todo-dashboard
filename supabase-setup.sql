-- ============================================================
-- SUPABASE SETUP: Run this in Supabase SQL Editor
-- Project: SRN Command Center — To-Do Dashboard
-- ============================================================

-- 1. Create the todos table
CREATE TABLE IF NOT EXISTS todos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'done', 'blocked')),
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assigned_agent TEXT DEFAULT 'unassigned',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Auto-update the updated_at timestamp on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 3. Enable Row-Level Security (required for Supabase)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 4. Create a permissive policy (adjust for production)
CREATE POLICY "Allow all operations on todos"
  ON todos FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Enable Realtime on the todos table
ALTER PUBLICATION supabase_realtime ADD TABLE todos;

-- 6. Create indexes for performance
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_assigned_agent ON todos(assigned_agent);
CREATE INDEX idx_todos_updated_at ON todos(updated_at DESC);

-- 7. Seed some sample data
INSERT INTO todos (title, status, priority, assigned_agent) VALUES
  ('Set up CI/CD pipeline',        'in_progress', 'high',     'agent'),
  ('Write unit tests for auth',    'pending',     'critical',  'developer'),
  ('Design dashboard mockup',      'done',        'medium',    'designer'),
  ('Review PR #42',                'pending',     'high',      'agent'),
  ('Update API documentation',     'in_progress', 'medium',    'developer'),
  ('Fix login redirect bug',       'blocked',     'critical',  'developer'),
  ('Deploy staging environment',   'pending',     'low',       'devops'),
  ('Research vector DB options',   'in_progress', 'high',      'agent');
