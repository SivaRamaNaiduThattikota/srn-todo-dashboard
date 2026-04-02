# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v11.4 — Pomodoro breaks, sound/vibration/notifications, wall-clock timer, checklist feature, splitflap fix, h/m time formatting, tasks header overflow menu
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
| Design version | **v11.4** — iOS 26 Liquid Glass |
| CSS framework | **Tailwind CSS** + custom CSS vars in globals.css |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v11.4 (globals.css is source of truth)
Key classes: `.liquid-glass`, `.liquid-glass-sweep`, `.cc-btn`, `.cc-btn-accent`, `.cc-chip`, `.cc-tile`, `.cc-habit`
CSS vars: `--accent`, `--glass-fill`, `--glass-border`, `--specular-top`, `--cc-glass-base`, `--shadow-xl`
Inline styles with CSS vars only — never hardcoded Tailwind colour classes.

---

## 📁 All 16 Pages — Current Status (v11.4)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ v11.4 | Checklist per task (Supabase-persisted), checklist badge on card, focus time panel, quick add bar, h/m time format |
| Today | `/today` | ✅ v11.3 | Habits, tasks, stats, ML roadmap, 6 quick actions, h/m focus time format |
| Streaks | `/streaks` | ✅ | Heatmap horizontal-scroll on mobile, 5s undo delete |
| Focus | `/focus` | ✅ v11.4 | Pomodoro breaks, wall-clock timer (no drift), simultaneous splitflap animation, pause button, sound+vibration+browser notifications, session counter dots, break settings panel, h/m format everywhere |
| Notes | `/notes` | ✅ | Search + highlight, tag counts, undo delete, Recycle Bin |
| Projects | `/projects` | ✅ | Mobile UX overhaul, 2×2 grid, Recycle Bin |
| Learning | `/learning` | ✅ | 10 phases DB-driven, ⓘ modal, ⏱ timeline header button |
| Interview | `/interview` | ✅ v11.1 | 4 tabs, Supabase persistence, ⓘ modal, DS+MLE badge |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ v11.3 | ML Roadmap progress, 14-day chart, velocity, checklist completion section |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo, Recycle Bin |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ | Desktop drag-drop, mobile long-press → tap to move |
| Settings | `/settings` | ✅ v11.1 | Accent themes, Google Calendar sync, templates, Export & Backup |

---

## ✅ v11.3–v11.4 Session Changes

### Tasks Page (`src/app/page.tsx`) — v11.4
- **Checklist feature** — per-task checklist stored as `jsonb` in Supabase `todos.checklist` column
  - Inline add (type + Enter), checkbox toggle, × to delete items
  - Green progress bar showing X/Y · %
  - Badge on collapsed card row: `☑ 2/4`
  - Persists across refresh (Supabase-backed)
- **`ChecklistItem` type** added to `supabase.ts`
- **`ChecklistInput` component** — dashed + icon, Add button appears on type
- **Focus time panel** in expanded card — Estimated / Focused / Remaining with progress bar
- **Focus badge** on collapsed card row `⏱ Xm / Xh Xm`
- **Est: field** — h/m format (180m → 3h, not 180m)
- **Header buttons** — ⊞ CSV JSON Bulk restored to original positions (hidden sm:flex)
- SQL run: `ALTER TABLE todos ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb`

### Focus Page (`src/app/focus/page.tsx`) — v11.4 (complete rewrite)
- **Wall-clock timer** — uses `Date.now()` + `startedAtRef`, polls every 250ms. Zero drift even if browser throttles tab
- **Pause / Resume** — saves elapsed ms on pause, restarts from saved offset on resume
- **Pomodoro break system:**
  - Session complete → sound + vibration + browser notification → fullscreen switches to break-ready screen
  - Short break (default 5m) after sessions 1,2,3 — Long break (default 15m) after every 4th
  - User manually starts break (not auto)
  - Skip break button
  - Break timer in fullscreen — green colour scheme (`#5ecf95` / `#34d399`)
  - End break early button
  - Break done → different sound + vibration + notification "Ready to focus?"
- **Sound** — `playFocusDone()` (4-tone rising chime, vol 0.22) + `playBreakDone()` (2-tone descending). Uses `AudioContext` — respects device volume/mute buttons
- **Vibration** — `navigator.vibrate([300,100,300,100,500])` on focus done, `[500,100,200]` on break done
- **Browser notifications** — `Notification API`, one-time permission in ⚙ Settings panel. Works in background tabs
- **Session counter dots** — `● ● ○ ○` in fullscreen header, under clock, and in sidebar
- **⚙ Settings panel** — short break (3/5/7/10m or custom), long break (10/15/20/30m or custom), notification permission toggle, session counter reset
- **Splitflap animation** — simultaneous flip + number change at t=0. 3-layer architecture: static bottom (new), static top (new), animated flap (old folds away via `sfFlap` keyframe)
- **h/m format everywhere** — header subtitle, fullscreen header, insights sidebar, recent sessions list
- **`React` default import** added (fixes `React.CSSProperties` crash)
- **handleStart try/catch** — shows error toast if Supabase fails, "Starting…" loading state
- **handleCompleteRef** — fixes stale closure when timer hits zero

### Analytics Page (`src/app/analytics/page.tsx`) — v11.3
- **Checklist completion section** — avg % bar + incomplete tasks list with colour-coded per-task bars
- Appears only when tasks have checklists

### Today Page (`src/app/today/page.tsx`) — v11.3
- Focus time stat uses h/m format

