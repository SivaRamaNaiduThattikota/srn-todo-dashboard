# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v10.4 — Learning page v2: DB-driven phases, edit modal, mobile fix, week checkboxes, Today + Analytics integration
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
| Design version | **v10.4** — iOS 26 Liquid Glass |
| CSS framework | **Tailwind CSS** (NOT Bootstrap) + custom CSS vars |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v10.4 (unchanged from v10.2)
See globals.css. All CSS vars, glass classes, cc-btn, cc-tile etc. unchanged.

---

## 📁 All 15 Pages — Current Status (v10.4)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ | Realtime, search, bulk ops, CSV/JSON export |
| Today | `/today` | ✅ | Habits, tasks, **ML Roadmap progress card**, quick actions |
| Streaks | `/streaks` | ✅ | Heatmap, 5s undo delete |
| Focus | `/focus` | ✅ | 280px ring on desktop, 3×2 chips mobile, manual log |
| Notes | `/notes` | ✅ | Search + highlight, tag counts, undo delete, grid/list |
| Projects | `/projects` | ✅ | Search, deadline badge, section undo |
| **Learning** | `/learning` | ✅ | **v2: DB-driven phases, edit modal, week checkboxes, mobile responsive, clickable resource links** |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ | **ML Roadmap progress section**, 14-day chart, velocity |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ | Today button, click-day → AddTodoModal |
| Settings | `/settings` | ✅ | Accent themes, Google Calendar sync, templates |

---

## 🗃 Database Schema v10.4 (14 tables)

| Table | Key columns |
|---|---|
| `todos` | id, title, description, status, priority, assigned_agent, due_date, category, tags, resource_links, estimated_mins, completed_at |
| `daily_habits` | id, name, icon, color |
| `habit_logs` | id, habit_id, completed_date |
| `focus_sessions` | id, todo_id, duration_minutes, completed, started_at, ended_at |
| `notes` | id, title, content, tags, pinned |
| `projects` | id, title, category, tech, highlights, github_url, live_url, progress, end_date, sort_order |
| `project_sections` | id, project_id, title, items, category, sort_order |
| `weekly_reviews` | id, week_start, tasks_completed, focus_minutes, streak_days, reflection, goals_next_week |
| `decisions` | id, decision, reasoning, expected_outcome, category, status, review_date, review_notes |
| `activity_log` | id, todo_id, action, old_value, new_value, created_at |
| `task_templates` | id, title, priority, recurrence |
| `learning_progress` | id, phase_id, track_index, topic_index, is_done — UNIQUE(phase_id,track_index,topic_index) |
| **`learning_phases`** | **id (serial), sort_order, title, duration, accent_color, bg_color, text_color, milestone, resources (jsonb), tracks (jsonb), weeks (jsonb), practice (jsonb)** |
| **`learning_week_progress`** | **id (uuid), phase_id (FK→learning_phases), week_index, is_done, done_at** |

---

## 📚 Learning Page v2 Architecture (v10.4)

**Files changed this session:**
- `learning-v2-migration.sql` — creates learning_phases + learning_week_progress, seeds 6 phases
- `src/lib/supabase.ts` — added LearningPhase, LearningWeekProgress types + 6 new functions
- `src/app/learning/page.tsx` — full rewrite: DB-driven, edit modal, week checkboxes, mobile responsive
- `src/app/today/page.tsx` — added ML Roadmap progress card (topics + weeks bars, links to /learning)
- `src/app/analytics/page.tsx` — added ML Roadmap progress section at top

**New supabase.ts functions:**
```ts
fetchLearningPhases()           → LearningPhase[]
upsertLearningPhase(payload)    → LearningPhase   (insert or update)
deleteLearningPhase(id)         → void
fetchLearningWeekProgress()     → LearningWeekProgress[]
toggleLearningWeek(phaseId, weekIndex, currentDone) → void
fetchLearningStats()            → { totalTopics, doneTopics, totalWeeks, doneWeeks }
```

**Learning page features:**
- Phases fetched from Supabase — no hardcoding
- Edit modal: 4 tabs (basic / topics / weeks / practice) with inline add/remove for all fields
- Color presets (8 presets) + custom color pickers
- Resources are `{label, url}[]` — rendered as clickable `↗` links when URL provided
- Week checkboxes — each week can be individually marked done, stored in learning_week_progress
- Week cards turn highlighted when done
- Two progress bars in header: Topics % + Weeks %
- Edit (✏) and Delete (🗑) buttons per phase — delete has inline confirm
- Mobile: all fixed px replaced with Tailwind responsive classes, resource chips wrap properly

**Today page additions:**
- ML Roadmap card shows topics done/total + weeks done/total with progress bars
- Clicking card navigates to /learning
- Quick actions now has "Learning" tile instead of "Streaks"

**Analytics page additions:**
- New "ML/DS Roadmap progress" section at top with 4 stat cards + 2 progress bars
- Clicking navigates to /learning

---

## 🚀 Deployment — v10.4 Steps

### Step 1 — Run SQL migration (3 min)
```
Supabase Dashboard → azpjxezbackhzuoznccg → SQL Editor → New query
Paste: learning-v2-migration.sql (at project root)
Click Run
```
This creates learning_phases + learning_week_progress tables and seeds all 6 phases.

### Step 2 — Push to GitHub (2 min)
```bash
cd "C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard"
git add -A
git commit -m "feat: learning page v2 — DB-driven phases, edit modal, week checkboxes, mobile fix, Today+Analytics integration"
git push origin main
```

### Step 3 — Verify in browser
| Check | Expected |
|---|---|
| /learning loads | 6 phases from Supabase, correct colors |
| Phase pills on header | Show 0% initially if no topics checked |
| ✏ edit button | Opens modal with 4 tabs, all fields editable |
| Resource links | Show as clickable `↗` chips |
| Week checkbox | Click marks done, card turns highlighted |
| Two progress bars | Topics % and Weeks % both update |
| /today | ML Roadmap card visible in right column |
| /analytics | Roadmap section visible at top |
| Mobile view | No overflow, resources wrap, grid stacks to 1 col |

---

## 📋 Preferences (always follow)
- ❌ No "Claude" branding anywhere — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Build first, then explain
- ✅ Complete working files — no skeletons
- ✅ Inline styles using CSS vars (never hardcoded Tailwind colour classes)
- ✅ Always check PROJECT-MEMORY.md at session start

---

## ⏳ Feature Backlog

| Priority | Feature | Notes |
|---|---|---|
| 🔴 High | Hackathon project | Azure IoT Hub + Azure ML + FastAPI patient monitoring |
| 🔴 High | ML portfolio on Projects page | Run `ds-projects-seed.sql` first |
| 🟡 Medium | Learning: streak integration | Auto-log habit when topic checked |
| 🟡 Medium | Learning: phase reorder | Drag to reorder phases (update sort_order) |
| 🟡 Medium | Analytics category filter | Filter 14-day chart by task category |
| 🟡 Medium | Briefing: interactive priorities | Mark priority done from Briefing |
| 🟡 Medium | Data export | Export notes, focus sessions, habits to CSV |
| 🟢 Low | PDF documentation v10.4 | Regenerate with latest features |
