# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v10.6 — Recycle Bin, start_date, full edit modal, mobile modal fixes, projects page mobile UX overhaul
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
| Design version | **v10.6** — iOS 26 Liquid Glass |
| CSS framework | **Tailwind CSS** (NOT Bootstrap) + custom CSS vars |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v10.6 (unchanged from v10.2)
See globals.css. All CSS vars, glass classes, cc-btn, cc-tile etc. unchanged.

---

## 📁 All 15 Pages — Current Status (v10.6)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ | Realtime, search, bulk ops, CSV/JSON export, **Recycle Bin**, soft-delete |
| Today | `/today` | ✅ | Habits, tasks, ML Roadmap progress card, quick actions |
| Streaks | `/streaks` | ✅ | Heatmap horizontal-scroll on mobile, 5s undo delete |
| Focus | `/focus` | ✅ | 280px ring on desktop, 3×2 chips mobile, manual log |
| Notes | `/notes` | ✅ | Search + highlight, tag counts, undo delete, grid/list |
| Projects | `/projects` | ✅ | **Mobile UX overhaul**: 2×2 grid tabs+filters, sort on own row, full description (no clamp), tech chips wrap |
| Learning | `/learning` | ✅ | DB-driven phases, edit modal, week checkboxes, double-confirm+5s undo delete |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ | ML Roadmap progress section, 14-day chart, velocity |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ | Desktop drag-drop reschedule, mobile long-press → tap to move |
| Settings | `/settings` | ✅ | Accent themes, Google Calendar sync, templates |

---

## 🗃 Database Schema v10.6 (14 tables)

| Table | Key columns |
|---|---|
| `todos` | id, title, description, status, priority, assigned_agent, **start_date** (date), due_date, category, tags, resource_links, estimated_mins, completed_at, **deleted_at** (timestamptz — soft delete) |
| `daily_habits` | id, name, icon, color |
| `habit_log` | id, habit_id, completed_date |
| `focus_sessions` | id, todo_id, duration_minutes, completed, started_at, ended_at |
| `notes` | id, title, content, tags, is_pinned |
| `projects` | id, title, category, tech, highlights, github_url, live_url, progress, end_date, sort_order |
| `project_sections` | id, project_id, title, items, category, sort_order |
| `weekly_reviews` | id, week_start, tasks_completed, focus_minutes, streak_days, reflection, goals_next_week |
| `decisions` | id, decision, reasoning, expected_outcome, category, status, review_date, review_notes |
| `activity_log` | id, todo_id, action, old_value, new_value, created_at |
| `task_templates` | id, title, priority, recurrence |
| `learning_progress` | id, phase_id, track_index, topic_index, is_done — UNIQUE(phase_id,track_index,topic_index) |
| `learning_phases` | id (serial), sort_order, title, duration, accent_color, bg_color, text_color, milestone, resources (jsonb), tracks (jsonb), weeks (jsonb), practice (jsonb) |
| `learning_week_progress` | id (uuid), phase_id (FK→learning_phases ON DELETE CASCADE), week_index, is_done, done_at |

### New columns added this session (todos)
```sql
ALTER TABLE todos ADD COLUMN IF NOT EXISTS start_date date DEFAULT NULL;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_deleted_at ON todos (deleted_at) WHERE deleted_at IS NOT NULL;
```

---

## 🗑 Recycle Bin (v10.6)

**How soft-delete works:**
- `deleteTodo(id)` — sets `deleted_at = now()` (soft delete, moves to bin)
- `hardDeleteTodo(id)` — permanent `DELETE` from DB (only from inside bin)
- `restoreTodo(id)` — sets `deleted_at = null` (moves back to active)
- `fetchDeletedTodos()` — fetches all rows where `deleted_at IS NOT NULL`
- `emptyRecycleBin()` — hard-deletes ALL soft-deleted rows
- `fetchTodos()` — filters `.is("deleted_at", null)` so bin items never appear in task list

