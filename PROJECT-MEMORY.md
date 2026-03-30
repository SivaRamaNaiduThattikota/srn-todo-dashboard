# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v11.2 — SQL patch written, Today page updated, Settings Export confirmed
> **Stack:** Next.js 14 · Supabase · Tailwind CSS · TypeScript · Framer Motion

---

## 🗂 Project Identity

| Field | Value |
|---|---|
| Name | SRN Command Center |
| Owner | Siva Rama Naidu (SRN) |
| Live URL | https://srn-todo-dashboard.vercel.app/ |
| Local path | `C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard` |
| Supabase project ID | `azpjxezbackhzuoznccg` (Mumbai region) |
| Design version | **v11.2** — iOS 26 Liquid Glass |
| CSS framework | **Tailwind CSS** + custom CSS vars in globals.css |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v11.2 (globals.css is source of truth)
Key classes: `.liquid-glass`, `.liquid-glass-sweep`, `.cc-btn`, `.cc-btn-accent`, `.cc-chip`, `.cc-tile`, `.cc-habit`
CSS vars: `--accent`, `--glass-fill`, `--glass-border`, `--specular-top`, `--cc-glass-base`, `--shadow-xl`
Inline styles with CSS vars only — never hardcoded Tailwind colour classes.

---

## 📁 All 16 Pages — Current Status (v11.2)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ v11.0 | Liquid glass cards, mobile-first layout, status pill, progress bar header |
| Today | `/today` | ✅ v11.2 | Habits, tasks, stats, ML roadmap, 6 quick actions (now includes Interview) |
| Streaks | `/streaks` | ✅ | Heatmap horizontal-scroll on mobile, 5s undo delete |
| Focus | `/focus` | ✅ v11.0 | Splitflap clock + BBC fullscreen + auto-rotating compass |
| Notes | `/notes` | ✅ | Search + highlight, tag counts, undo delete, Recycle Bin |
| Projects | `/projects` | ✅ | Mobile UX overhaul, 2×2 grid, Recycle Bin |
| Learning | `/learning` | ✅ | 10 phases DB-driven, ⓘ modal, ⏱ timeline header button |
| Interview | `/interview` | ✅ v11.1 | 4 tabs, Supabase persistence, ⓘ modal, DS+MLE badge |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ | ML Roadmap progress, 14-day chart, velocity |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo, Recycle Bin |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ | Desktop drag-drop, mobile long-press → tap to move |
| Settings | `/settings` | ✅ v11.1 | Accent themes, Google Calendar sync, templates, Export & Backup |

---

## ✅ v11.2 Session Changes

### SQL patch file created (new)
- `sql-patch-v11.1-interview-prep.sql` — small safe patch file
- Run this in Supabase SQL Editor to add the `interview_prep` table
- Uses `CREATE TABLE IF NOT EXISTS` — safe to run multiple times
- `supabase-master-migration.sql` also updated with the new table + v11.1 end comment

### Today Page (`src/app/today/page.tsx`) — Updated
- **Quick actions expanded:** 4 → 6 items (2×3 grid)
  - Added: 🎯 Interview prep → `/interview`
  - Added: ⚡ Streaks → `/streaks`
  - Kept: ⏱ Start focus, 📝 Add a note, 🎓 Learning, 📊 Analytics
- **Stats row:** Added "Due today" count with color coding (red=overdue, yellow=due, green=none)
- **Focus sessions:** Fetches 30 days (was 1) to properly capture today's sessions
- **deleted_at filter:** All task queries now exclude soft-deleted tasks
- **In-progress tasks:** assigned_agent only shows if set (no empty @)
- **Empty states:** Better empty state messages with links

### Settings Page (`src/app/settings/page.tsx`) — Confirmed v11.1
- Export & Backup section with 4 buttons confirmed present on disk
- All data exports to JSON/CSV from Supabase
- Supabase free tier note included

---

## 🗃 Database Schema v11.2 (15 tables — same as v11.1)

| Table | Key columns |
|---|---|
| `todos` | id, title, description, status, priority, assigned_agent, start_date, due_date, category, tags, resource_links, estimated_mins, completed_at, deleted_at |
| `daily_habits` | id, name, icon, color |
| `habit_log` | id, habit_id, completed_date |
| `focus_sessions` | id, todo_id, duration_minutes, completed, started_at, ended_at |
| `notes` | id, title, content, tags, is_pinned, deleted_at |
| `projects` | id, title, category, tech, highlights, github_url, live_url, progress, end_date, sort_order, deleted_at |
| `project_sections` | id, project_id, title, items, category, sort_order |
| `weekly_reviews` | id, week_start, tasks_completed, focus_minutes, streak_days, reflection, goals_next_week |
| `decisions` | id, decision, reasoning, expected_outcome, category, status, review_date, review_notes, deleted_at |
| `activity_log` | id, todo_id, action, old_value, new_value, created_at |
| `task_templates` | id, title, priority, recurrence |
| `learning_phases` | id, sort_order, title, duration, accent_color, bg_color, text_color, milestone, resources, tracks, weeks, practice, deleted_at |
| `learning_progress` | id, phase_id (FK), track_index, topic_index, is_done, done_at |
| `learning_week_progress` | id, phase_id (FK), week_index, is_done, done_at |
| `interview_prep` | id, key (UNIQUE), data (jsonb), updated_at |

