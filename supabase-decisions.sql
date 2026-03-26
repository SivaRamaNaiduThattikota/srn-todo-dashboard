-- ============================================================
-- Decisions table — Decision Logger
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS decisions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  decision       TEXT NOT NULL,
  reasoning      TEXT DEFAULT '',
  expected_outcome TEXT DEFAULT '',
  category       TEXT DEFAULT 'career' CHECK (category IN ('career', 'technical', 'learning', 'financial', 'personal', 'project')),
  status         TEXT DEFAULT 'active' CHECK (status IN ('active', 'reviewed', 'reversed', 'validated')),
  review_date    DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  review_notes   TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decisions' AND policyname = 'Allow all on decisions') THEN
    CREATE POLICY "Allow all on decisions" ON decisions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Auto update timestamp
CREATE OR REPLACE FUNCTION update_decisions_timestamp()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS decisions_updated_at ON decisions;
CREATE TRIGGER decisions_updated_at BEFORE UPDATE ON decisions FOR EACH ROW EXECUTE FUNCTION update_decisions_timestamp();

-- Seed the 3 existing decisions from decisions.csv
INSERT INTO decisions (decision, reasoning, expected_outcome, category, review_date) VALUES
  ('Pivot career toward ML/Data Science', 'Strong market demand + genuine interest in AI + existing technical foundation from Power BI', 'Land 20+ LPA role at Google/Microsoft/Amazon within 18 months', 'career', '2026-04-24'),
  ('Use Next.js + Supabase for dashboard', 'Modern stack with realtime support + good for portfolio + widely used in industry', 'Working production-grade dashboard demonstrating full-stack skills', 'technical', '2026-04-24'),
  ('Focus on healthcare ML projects', 'Domain expertise differentiator + meaningful impact + strong demand in industry', 'Portfolio projects that stand out from generic ML work', 'project', '2026-04-24')
ON CONFLICT DO NOTHING;