**Realtime fix (useRealtimeTodos.ts):**
- `UPDATE` event with `deleted_at` set → **removes from active list** (was the bug — stayed visible)
- `UPDATE` event with `deleted_at` cleared → **adds back to active list** (restore works live)
- `DELETE` event → hard delete from bin, removes from list

**RecycleBinModal UI:**
- Accessible from Tasks page header (🗑 Bin button) and footer link
- Each item shows: strikethrough title, priority badge, due date, deleted date
- Per-item: **Restore** button + **Delete forever** (asks confirmation before hard delete)
- **Empty bin** button with confirmation (permanently wipes all)
- z-index `z-[60]`/`z-[61]` — renders above bottom nav bar on mobile

---

## 📝 Todo Fields (v10.6)

**New fields added:**
- `start_date` — date when task planned to start (shown in TodoCard meta row with clock icon)
- `deleted_at` — soft-delete timestamp (null = active, non-null = in recycle bin)

**AddTodoModal (v10.6):**
- Basics tab: Title, Description, **Start date** + Due date (2-col grid), Category + Assigned (2-col grid), Priority (4-button row)
- Details tab: Estimated time, Tags (preset + custom), Category visual grid
- Resources tab: Link type picker, URL + title inputs, link list
- **Mobile fix**: Modal anchored at `bottom: 0`, `maxHeight: calc(100dvh - 64px - env(safe-area-inset-bottom))` — sits above nav bar, footer buttons always visible
- z-index `z-[60]`/`z-[61]`

**TodoCard edit mode (v10.6) — full edit, not just title+desc:**
- Title, Description (textarea)
- Start date + Due date (2-col grid)
- Priority (4 inline buttons)
- Status (4 inline buttons)
- Assigned to + Category (2-col grid)
- Tags (preset chips + custom input)
- Save changes / Cancel buttons

---

## 📚 Learning Page (v10.6)

**Phase delete — double-confirm + 5s undo:**
- Step 1: Click 🗑 → "Are you sure?" panel with Yes/Cancel
- Step 2: Click Yes → shrinking red progress bar + countdown "Deleting in Xs…" + green Undo button
- Undo cancels the `setTimeout`, phase stays
- After 5s: `deleteLearningPhase()` fires, `loadAll()` refreshes

**State used:**
```ts
deleteStep: Record<number, 1|2>    // per-phase step
pendingDelete: LearningPhase | null
undoProgress: number               // 100→0 over 5s
deleteTimerRef / deleteIntervalRef  // cleanup on undo
```

---

## 📱 Mobile Fixes (v10.6)

### Modal positioning pattern (AddTodoModal + RecycleBinModal)
```
fixed z-[61] left-0 right-0 bottom-0   ← anchored above nav bar
maxHeight: calc(100dvh - 64px - env(safe-area-inset-bottom, 0px))
borderRadius: 24px 24px 0 0
```
Desktop: `sm:inset-0 sm:flex sm:items-center sm:justify-center` → centered

### Projects page mobile UX changes
| Element | Before | After |
|---|---|---|
| Section tabs | Horizontal scroll row | `grid grid-cols-2` on mobile, flex on sm+ |
| Status filters | Horizontal scroll row | `grid grid-cols-2` on mobile |
| Sort dropdown | Crammed into filter row | Own full-width row above filters |
| Section description | Text cut off at edge | Clamped to 2 lines + `more/less` toggle |
| Tech stack chips | Horizontal scroll | `flex flex-wrap` always — never scrolls |
| Project description | `line-clamp-2` → `...` | **Removed clamp — full text always visible** |

### Streaks heatmap
- CSS Grid `gridTemplateColumns: repeat(12,1fr)` + `gridAutoFlow: column`
- Wrapped in `overflowX: auto` — scrolls horizontally on mobile only

### Calendar drag-and-drop
- Desktop: HTML5 drag events, `dragOver` highlights target cell, drop calls `updateTodo(id, {due_date})`
- Mobile: 500ms long-press → enter move mode → banner shows → tap any date to reschedule

---

## 🔧 Key Files Modified (v10.5–v10.6)