### supabase.ts — v11.4
- `ChecklistItem` interface: `{ id: string; text: string; done: boolean }`
- `Todo` interface: added `checklist: ChecklistItem[]`
- `fetchTodos`, `addTodo`, `fetchDeletedTodos` all normalize `checklist: t.checklist ?? []`

---

## 🗃 Database Schema v11.4 (15 tables + 1 new column)

| Table | Key columns |
|---|---|
| `todos` | id, title, description, status, priority, assigned_agent, start_date, due_date, category, tags, resource_links, estimated_mins, completed_at, deleted_at, **checklist (jsonb, default '[]')** |
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

### SQL run this session
```sql
ALTER TABLE todos ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;
```

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

## 🔧 Key Files Modified (v11.3–v11.4)

| File | Changes |
|---|---|
| `src/app/page.tsx` | Checklist feature, ChecklistInput component, focus time panel, focus badge, Est: h/m format, header buttons restored |
| `src/app/focus/page.tsx` | Complete rewrite — wall-clock timer, pomodoro breaks, sound, vibration, notifications, splitflap fix, pause, session dots, settings panel, h/m everywhere |
| `src/app/analytics/page.tsx` | Checklist completion section added |
| `src/app/today/page.tsx` | Focus time h/m format |
| `src/lib/supabase.ts` | ChecklistItem type, checklist field on Todo, normalize in fetch functions |
| `PROJECT-MEMORY.md` | Updated to v11.4 |

---

## 🔊 Focus Timer — Sound & Notification Architecture

### Audio (`AudioContext` — no import needed, self-contained in focus/page.tsx)
| Function | Tones | Volume | Trigger |
|---|---|---|---|
| `playFocusDone()` | 523→659→784→1047 Hz, 4 tones | 0.22 | Session completes |
| `playBreakDone()` | 784→523 Hz, 2 tones descending | 0.20 | Break ends |

- Respects device volume/mute/power button (AudioContext plays in media channel)

### Vibration (`navigator.vibrate`)
| Pattern | Trigger |
|---|---|
| `[300,100,300,100,500]` | Focus session complete |
| `[500,100,200]` | Break complete |

### Browser Notifications (`Notification API`)
- One-time permission request via ⚙ Settings panel on focus page
- Works when tab is backgrounded
- Focus done → "Focus session complete! 🎯" + break type
- Break done → "Break over! 💪"

---

## ⏱ Focus Timer — Wall-Clock Architecture

```
startedAtRef     — Date.now() when session started or resumed
elapsedBeforePauseRef — accumulated ms before current run window
totalMs.current  — total session duration in ms

Poll every 250ms:
  elapsed   = elapsedBeforePauseRef + (Date.now() - startedAtRef)
  remaining = max(0, totalMs - elapsed)
  setTimeLeft(ceil(remaining / 1000))
```
- Zero drift even if browser throttles background tab
- Same architecture for break timer (`breakStartedAtRef`, `breakTotalMs`)

---

## 🍅 Pomodoro Architecture

| State | Meaning |
|---|---|
| `sessionsDone` | Total sessions completed this run (resets on page reload) |
| `fullscreenMode` | `"focus"` / `"break-ready"` / `"break-running"` |
| `shortBreakMins` | Default 5, user-adjustable 1–30 |
| `longBreakMins` | Default 15, user-adjustable 5–60 |
| `breakType` | `"short"` if sessionsDone%4 ≠ 0, `"long"` if sessionsDone%4 === 0 |

Break cycle: sessions 1,2,3 → short break · session 4 → long break → counter resets

---

## 🚀 Deployment — v11.4

### SQL already run
```sql
-- Checklist column (already applied)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;
```

### Push to GitHub
```bash
cd "C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard"
git add -A
git commit -m "feat: v11.4 - checklist, pomodoro breaks, wall-clock timer, splitflap fix, h/m format"
git push origin main
```

---

## 📋 Dev Preferences (always follow)
- ❌ No "Claude" or "AI" branding — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Always read full file before writing replacement
- ✅ Inline styles using CSS vars only
- ✅ `supabase-master-migration.sql` is single source of truth for DB schema
- ✅ `sql-patch-*.sql` files for targeted DB upgrades
- ✅ Discuss changes before implementing
- ✅ Prefer manual change instructions over full file rewrites
- ✅ h/m format for all time displays (never raw minutes > 60)
- ✅ All time values: `m < 60 ? Xm : Xh [Ym]` pattern

---

## ⏳ Feature Backlog (updated v11.4)

| Priority | Feature | Notes |
|---|---|---|
| 🔴 High | **Power BI flow bugs** | Empty Excel for compliant towers + missing Hierarchy_Master employees |
| 🟡 Medium | Focus page BBC mobile test | Verify vh-based font on 320–430px screens |
| 🟡 Medium | Recycle bin auto-purge | Auto-hard-delete items older than 30 days |
| 🟡 Medium | Learning: phase reorder | Drag to reorder phases |
| 🟡 Medium | Analytics category filter | Filter 14-day chart by task category |
| 🟢 Low | Interview page: active week highlight | Highlight current week in 12-week plan |
| 🟢 Low | Today page: focus start shortcut | One-tap focus start with last used duration |

---

## 🐛 Known Code Quality Issues (non-breaking)

| Page | Issue | Impact |
|---|---|---|
| Tasks, Today, Notes, Streaks, Decisions | `handle*` functions have `await` but no try/catch | Silent failures if Supabase errors — no toast shown |
| Tasks | `crypto.randomUUID()` for checklist IDs | Works in all modern browsers; may fail on very old Android WebViews |
| Tasks | `assigned_agent: "srn"` hardcoded in quick add | Intentional for personal dashboard |
