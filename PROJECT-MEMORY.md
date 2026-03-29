# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v10.9 — Phase 9 (Cloud) + Phase 10 (NLP/LLMs) added, ⓘ modal now includes full Realistic Timeline with current phase highlighted, ⏱ Timeline modal in header, header layout fixed (% inline with buttons)
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
| Design version | **v10.9** — iOS 26 Liquid Glass |
| CSS framework | **Tailwind CSS** (NOT Bootstrap) + custom CSS vars |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v10.9 (unchanged from v10.2)
See `globals.css`. All CSS vars, glass classes, cc-btn, cc-tile etc. unchanged.
Inline styles with CSS vars only — never hardcoded Tailwind colour classes.

---

## 📁 All 15 Pages — Current Status (v10.9)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ | Realtime, search, bulk ops, CSV/JSON export, Recycle Bin, soft-delete |
| Today | `/today` | ✅ | Habits, tasks, ML Roadmap progress card, quick actions |
| Streaks | `/streaks` | ✅ | Heatmap horizontal-scroll on mobile, 5s undo delete |
| Focus | `/focus` | ✅ | 280px ring on desktop, 3×2 chips mobile, manual log |
| Notes | `/notes` | ✅ | Search + highlight, tag counts, undo delete, grid/list, Recycle Bin |
| Projects | `/projects` | ✅ | Mobile UX overhaul: 2×2 grid tabs+filters, sort on own row, tech chips wrap, Recycle Bin |
| Learning | `/learning` | ✅ | **10 phases** DB-driven, ⓘ modal (timeline + tracks + weeks + resources), ⏱ timeline header button, header layout fixed, Recycle Bin |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ | ML Roadmap progress section, 14-day chart, velocity |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo, Recycle Bin |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ | Desktop drag-drop reschedule, mobile long-press → tap to move |
| Settings | `/settings` | ✅ | Accent themes, Google Calendar sync, templates |

---

## 🗃 Database Schema v10.9 (14 tables)

| Table | Key columns |
|---|---|
| `todos` | id, title, description, status, priority, assigned_agent, **start_date** (date), due_date, category, tags, resource_links, estimated_mins, completed_at, **deleted_at** (timestamptz) |
| `daily_habits` | id, name, icon, color |
| `habit_log` | id, habit_id, completed_date |
| `focus_sessions` | id, todo_id, duration_minutes, completed, started_at, ended_at |
| `notes` | id, title, content, tags, is_pinned, **deleted_at** |
| `projects` | id, title, category, tech, highlights, github_url, live_url, progress, end_date, sort_order, **deleted_at** |
| `project_sections` | id, project_id, title, items, category, sort_order |
| `weekly_reviews` | id, week_start, tasks_completed, focus_minutes, streak_days, reflection, goals_next_week |
| `decisions` | id, decision, reasoning, expected_outcome, category, status, review_date, review_notes, **deleted_at** |
| `activity_log` | id, todo_id, action, old_value, new_value, created_at |
| `task_templates` | id, title, priority, recurrence |
| `learning_phases` | id (serial), sort_order, title, duration, accent_color, bg_color, text_color, milestone, resources (jsonb), tracks (jsonb), weeks (jsonb), practice (jsonb), **deleted_at** |
| `learning_progress` | id, phase_id (FK→learning_phases CASCADE), track_index, topic_index, is_done, done_at — UNIQUE(phase_id,track_index,topic_index) |
| `learning_week_progress` | id (uuid), phase_id (FK→learning_phases CASCADE), week_index, is_done, done_at — UNIQUE(phase_id,week_index) |

---

## 📚 ML/DS Learning Roadmap — 10 Phases (v10.9)

