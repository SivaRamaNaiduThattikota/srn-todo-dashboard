# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v10.3 — Learning page added (15th page), Supabase migration, sidebar updated
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
| Design version | **v10.3** — iOS 26 Liquid Glass |
| CSS framework | **Tailwind CSS** (NOT Bootstrap) + custom CSS vars |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v10.3 (unchanged from v10.2)

### globals.css — Key rules

**Typography (v10.1+)**
```css
html { font-size: 16px; }
--font-base:  clamp(15px, ..., 16px)
--text-xs:    13px
--text-sm:    clamp(13.5px, ..., 14.5px)
--text-md:    clamp(15.5px, ..., 17px)
--text-mono:  clamp(12px, ..., 13px)
```

**Accent button text fix (v10.1)**
```css
--accent-btn-text: rgba(255,255,255,0.95);   /* dark mode */
--accent-btn-text: rgba(10,10,20,0.90);      /* light mode */
.cc-btn-accent { color: var(--accent-btn-text) !important; }
```

**Sidebar scroll fix (v10)**
```css
html, body { overflow: hidden; height: 100%; }
main { overflow-y: auto; height: 100vh; }
@media (max-width: 767px) { html, body { overflow: auto; height: auto; } main { height: auto; } }
```

### Glass Classes
`.glass` · `.liquid-glass` · `.liquid-glass-sweep` · `.glass-heavy` · `.glass-sidebar`
`.glass-modal` · `.spatial` · `.skeuo-raised` · `.clay`
`.cc-tile` · `.cc-btn` · `.cc-btn-accent` · `.cc-btn-danger` · `.cc-chip` · `.cc-habit`

---

## 🧩 Sidebar Architecture (v10.3)

### Files
- `src/components/Sidebar.tsx` — sidebar panel + floating collapse button
- `src/components/ClientLayout.tsx` — layout wrapper, margin management

### Learning nav entry (v10.3)
Learning is in `PRIMARY_NAV` (not More), positioned after Projects:
```tsx
{ href: "/learning", label: "Learning", icon: LEARNING_ICON }
```
Icon: graduation cap SVG (`M22 10v6M2 10l10-5 10 5-10 5z` + `M6 12v5c3 3 9 3 12 0v-5`).

---

## 📁 All 15 Pages — Current Status (v10.3)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ | Realtime, search, bulk ops, CSV/JSON export |
| Today | `/today` | ✅ | Inline status cycle, habit tiles, quick actions |
| Streaks | `/streaks` | ✅ | Heatmap, 5s undo delete |
| Focus | `/focus` | ✅ | 280px ring on desktop, 3×2 chips mobile, manual log |
| Notes | `/notes` | ✅ | Search + highlight, tag counts, undo delete, grid/list |
| Projects | `/projects` | ✅ | Search, deadline badge, section undo |
| **Learning** | `/learning` | ✅ | **6-phase ML/DSA roadmap, Supabase checkboxes, week schedules, practice problems** |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ | 14-day chart, velocity, agent workload |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ | Today button, click-day → AddTodoModal |
| Settings | `/settings` | ✅ | Accent themes, Google Calendar sync, templates |

---

## 🗃 Database Schema v10.3 (12 tables)

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
| **`learning_progress`** | **id, phase_id, track_index, topic_index, is_done** · UNIQUE(phase_id,track_index,topic_index) |

---

## 📚 Learning Page — Architecture (v10.3)

**File:** `src/app/learning/page.tsx`

**Data flow:**
```
Supabase learning_progress table
  ↕ fetchLearningProgress() / toggleLearningTopic()
LearningPage (client component)
  → DoneMap: Record<"phaseId-trackIdx-topicIdx", boolean>
  → Optimistic updates (instant UI, revert on error)
  → Saving indicator per-checkbox while Supabase writes
```

**Page structure:**
- Header with overall % + topic count + animated progress bar
- Phase summary pills (click to jump to phase)
- 6 expandable phase cards (liquid-glass)
  - Each card: Topics tab | Weeks tab | Practice tab
  - Topics: 2-column grid, checkboxes write to Supabase
  - Weeks: week-by-week schedule with daily goals
  - Practice: numbered problem sets

