-- ═══════════════════════════════════════════════════════════
--  SRN Command Center — v8 Migration
--  Adds: resource_links, tags, estimated_minutes to todos
--  Storage: JSONB + text[] — stays inside existing table
--  Zero new tables, zero Supabase Storage buckets
-- ═══════════════════════════════════════════════════════════

-- Resource links: [{title, url, type}] — stored as JSONB
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS resource_links  JSONB    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags            TEXT[]   DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS estimated_mins  INTEGER  DEFAULT NULL;

-- Back-fill existing rows with empty arrays
UPDATE todos
SET
  resource_links = '[]'::jsonb,
  tags           = ARRAY[]::text[]
WHERE resource_links IS NULL OR tags IS NULL;

-- Index tags for fast searching
CREATE INDEX IF NOT EXISTS idx_todos_tags ON todos USING GIN (tags);