| Phase | Title | Tracks | Topics | Weeks | Milestone | Color |
|---|---|---|---|---|---|---|
| 1 | Python for ML | 2 | 10 | 4 | 30 LeetCode Easy in Python | Purple `#534AB7` |
| 2 | DSA for Interviews | 2 | 14 | 6 | 100 LC problems + mock interview | Blue `#185FA5` |
| 3 | Core ML | 2 | 12 | 8 | 3 Kaggle notebooks published | Green `#0F6E56` |
| 4 | Deep Learning | 2 | 10 | 7 | End-to-end DL project on GitHub | Orange-red `#993C1D` |
| 5 | MLOps + ML System Design | **3** | **24** | **8** | Deploy REST API + Record 45-min mock | Amber `#854F0B` |
| 6 | Portfolio + Interviews | 2 | 11 | 7 | 3 projects + Resume + LinkedIn | Pink `#993556` |
| 7 | SQL + Data Engineering | **3** | **24** | 4 | Solve 30 SQL Medium on DataLemur | Teal `#1D6B8C` |
| 8 | Statistics + Probability | **3** | **24** | 4 | Design + analyze a full mock A/B test | Purple `#5A3B8C` |
| 9 | Cloud — AWS / GCP | **3** | **24** | 6 | Deploy ML model on SageMaker or Vertex AI | Green `#0F6E56` |
| 10 | NLP / LLMs Expanded | **3** | **24** | 6 | Build + deploy RAG app with vector DB | Orange `#854F0B` |

**Total: 10 phases · ~177 topics · 60 planned weeks · setval = 15**

### Phase 5 expanded (v10.8)
- Title changed: "MLOps + System Design" → "MLOps + ML System Design"
- 3 tracks: MLOps Essentials (8) · ML System Design Core (8) · Case Studies (8)
- Chip Huyen full book (all 11 chapters), Netflix/Uber/Airbnb engineering blogs
- 10 must-do system design walkthroughs (YouTube recs, fraud, Instagram, Ad CTR…)
- Milestone: "Deploy 1 model as REST API · Record a 45-min ML system design mock"

### Phase 7 — SQL + Data Engineering (new, v10.8)
- 3 tracks: Core SQL (8) · Data Engineering Concepts (8) · Interview SQL Patterns (8)
- Resources: DataLemur, StrataScratch, BigQuery Sandbox, PySpark Docs, Mode SQL
- Milestone: Solve 30 SQL Medium on DataLemur

### Phase 8 — Statistics + Probability (new, v10.8)
- 3 tracks: Probability Foundations (8) · Statistical Inference (8) · A/B Testing & Applied Stats (8)
- Resources: StatQuest, Khan Academy, Seeing Theory, Think Stats, Naked Statistics
- Milestone: Design and analyze a full mock A/B test end to end

### Phase 9 — Cloud — AWS / GCP (new, v10.9)
- 3 tracks: Cloud Fundamentals (8) · ML on Cloud (8) · Data Engineering on Cloud (8)
- Resources: AWS Free Tier, SageMaker docs, GCP Free Tier, Vertex AI docs, A Cloud Guru, AWS ML Specialty cert
- Milestone: Deploy 1 ML model end-to-end on SageMaker or Vertex AI

### Phase 10 — NLP / LLMs Expanded (new, v10.9)
- 3 tracks: NLP Foundations + Modern Transformers (8) · LLM Engineering (8) · RAG + Vector Databases (8)
- Resources: HuggingFace, LangChain, OpenAI Cookbook, Pinecone, Chip Huyen AI Engineering
- Milestone: Build and deploy a RAG application with a vector database

---

## 🗑 Recycle Bin — All 5 Tables (v10.7+)

Soft-delete (`deleted_at`) is implemented on: `todos`, `notes`, `decisions`, `projects`, `learning_phases`.

**Pattern (same for all tables):**
- `deleteX(id)` → sets `deleted_at = now()`
- `hardDeleteX(id)` → permanent DELETE (only from bin UI)
- `restoreX(id)` → sets `deleted_at = null`
- `fetchDeletedX()` → WHERE deleted_at IS NOT NULL
- `emptyRecycleBin(table)` → hard-deletes all soft-deleted rows

**RecycleBinModal** (`src/components/RecycleBinModal.tsx`):
- Shared component, takes `table` prop: `"todos" | "notes" | "decisions" | "projects" | "learning_phases"`
- z-index `z-[60]`/`z-[61]` on mobile, centered modal on desktop

---

## 📖 Learning Page — Key UI Details (v10.9)