| File | Changes |
|---|---|
| `supabase-master-migration.sql` | PART 0: `todos.start_date` + `todos.deleted_at` + index. PARTS 1-4: all learning tables + 6 phase seeds |
| `src/lib/supabase.ts` | `Todo` type: `start_date`, `deleted_at`. `fetchTodos()` filters deleted. `deleteTodo()` = soft delete. New: `hardDeleteTodo`, `restoreTodo`, `fetchDeletedTodos`, `emptyRecycleBin` |
| `src/lib/useRealtimeTodos.ts` | **KEY BUG FIX**: `UPDATE` with `deleted_at` set → remove from list. `UPDATE` clearing `deleted_at` → add back to list |
| `src/app/page.tsx` | RecycleBinModal inline. Recycle bin button + footer link. `handleDelete` calls soft-delete |
| `src/components/AddTodoModal.tsx` | Added `start_date` field. Mobile footer fix (always visible above nav). z-[60]/z-[61] |
| `src/components/TodoCard.tsx` | Edit mode expanded: all fields (priority, status, start_date, due_date, agent, category, tags). Delete icon = trash can |
| `src/app/calendar/page.tsx` | Desktop HTML5 drag-drop. Mobile long-press + tap-to-reschedule |
| `src/app/streaks/page.tsx` | Heatmap horizontal scroll on mobile |
| `src/app/learning/page.tsx` | Double-confirm + 5s undo for phase delete |
| `src/app/projects/page.tsx` | Mobile UX: 2×2 grids, sort row, no clamp, tech chips wrap |
| `src/components/MobileNav.tsx` | Added `/learning` to More sheet |

---

## 🚀 Deployment — v10.6

### Step 1 — Run SQL (Supabase SQL Editor)
```
Paste: supabase-master-migration.sql
Click Run
```
Adds `start_date` + `deleted_at` to todos. Creates all learning tables. Safe to re-run.

### Step 2 — Push to GitHub
```bash
cd "C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard"
git add -A
git commit -m "feat: recycle bin, start_date, full edit modal, mobile fixes, projects UX, learning delete undo"
git push origin main
```

### Step 3 — Verify
| Check | Expected |
|---|---|
| Delete a task | Disappears immediately from task list |
| Open Recycle Bin | Deleted task appears with strikethrough |
| Restore task | Returns to task list instantly (realtime) |
| Delete forever | Asks confirmation, then permanently gone |
| Empty bin | Confirms, wipes all |
| AddTodoModal mobile | Cancel/Next/Save always visible above nav bar |
| Edit task | All fields visible: priority, status, dates, agent, category, tags |
| Projects page mobile | Tabs in 2×2 grid, full description visible |
| Learning delete | Double confirm + 5s shrinking undo bar |

---

## 📋 Dev Preferences (always follow)
- ❌ No "Claude" or "AI" branding — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Build first, then explain
- ✅ Complete working files — no skeletons or partial writes
- ✅ Always read full file before writing replacement
- ✅ Inline styles using CSS vars (never hardcoded Tailwind colour classes)
- ✅ Check all related components before changes to avoid regressions
- ✅ Mobile must be verified for every modal/sheet — use `z-[60]+`, `maxHeight: calc(100dvh - 64px - env(safe-area-inset-bottom))`
- ✅ Always check PROJECT-MEMORY.md at session start

---

## ⏳ Feature Backlog

| Priority | Feature | Notes |
|---|---|---|
| 🔴 High | AddTodoModal — Quick add from basics tab | Skip Details/Resources and submit immediately with title only |
| 🟡 Medium | Recycle bin auto-purge | Auto-hard-delete items older than 30 days |
| 🟡 Medium | Learning: phase reorder | Drag to reorder phases (update sort_order) |
| 🟡 Medium | Learning: streak integration | Auto-log habit when topic checked |
| 🟡 Medium | Analytics category filter | Filter 14-day chart by task category |
| 🟡 Medium | Briefing: interactive priorities | Mark priority done from Briefing |
| 🟡 Medium | Data export | Export notes, focus sessions, habits to CSV |
| 🟢 Low | PDF documentation v10.6 | Regenerate with latest features |