---

## 📚 ML/DS Learning Roadmap — 10 Phases (unchanged)

| Phase | Title | Topics | Weeks | Milestone |
|---|---|---|---|---|
| 1 | Python for ML | 10 | 4 | 30 LeetCode Easy in Python |
| 2 | DSA for Interviews | 14 | 6 | 100 LC problems + mock interview |
| 3 | Core ML | 12 | 8 | 3 Kaggle notebooks published |
| 4 | Deep Learning | 10 | 7 | End-to-end DL project on GitHub |
| 5 | MLOps + ML System Design | 24 | 8 | Deploy REST API + Record 45-min mock |
| 6 | Portfolio + Interviews | 11 | 7 | 3 projects + Resume + LinkedIn |
| 7 | SQL + Data Engineering | 24 | 4 | Solve 30 SQL Medium on DataLemur |
| 8 | Statistics + Probability | 24 | 4 | Design + analyze a full mock A/B test |
| 9 | Cloud — AWS / GCP | 24 | 6 | Deploy ML model on SageMaker or Vertex AI |
| 10 | NLP / LLMs Expanded | 24 | 6 | Build + deploy RAG app with vector DB |

**Total: 10 phases · ~177 topics · 60 planned weeks**

---

## 🗑 Recycle Bin (5 tables — unchanged)
Soft-delete on: `todos`, `notes`, `decisions`, `projects`, `learning_phases`

---

## 📱 Mobile Layout Rules

### Modal pattern
```
fixed z-[61] bottom-0 left-0 right-0
maxHeight: 92dvh, borderRadius: 24px 24px 0 0
paddingBottom: calc(32px + env(safe-area-inset-bottom, 0px))
```
Desktop: `sm:fixed sm:inset-0 sm:m-auto sm:rounded-[24px] sm:max-w-lg sm:max-h-[80vh]`

---

## 🔧 Key Files Modified (v11.2)

| File | Changes |
|---|---|
| `src/app/today/page.tsx` | 6 quick actions (added Interview + Streaks), 30-day sessions, deleted_at filter, stats row |
| `src/app/settings/page.tsx` | Export & Backup section (4 buttons: all JSON, tasks CSV, focus CSV, learning JSON) |
| `src/app/interview/page.tsx` | Supabase persistence, ⓘ modal, DS+MLE clarity, null expandedDomain |
| `src/components/Sidebar.tsx` | Interview nav added |
| `src/components/MobileNav.tsx` | Interview in More sheet |
| `sql-patch-v11.1-interview-prep.sql` | NEW — run in Supabase to add interview_prep table |
| `supabase-master-migration.sql` | Updated with interview_prep + v11.1 end comment + DATA NOTE |
| `PROJECT-MEMORY.md` | Updated to v11.2 |

---

## 🚀 Deployment — v11.2

### Step 1 — Run SQL patch in Supabase SQL Editor
```sql
-- File: sql-patch-v11.1-interview-prep.sql
-- Or copy-paste directly:
CREATE TABLE IF NOT EXISTS interview_prep (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        UNIQUE NOT NULL,
  data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_interview_prep" ON interview_prep;
CREATE POLICY "anon_all_interview_prep"
  ON interview_prep FOR ALL TO anon
  USING (true) WITH CHECK (true);
```

### Step 2 — Push to GitHub
```bash
cd "C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard"
git add -A
git commit -m "feat: v11.2 - Today page updated, SQL patch for interview_prep, Export confirmed"
git push origin main
```

### Step 3 — Verify
| Check | Expected |
|---|---|
| Today page | 6 quick action tiles in 2×3 grid including 🎯 Interview prep |
| Settings → Export & Backup | 4 buttons visible, downloads work |
| Interview page checkboxes | Persist across browsers after running SQL patch |

---

## 📋 Dev Preferences (always follow)
- ❌ No "Claude" or "AI" branding — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Always read full file before writing replacement
- ✅ Inline styles using CSS vars only
- ✅ supabase-master-migration.sql is single source of truth for DB schema
- ✅ sql-patch-*.sql files are for targeted DB upgrades

---

## ⏳ Feature Backlog (updated v11.2)

| Priority | Feature | Notes |
|---|---|---|
| 🔴 High | **Power BI flow bugs** | Empty Excel for compliant towers + missing Hierarchy_Master employees |
| 🔴 High | iOS 26 Liquid Glass CSS rewrite | Light mode especially — globals.css overhaul |
| 🟡 Medium | Focus page BBC mobile test | Verify vh-based font on 320-430px screens |
| 🟡 Medium | AddTodoModal quick add | Skip Details/Resources, submit with title only |
| 🟡 Medium | Recycle bin auto-purge | Auto-hard-delete items older than 30 days |
| 🟡 Medium | Learning: phase reorder | Drag to reorder phases |
| 🟡 Medium | Analytics category filter | Filter 14-day chart by task category |
| 🟢 Low | Interview page: active week highlight | Highlight current week in 12-week plan |
| 🟢 Low | Today page: focus start shortcut | One-tap focus start with last used duration |