### Header layout (fixed v10.9)
```
[ML/DS Learning Roadmap]    [0%  0/177]  [⏱]  [🗑]  [+ Phase]
[8 phases · Python + ML...]
```
All elements on one `flex items-center` row. `0%` and count use `items-baseline`.

### ⏱ Timeline Modal (header button)
- Green accent (`#5ecf95`), shows all 10 phases with time + priority
- Exact match of the Realistic Timeline image shared by SRN
- 💡 tip: "Start SQL now — your Power BI background means you are already close"

### ⓘ Phase Info Modal (per-phase button)
Opens a scrollable bottom sheet (mobile) / centered modal (desktop) containing:
1. **Progress ring** (circular, phase accent colour, % of topics done)
2. **Milestone banner** (star icon + milestone text)
3. **4 stat chips**: Topics done/total · Weeks done/total · Track count · Resource count
4. **Topics by track** — compact rows showing each track + topic count
5. **Week-by-week plan** — numbered week cards with goals
6. **⏱ Realistic Timeline** — full 10-row table, **current phase highlighted** with accent bar + tinted background row
7. **Resources & links** — clickable pill links to all resources

### TIMELINE_ROWS mapping (in learning/page.tsx)
```ts
{ phase: "SQL + Data Engineering",   phaseId: 7,  dot: "#f87171", priority: "Start now"         }
{ phase: "Stats + Probability",      phaseId: 8,  dot: "#f87171", priority: "High"               }
{ phase: "Core ML",                  phaseId: 3,  dot: "#f87171", priority: "High"               }
{ phase: "DSA for Interviews",       phaseId: 2,  dot: "#f87171", priority: "Never stop"         }
{ phase: "Deep Learning",            phaseId: 4,  dot: "#fbbf24", priority: "Medium"             }
{ phase: "Cloud — AWS / GCP",        phaseId: 9,  dot: "#fbbf24", priority: "Medium"             }
{ phase: "MLOps + ML System Design", phaseId: 5,  dot: "#fbbf24", priority: "Medium"             }
{ phase: "NLP / LLMs Expanded",      phaseId: 10, dot: "#fbbf24", priority: "Medium"             }
{ phase: "Portfolio + Interviews",   phaseId: 6,  dot: "#5ecf95", priority: "Last stretch"       }
{ phase: "Python for ML",            phaseId: 1,  dot: "#534AB7", priority: "Foundation"         }
```

### Phase delete — double-confirm + 5s undo
- Step 1: Click 🗑 → confirmation panel (Yes / Cancel)
- Step 2: Click Yes → shrinking red progress bar + countdown "Deleting in Xs…" + green Undo
- After 5s: `deleteLearningPhase(id)` fires (soft delete → recycle bin)

---

## 🔧 SQL Files on Disk

| File | Purpose | Status |
|---|---|---|
| `supabase-master-migration.sql` | **THE ONE FILE TO RUN** — everything v10.9 | ✅ Current |
| `phases-7-8-and-phase5-update.sql` | Phase 5 UPDATE + Phase 7 + Phase 8 | ✅ Merged into master |
| `phases-9-10-seed.sql` | Phase 9 (Cloud) + Phase 10 (NLP/LLMs) | ✅ Merged into master |

> **Always run `supabase-master-migration.sql` only.** The other SQL files are superseded.

---

## 📱 Mobile Fixes (v10.6–v10.9)

### Modal positioning pattern
```
fixed z-[61] left-0 right-0 bottom-0
maxHeight: calc(100dvh - 64px - env(safe-area-inset-bottom, 0px))
borderRadius: 24px 24px 0 0
```
Desktop: `sm:inset-0 sm:flex sm:items-center sm:justify-center` → centered

### Phase Info Modal mobile
- Bottom sheet on mobile (slide-up animation, drag handle)
- Centered on `sm:` breakpoint
- `z-[62]` (above nav bar and recycle bin modal)
- `maxHeight: 92dvh` with `overflow-y: auto` scrollable body

---

## 🔧 Key Files Modified (cumulative to v10.9)

