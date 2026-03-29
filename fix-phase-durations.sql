-- ═══════════════════════════════════════════════════════════════════════
-- SRN Command Center — Fix phase duration labels
-- Run in Supabase SQL Editor to update misleading "Weeks X–Y" labels
-- to clear "~N weeks" duration format.
-- Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════

-- Sequential phases (do one at a time, in order)
UPDATE learning_phases SET duration = '~4 weeks'  WHERE id = 1;
UPDATE learning_phases SET duration = 'Daily — ongoing (never stop)' WHERE id = 2;
UPDATE learning_phases SET duration = '~8 weeks'  WHERE id = 3;
UPDATE learning_phases SET duration = '~7 weeks'  WHERE id = 4;
UPDATE learning_phases SET duration = '~8 weeks'  WHERE id = 5;
UPDATE learning_phases SET duration = '~6 weeks'  WHERE id = 6;

-- Parallel phases (run alongside your main phase, 1 hr/day)
UPDATE learning_phases SET duration = '3–4 weeks (parallel — 1 hr/day)' WHERE id = 7;
UPDATE learning_phases SET duration = '3–4 weeks (parallel — 1 hr/day)' WHERE id = 8;
UPDATE learning_phases SET duration = '4–6 weeks (parallel — 1 hr/day)' WHERE id = 9;
UPDATE learning_phases SET duration = '4–6 weeks (parallel — 1 hr/day)' WHERE id = 10;
