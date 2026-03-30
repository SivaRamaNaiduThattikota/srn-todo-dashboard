# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v11.1 — Interview Prep page complete (Supabase persistence, ⓘ info modal, DS vs MLE clarity)
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
| Design version | **v11.1** — iOS 26 Liquid Glass |
| CSS framework | **Tailwind CSS** + custom CSS vars in globals.css |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v11.1 (globals.css is source of truth)
Key classes: `.liquid-glass`, `.liquid-glass-sweep`, `.cc-btn`, `.cc-btn-accent`, `.cc-chip`
CSS vars: `--accent`, `--glass-fill`, `--glass-border`, `--specular-top`, `--cc-glass-base`, `--shadow-xl`
Inline styles with CSS vars only — never hardcoded Tailwind colour classes.

---

## 📁 All 16 Pages — Current Status (v11.1)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ v11.0 | Liquid glass cards, mobile-first layout, status pill, progress bar header |
| Today | `/today` | ✅ | Habits, tasks, ML Roadmap progress card, quick actions |
| Streaks | `/streaks` | ✅ | Heatmap horizontal-scroll on mobile, 5s undo delete |
| Focus | `/focus` | ✅ v11.0 | Splitflap clock + BBC fullscreen + auto-rotating compass |
| Notes | `/notes` | ✅ | Search + highlight, tag counts, undo delete, Recycle Bin |
| Projects | `/projects` | ✅ | Mobile UX overhaul, 2×2 grid, Recycle Bin |
| Learning | `/learning` | ✅ | 10 phases DB-driven, ⓘ modal, ⏱ timeline header button |
| **Interview** | `/interview` | ✅ v11.1 | 4 tabs, Supabase persistence, ⓘ modal, DS+MLE badge |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ | ML Roadmap progress, 14-day chart, velocity |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo, Recycle Bin |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ | Desktop drag-drop, mobile long-press → tap to move |
| Settings | `/settings` | ✅ | Accent themes, Google Calendar sync, templates |

---

## ✅ v11.1 Session Changes

### Interview Prep Page — 3 fixes

**Fix 1: Supabase persistence (replaces localStorage)**
- New DB table: `interview_prep` (key-value, JSONB data column)
- Key: `srn_interview_prep_v1`
- Stores: `{ topics: string[], final: number[], readiness: Record<string,number> }`
- Debounced save (800ms) after every checkbox click or slider change
- Load on mount via `useEffect` → works on ANY browser, ANY device
- Shows "✓ Progress saved to cloud" indicator in header

**Fix 2: ⓘ Info modal — top right, before readiness %**
- Circular ⓘ button opens bottom sheet (mobile) / centered modal (desktop)
- Contains full explanation of:
  - DS vs MLE role coverage (table with ✅/⚠️/❌ for each domain)
  - Learning page vs Interview page difference (purpose, time horizon, daily use)
  - Recommended daily routine (Morning = Learning, Evening = Focus timer, Monthly = Interview page)
  - When to flip (8-10 weeks before actively applying)

**Fix 3: Auto-opening domain removed**
- Changed `useState<string | null>("stats")` → `useState<string | null>(null)`
- Nothing auto-opens on page load

### Interview Prep Page — Design summary

**4 tabs:**
- **Domains** — 6 domains expandable with checkable topics + self-readiness slider per domain
- **Company** — 4 company cards (Microsoft highlighted), round types with pass rates, behavioral Qs
- **12-Week** — Weekly study plan + must-know resources
- **Checklist** — 8-item final readiness list with circular progress ring

**Header:**
- Title + "FAANG · MICROSOFT" (red) + "DS + MLE" (blue) badges
- "Covers ~80% of DS + MLE overlap. MLE needs deeper System Design & Coding."
- ⓘ button (top right) + readiness % card
- Topics studied counter + overall progress bar
- Cloud save indicator

### Key mental model (documented in ⓘ modal)
```
Learning page  = Daily driver (12-18 months). Build the skill.
Interview page = Monthly check (use monthly). Confirm the skill.

Flip point: 8-10 weeks before actively applying → Interview page becomes daily.
```