| File | Changes |
|---|---|
| `supabase-master-migration.sql` | **Complete v10.9** — all tables, all 10 phase seeds, Phase 5 update, setval=15 |
| `src/app/learning/page.tsx` | 10-phase roadmap, ⓘ modal (full timeline + tracks + weeks + resources), ⏱ header button, header layout fix, TIMELINE_ROWS with phaseId mapping |
| `src/lib/supabase.ts` | Soft-delete for all 5 tables, learning progress functions, `emptyRecycleBin(table)` generic |
| `src/components/RecycleBinModal.tsx` | Shared modal, takes `table` prop, handles all 5 tables |
| `src/app/page.tsx` | Recycle Bin for todos |
| `src/app/notes/page.tsx` | Recycle Bin for notes |
| `src/app/decisions/page.tsx` | Recycle Bin for decisions |
| `src/app/projects/page.tsx` | Recycle Bin for projects, mobile UX (2×2 grid, no clamp, tech chips wrap) |
| `src/components/AddTodoModal.tsx` | start_date field, mobile footer fix (always visible above nav) |
| `src/components/TodoCard.tsx` | Full edit mode: all fields, trash can icon |
| `src/app/calendar/page.tsx` | Desktop HTML5 drag-drop, mobile long-press + tap-to-reschedule |
| `src/app/streaks/page.tsx` | Heatmap horizontal scroll on mobile |

---

## 🚀 Deployment — v10.9

### Step 1 — Run SQL (Supabase SQL Editor)
```
File: supabase-master-migration.sql
Paste entire file → Run
```
Idempotent — safe to run on a fresh or existing DB.

### Step 2 — Push to GitHub
```bash
cd "C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard"
git add -A
git commit -m "feat: 10-phase roadmap, ⓘ modal with timeline, Phase 9+10 seeds, header fix"
git push origin main
```

### Step 3 — Verify
| Check | Expected |
|---|---|
| Learning page loads | 10 phases visible with coloured phase pills |
| ⏱ button in header | Opens Realistic Timeline modal (10 rows, matching screenshot) |
| ⓘ button on any phase | Opens info modal — scroll to see Timeline table with that phase highlighted |
| Phase 9 (Cloud) | Green card, SageMaker milestone, 24 topics |
| Phase 10 (NLP/LLMs) | Orange card, RAG milestone, 24 topics |
| Header layout | 0% and 0/177 inline with ⏱ 🗑 + Phase buttons on same row |
| Recycle bin | Works on all 5 tables |

---

## 📋 Dev Preferences (always follow)
- ❌ No "Claude" or "AI" branding — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Build first, then explain
- ✅ Complete working files — no skeletons or partial writes
- ✅ Always read full file before writing replacement
- ✅ Inline styles using CSS vars (never hardcoded Tailwind colour classes)
- ✅ Check all related components before changes to avoid regressions
- ✅ Mobile: `z-[60]+`, `maxHeight: calc(100dvh - 64px - env(safe-area-inset-bottom))`
- ✅ Always check PROJECT-MEMORY.md at session start
- ✅ supabase-master-migration.sql is THE single source of truth for DB — always keep it current

---

## ⏳ Feature Backlog

| Priority | Feature | Notes |
|---|---|---|
| 🔴 High | iOS 26 Liquid Glass CSS rewrite | Light mode especially — globals.css overhaul |
| 🔴 High | DS Interview Prep PDF integration | Content from PDF into Learning phases |
| 🟡 Medium | AddTodoModal — Quick add | Skip Details/Resources, submit with title only |
| 🟡 Medium | Recycle bin auto-purge | Auto-hard-delete items older than 30 days |
| 🟡 Medium | Learning: phase reorder | Drag to reorder phases (update sort_order) |
| 🟡 Medium | Learning: streak integration | Auto-log habit when topic checked |
| 🟡 Medium | Analytics category filter | Filter 14-day chart by task category |
| 🟡 Medium | Briefing: interactive priorities | Mark priority done from Briefing |
| 🟡 Medium | Data export | Export notes, focus sessions, habits to CSV |
| 🟢 Low | PDF documentation v10.9 | Regenerate with latest features |