**Phases:**
| ID | Title | Duration | Color |
|---|---|---|---|
| 0 | Python for ML | Weeks 1–4 | Purple #534AB7 |
| 1 | DSA for Interviews | Weeks 3–18 (daily) | Blue #185FA5 |
| 2 | Core ML | Weeks 5–12 | Teal #0F6E56 |
| 3 | Deep Learning | Weeks 13–20 | Coral #993C1D |
| 4 | MLOps + System Design | Weeks 17–22 | Amber #854F0B |
| 5 | Portfolio + Interviews | Weeks 20–26 | Pink #993556 |

**Total topics tracked:** 62 (across all phases)

**Supabase functions (in supabase.ts):**
```ts
fetchLearningProgress(): Promise<LearningProgress[]>
toggleLearningTopic(phaseId, trackIndex, topicIndex, currentDone): Promise<void>
// Uses upsert with onConflict: "phase_id,track_index,topic_index"
```

---

## 🔧 Complete Bug Fix History

### v10.3 — This session (Learning page)
- [x] **learning-progress-migration.sql** — new `learning_progress` table, index, trigger, RLS policy
- [x] **supabase.ts** — added `LearningProgress` interface, `fetchLearningProgress`, `toggleLearningTopic`
- [x] **src/app/learning/page.tsx** — full 15th page, 6 phases, 3 tabs, Supabase checkboxes
- [x] **Sidebar.tsx** — added `/learning` to PRIMARY_NAV with graduation cap icon

### v10.2 — Sidebar collapse/expand, nav scroll, content margin fix
- [x] ClientLayout.tsx — marginLeft pure JS state, no CSS var injection
- [x] Sidebar.tsx — collapse/expand button position:fixed outside aside
- [x] Sidebar.tsx — nav flex:1 minHeight:0 overflowY:auto
- [x] Sidebar.tsx — Settings flexShrink:0 outside nav

### v10.1 — Font + button visibility
- [x] globals.css — html font-size:16px stable rem base
- [x] globals.css — --accent-btn-text var, .cc-btn-accent readable
- [x] Sidebar.tsx — nav label font-size 13.5px

### v10 — Design system + critical bugs
- [x] globals.css — select option dark bg fix
- [x] globals.css — html/body overflow:hidden + main overflow-y:auto

---

## 🚀 Deployment — v10.3 Steps

### Step 1 — Run Supabase migration (2 min)
```
Supabase Dashboard → azpjxezbackhzuoznccg → SQL Editor → New query
Paste: learning-progress-migration.sql (at project root)
Click Run
```

### Step 2 — Push to GitHub (2 min)
```bash
cd "C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard"
git add -A
git commit -m "feat: add Learning page v10.3 — ML/DSA roadmap with Supabase progress tracking"
git push origin main
```
Vercel auto-deploys. Check https://srn-todo-dashboard.vercel.app/learning after ~2 min.

### Step 3 — Verify in browser
| Check | Expected result |
|---|---|
| Sidebar | "Learning" entry visible after Projects, graduation cap icon |
| /learning loads | 6 phase cards visible, 0% initially |
| Checkbox click | Optimistic update instant, Supabase saves |
| Refresh page | Checked items persist |
| Topics / Weeks / Practice tabs | All 3 tabs work in every phase |

---

## 📋 Preferences (always follow)
- ❌ No "Claude" branding anywhere — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Build first, then explain
- ✅ Complete working files — no skeletons or placeholders
- ✅ Inline styles using CSS vars (never hardcoded Tailwind colour classes)
- ✅ Always check PROJECT-MEMORY.md at session start

---

## ⏳ Feature Backlog (future sessions)

| Priority | Feature | Notes |
|---|---|---|
| 🔴 High | Hackathon project | Azure IoT Hub + Azure ML + FastAPI patient monitoring |
| 🔴 High | ML portfolio on Projects page | Run `ds-projects-seed.sql` first |
| 🟡 Medium | Learning page: streak integration | Auto-log habit when topic checked |
| 🟡 Medium | Learning page: weekly progress chart | Show topics completed per week |
| 🟡 Medium | Analytics category filter | Filter 14-day chart by task category |
| 🟡 Medium | Briefing interactive priorities | Mark priority done from Briefing |
| 🟡 Medium | Data export | Export notes, focus sessions, habits to CSV |
| 🟢 Low | PDF documentation v10.3 | Regenerate with latest features |
| 🟢 Low | PPT presentation v10.3 | Regenerate with latest features |