### DB: interview_prep table (new — v11.1)
```sql
CREATE TABLE IF NOT EXISTS interview_prep (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text UNIQUE NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: anon full access (same pattern as all other tables)
```
**Run in Supabase SQL Editor** — already added to `supabase-master-migration.sql`

---

## 🗃 Database Schema v11.1 (15 tables)

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
| **`interview_prep`** | **id, key (UNIQUE), data (jsonb), updated_at** — NEW v11.1 |

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

## 🗑 Recycle Bin (unchanged — 5 tables)
Soft-delete on: `todos`, `notes`, `decisions`, `projects`, `learning_phases`
**RecycleBinModal** (`src/components/RecycleBinModal.tsx`) — shared, takes `table` prop.

---

## 📱 Mobile Layout Rules

### Modal positioning pattern
```
fixed z-[61] left-0 right-0 bottom-0
maxHeight: 92dvh
borderRadius: 24px 24px 0 0
paddingBottom: calc(32px + env(safe-area-inset-bottom, 0px))
```
Desktop: `sm:fixed sm:inset-0 sm:m-auto sm:rounded-[24px] sm:max-w-lg sm:max-h-[80vh]`

---

## 🔧 Key Files Modified (v11.1)

| File | Changes |
|---|---|
| `src/app/interview/page.tsx` | Supabase persistence, ⓘ modal, null default for expandedDomain, DS+MLE content |
| `src/components/Sidebar.tsx` | Interview nav item added (checkmark icon) |
| `src/components/MobileNav.tsx` | Interview added to More sheet |
| `supabase-master-migration.sql` | `interview_prep` table added — **run this in Supabase** |

---

## 🚀 Deployment — v11.1

### Step 1 — Run NEW SQL in Supabase SQL Editor
```sql
-- Run ONLY this new block (or the full migration file):
CREATE TABLE IF NOT EXISTS interview_prep (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text UNIQUE NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_interview_prep" ON interview_prep;
CREATE POLICY "anon_all_interview_prep" ON interview_prep FOR ALL TO anon USING (true) WITH CHECK (true);
```

### Step 2 — Push to GitHub
```bash
cd "C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard"
git add -A
git commit -m "feat: v11.1 - interview prep page complete (Supabase, info modal, DS+MLE)"
git push origin main
```

### Step 3 — Verify
| Check | Expected |
|---|---|
| `/interview` loads | 4 tabs visible, nothing auto-expanded |
| ⓘ button | Opens modal with DS vs MLE table + daily routine |
| Check a topic | Saved instantly to Supabase — survives refresh |
| Open in different browser | Checkboxes still checked |
| Readiness slider | Updates the overall % in header |

---

## 📋 Dev Preferences (always follow)
- ❌ No "Claude" or "AI" branding — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Always read full file before writing replacement
- ✅ Inline styles using CSS vars (never hardcoded Tailwind colour classes)
- ✅ supabase-master-migration.sql is the single source of truth for DB

---

## ⏳ Feature Backlog (updated v11.1)

| Priority | Feature | Notes |
|---|---|---|
| 🔴 High | **Today page review** | Daily driver — needs habit + focus + task summary |
| 🔴 High | **Power BI flow bugs** | Empty Excel for compliant towers + missing Hierarchy_Master employees |
| 🔴 High | iOS 26 Liquid Glass CSS rewrite | Light mode especially |
| 🟡 Medium | Focus page BBC mobile test | Verify vh-based font on 320-430px screens |
| 🟡 Medium | AddTodoModal quick add | Skip Details/Resources, submit with title only |
| 🟡 Medium | Recycle bin auto-purge | Auto-hard-delete items older than 30 days |
| 🟡 Medium | Learning: phase reorder | Drag to reorder phases |
| 🟡 Medium | Analytics category filter | Filter 14-day chart by task category |
| 🟢 Low | Interview page: active week tracker | Highlight current week in 12-week plan |
| 🟢 Low | Data export | Export notes, focus sessions, habits to CSV |
