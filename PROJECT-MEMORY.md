# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v12.4 — All 8 backlog items completed: notification read state, sidebar badge, notebooks page, calendar real times, period totals, browse icon real filters, interview active week, score widget link
> **Stack:** Next.js 14 · Supabase (Mumbai) · Tailwind CSS · TypeScript · Framer Motion

---

## 🗂 Project Identity

| Field | Value |
|---|---|
| Name | SRN Command Center |
| Owner | Siva Rama Naidu (SRN) |
| Live URL | https://srn-todo-dashboard.vercel.app/ |
| Local path | `C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard` |
| GitHub repo | srn-todo-dashboard (auto-deploys to Vercel on push) |
| Supabase project ID | `azpjxezbackhzuoznccg` (Mumbai region) |
| Design version | **v12.4** — iOS 26 Liquid Glass + Evernote-inspired UI components |
| CSS framework | Tailwind CSS + custom CSS vars in globals.css |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v12.3 (globals.css is source of truth)

### Core classes
`.liquid-glass`, `.liquid-glass-sweep`, `.cc-btn`, `.cc-btn-accent`, `.cc-chip`, `.cc-tile`, `.cc-habit`

### CSS variables (ALL components must use these — never hardcode hex)
`--accent`, `--accent-light`, `--accent-muted`, `--accent-dim`, `--accent-glow`
`--glass-fill`, `--glass-border`, `--specular-top`, `--cc-glass-base`, `--shadow-xl`
`--text-primary`, `--text-secondary`, `--text-muted`, `--bg-input`

### Color rule (v12.3 — critical)
- ALL inline styles must use CSS variables, never hardcoded hex like `#7c6ffd` or `rgba(124,111,253,...)`
- This ensures accent theme switching (green/blue/purple/orange/pink/cyan) works across all components
- New components added in v12.1–v12.3 all updated to use CSS vars

### v12.1 UI additions to globals.css
New utility classes appended at bottom of globals.css:
`.action-card-link`, `.ac-purple/.ac-amber/.ac-teal/.ac-pink` (action card colour variants)
`.note-card-purple/.note-card-teal/.note-card-amber` (note tint variants)
`.chip-priority/.chip-productive/.chip-ml/.chip-date` (tag chip variants)
`.seg-tabs` + `.seg-tab.active` (segment tab toggle)
`.browse-row` + `.browse-item` + `.browse-icon-{color}` (browse icon row)
`.cal-week-strip` + `.cal-day-btn.selected` (calendar week pill strip)
`.cal-event.cal-event-{pink|blue|purple|teal}` (event cards with left-border accent)
`.cal-break-tag` (amber break pill between events)
`.nb-list-card` + `.nb-list-icon` + `.nb-icon-{color}` (notebook list items)
`.notif-item` + `.notif-icon-bubble.notif-icon-{color}` (notification feed items)
`.section-label-row` + `.section-label-text` + `.section-see-all` (section headers)

---

## 📁 All 17 Pages — Current Status (v12.3)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ v11.4 | Checklist per task, focus time panel, quick add bar, h/m time format |
| Today | `/today` | ✅ v12.3 | ActionCards, stats, ML roadmap compact row, ProductivityGoalCard (3 real tabs) |
| Streaks | `/streaks` | ✅ v12.0 | Heatmap sliding window (prev/next 7-day), long-press tooltip mobile |
| Focus | `/focus` | ✅ v12.0 | Auto Pomodoro mode, screen-off fixes, history chart sliding window, day detail panel |
| Notes | `/notes` | ✅ v12.1 | Browse icons row, tinted NoteCards, section header + See All, tag chips |
| Projects | `/projects` | ✅ | Mobile UX overhaul, 2×2 grid, Recycle Bin |
| Learning | `/learning` | ✅ | 10 phases DB-driven, ⓘ modal, ⏱ timeline header button |
| Interview | `/interview` | ✅ v11.1 | 4 tabs, Supabase persistence, ⓘ modal, DS+MLE badge |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ v12.0 | Sliding window chart, click-to-detail panel (created + completed tasks per day) |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo, Recycle Bin |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ v12.2 | CalendarWeekStrip, day timeline view on click, coloured event cards, break tags |
| Settings | `/settings` | ✅ v11.1 | Accent themes, Google Calendar sync, templates, Export & Backup |
| **Notebooks**      | `/notebooks`      | ✅ **NEW v12.4** | Groups notes by tag into 6 notebooks (ML, SQL, Interview, Projects, Concepts, Daily) with colored icon tiles |
| **Notifications** | `/notifications` | ✅ v12.4 | Per-item read state (localStorage), unread count badge on sidebar, Mark all as read |

---

## ✅ v12.4 Session Changes (8 backlog items completed)

### #1 — Notifications: per-item read state
- localStorage key `srn-notif-read-ids` stores Set of read notification IDs
- Clicking any notification item marks it read immediately
- Unread items: accent-muted background, bold title, accent dot on left
- Read items: transparent bg, normal weight, 75% opacity
- "Mark all as read" now actually persists to localStorage
- Broadcasts `srn:notif-read` CustomEvent with unread count for sidebar

### #2 — Sidebar: unread badge on Notifications
- `NavLink` component updated with optional `badge?: number` prop
- Collapsed mode (icon-only): small dot badge top-right of icon
- Expanded mode: accent pill badge right-aligned in nav row
- Sidebar listens to `srn:notif-read` CustomEvent to update count
- Count initialised from localStorage on mount

### #3 — Notebooks page (`/notebooks`)
- New route `/notebooks`, added to sidebar MORE_NAV
- 6 notebook definitions with tag-based grouping:
  - ML Learning (ml, deep-learning, llm, nlp, stats)
  - SQL & DSA (sql, dsa, python)
  - Interview Prep (interview, system-design)
  - Projects & MLOps (project, mlops, cloud)
  - Concepts (concept)
  - Daily Notes (pinned + unassigned catch-all)
- Grid of colored icon tiles → click to drill into note list
- Each notebook shows note count + last updated date
- Clicking a note navigates to `/notes`
- Back button returns to notebook grid

### #4 — Calendar: real start times on event cards
- Day timeline tasks now sorted by `start_date` first, then `estimated_mins`
- If task has `start_date`: shows `9:00 AM – 10:30 AM` format (start + end computed from estimated_mins)
- If no `start_date`: falls back to `~1h 30m` duration display as before
- No DB migration needed — `start_date` column already exists in `todos` table

### #5 — ProductivityGoalCard: real totals per period
- New `fetchPeriodTotals()` in supabase.ts — returns `{ daily, weekly, monthly }` completed counts
- `periodTotals` prop added to ProductivityGoalCard
- Daily tab: shows completed today / total completed today (real)
- Weekly tab: shows completed this week / max(todos total, weekly completed)
- Monthly tab: shows completed this month / total completed this month (real)
- "Total tasks" label updates to show period name: "Total (daily)" / "Total (weekly)" / "Total (monthly)"

### #6 — Notes browse icons: real filters
- ⭐ Shortcuts: sorts notes to show pinned first
- 🏷 Tags: focuses search input (unchanged — correct behaviour)
- 🕐 Recent: filters to notes updated in last 24 hours, sorted newest first
- 📌 Pinned: filters to pinned notes only, then reloads

### #7 — Interview page: active week highlight
- 12-week plan now shows a "CURRENT" badge on the estimated current week
- Heuristic: week index = `floor(topicsCheckedPct × 6)` — as you check off topics, current week advances
- Active week card gets a coloured outline ring matching the week's colour
- No hardcoded date — purely driven by your actual study progress

### #8 — Daily score → Analytics link
- Daily score widget in Today page header wrapped in `<Link href="/analytics">`
- `hover-lift` class added for hover feedback
- Clicking the score number now navigates to `/analytics`

### Files changed in v12.4
| File | Changes |
|---|---|
| `src/app/notifications/page.tsx` | Per-item read state, unread count, Mark all as read functional |
| `src/components/Sidebar.tsx` | NavLink `badge` prop, unread count state, CustomEvent listener, Notebooks added |
| `src/app/notebooks/page.tsx` | NEW PAGE — 6 notebook groups, colored tiles, drill-in view |
| `src/app/calendar/page.tsx` | Sort by start_date, time range display on event cards |
| `src/app/today/page.tsx` | `fetchPeriodTotals` added, score widget → Analytics link, `periodTotals` prop |
| `src/components/ProductivityGoalCard.tsx` | `periodTotals` prop, accurate per-tab totals |
| `src/app/notes/page.tsx` | Browse icons: Shortcuts=pinned sort, Recent=last 24h, Pinned=filter |
| `src/app/interview/page.tsx` | Active week highlight badge + coloured outline ring |
| `src/lib/supabase.ts` | `fetchPeriodTotals()` function added |
| `PROJECT-MEMORY.md` | Updated to v12.4 |

---

## ✅ v12.1–v12.3 Session Changes

### New Components (`src/components/`)

#### `ActionCards.tsx` — v12.3
- 4 gradient action cards: New Note (accent), New Task (amber), Focus Timer (teal), Learning (pink)
- First card uses `var(--accent)` CSS vars to respect theme
- Hover scale animation, decorative circle, icon badge top-right
- Replaces old `cc-tile` quick actions grid in Today right column

#### `NoteCard.tsx` — v12.1
- Colored-tint note cards: `tint` prop = `"purple" | "teal" | "amber" | "none"`
- Auto-tint logic: ml/interview/stats tags → purple, sql/dsa/python → teal, project/mlops/cloud → amber
- Emoji prefix (📌 pinned, 📝 regular), snippet preview, date chip, priority/productive/ml tag chips
- Used in `/notes` grid view

#### `ProductivityGoalCard.tsx` — v12.3
- **3 real Supabase tabs** — Weekly / Daily / Monthly (no more multiplier estimates)
- Weekly: last 7 days, one bar per day from `activity_log`
- Daily: today split into 6 four-hour blocks (12am, 4am, 8am, 12pm, 4pm, 8pm)
- Monthly: current month grouped into weeks (Wk1–Wk5)
- Progress bar, big stats (Completed / Total), multicolor strip bar, bar chart, count legend
- All colors use CSS variables — theme-aware

#### `CalendarWeekStrip.tsx` — v12.1
- 7-day horizontal pill strip above calendar month grid
- Today highlighted with gradient pill using CSS vars
- Clicking a day updates the month view

### Modified Pages

#### `today/page.tsx` — v12.3
**Right column layout** (clean order, no duplicates):
1. Today's stats (compact)
2. ActionCards (4 gradient cards)
3. ML Roadmap inline progress row (compact: label + bar + %)
4. ProductivityGoalCard (Weekly/Daily/Monthly tabs)

**Removed:** duplicate full ML Roadmap card (was shown twice), old QUICK_ACTIONS cc-tile grid
**Added state:** `weeklyBars`, `dailyBars`, `monthlyBars` — all fetched on mount
**Added imports:** `fetchDailyTaskCounts`, `fetchMonthlyTaskCounts`, `ProductivityGoalCard`

#### `notes/page.tsx` — v12.1 + v12.2
- Page title changed: "Knowledge base" → "Daily Notes"
- Browse icons row added (⭐ Shortcuts, 🏷 Tags, 🕐 Recent, 📌 Pinned) with hover scale
- "Notes" section label + "See All" button row
- Grid view replaced with `NoteCard` component (tinted cards, emoji, chips)
- Pin + Delete actions moved below each card
- List view unchanged

#### `calendar/page.tsx` — v12.2
- `CalendarWeekStrip` added above month navigation
- `selectedDay` state added
- Day timeline view: click any day → slides in below month grid
- Event cards: coloured left-border accent (pink/blue/purple/teal/green per index)
- Break tag (☕ amber pill) shown between every 2nd event
- Task title, priority badge, estimated duration, description snippet per event card
- Close (×) button collapses timeline

#### `notifications/page.tsx` — v12.2 (**NEW PAGE**)
- Route: `/notifications`
- Sidebar entry added under "More" nav (bell icon)
- Fetches from 4 real Supabase tables: `activity_log`, `focus_sessions`, `habit_log`, `daily_habits`
- Generates notification items per event type:
  - ✅ Task completed (green bubble)
  - ➕ Task created (purple bubble)
  - 🔄 Status changed (blue bubble)
  - ⏱ Focus session completed (amber bubble)
  - 🔥 All habits done for the day (pink bubble)
- All/Tasks/System tabs with real counts
- Grouped by date (Today / Yesterday / date)
- Time shown as "X ago" from real timestamps
- "Mark all as read" button (visual only)
- Empty state when no activity

### `supabase.ts` — v12.3 additions

#### Task count functions (3 new, replaces old single function)
```
fetchCompletedByRange(from, to)  — shared helper, queries activity_log action="completed"
fetchWeeklyTaskCounts()          — last 7 days, one bar per day (Sun–Sat labels)
fetchDailyTaskCounts()           — today only, 6 four-hour blocks (12am/4am/8am/12pm/4pm/8pm)
fetchMonthlyTaskCounts()         — current month, grouped by week (Wk1–Wk5)
```

All 3 use `BAR_COLORS` array and `DAY_LABELS` constants defined once at module level.
No new Supabase tables — all read from existing `activity_log`.

---

## 🗃 Database Schema v12.3 (unchanged — no new tables/columns)

| Table | Key columns |
|---|---|
| `todos` | id, title, description, status, priority, assigned_agent, start_date, due_date, category, tags, resource_links, estimated_mins, completed_at, deleted_at, checklist (jsonb) |
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

**No SQL migrations ran this session** — all changes were frontend/query only.

---

## 🔊 Focus Timer — Audio / Notification Architecture (v12.0 — unchanged)

| Function | Purpose |
|---|---|
| `warmUpAudio()` | Called on Start press — unlocks AudioContext with user gesture (iOS) |
| `resumeAndPlay(fn)` | Resumes suspended context then calls play function |
| `getAudioCtx()` | Lazy singleton AudioContext |

| Function | Tones | Trigger |
|---|---|---|
| `playFocusDone()` | 523→659→784→1047 Hz rising | Session completes |
| `playBreakDone()` | 784→523 Hz descending | Break ends |
| `playCountdownBeep()` | 880 Hz short | Auto Pomodoro countdown tick |

---

## 🍅 Auto Pomodoro Architecture (v12.0 — unchanged)

Flow: Session complete → if `isPomodoroMode` → 5s countdown → break auto-starts → break ends → 3s countdown → next session auto-starts. Cancel button stops cycle at any point.

---

## 📱 Mobile Layout Rules (unchanged)

### Modal pattern
```
fixed z-[61] bottom-0 left-0 right-0
maxHeight: 92dvh, borderRadius: 24px 24px 0 0
paddingBottom: calc(32px + env(safe-area-inset-bottom, 0px))
```
Desktop: `sm:fixed sm:inset-0 sm:m-auto sm:rounded-[24px] sm:max-w-lg sm:max-h-[80vh]`

---

## 🔧 Key Files Modified (v12.1–v12.3)

| File | Changes |
|---|---|
| `src/components/ActionCards.tsx` | NEW — 4 gradient action cards, theme-aware CSS vars |
| `src/components/NoteCard.tsx` | NEW — colored-tint note card with emoji, chips, tint prop |
| `src/components/ProductivityGoalCard.tsx` | NEW — Weekly/Daily/Monthly tabs with real Supabase data |
| `src/components/CalendarWeekStrip.tsx` | NEW — 7-day horizontal pill week strip |
| `src/app/today/page.tsx` | Right column redesigned: ActionCards + compact ML row + ProductivityGoalCard |
| `src/app/notes/page.tsx` | Browse row, section label, NoteCard grid, title updated |
| `src/app/calendar/page.tsx` | CalendarWeekStrip, selectedDay state, day timeline view |
| `src/app/notifications/page.tsx` | NEW PAGE — activity feed from 4 Supabase tables |
| `src/components/Sidebar.tsx` | Notifications added to MORE_NAV |
| `src/lib/supabase.ts` | `fetchWeeklyTaskCounts`, `fetchDailyTaskCounts`, `fetchMonthlyTaskCounts` |
| `src/app/globals.css` | v12.1 utility classes appended (action cards, note tints, chips, segments, browse, cal, notif) |
| `PROJECT-MEMORY.md` | Updated to v12.3 |

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

## ⏳ Feature Backlog (updated v12.4 — all 8 items done)

| Priority | Feature | Notes |
|---|---|---|
| 🟡 Medium | Recycle bin auto-purge | Auto-hard-delete items older than 30 days |
| 🟡 Medium | Learning: phase reorder | Drag to reorder phases |
| 🟡 Medium | Analytics category filter | Filter activity chart by task category |
| 🟡 Medium | Focus page mobile test | Verify vh-based font on 320–430px screens |
| 🟢 Low | Notebooks: note create from within | Add a note directly from the Notebooks drill-in view |
| 🟢 Low | Notifications: persist read state to Supabase | Currently localStorage only — won't sync across devices |
| 🟢 Low | Calendar: add start_time UI | Let users set a start time on tasks from the Add/Edit modal |

---

## 🐛 Known Code Quality Issues (non-breaking)

| Page | Issue | Impact |
|---|---|---|
| Tasks, Today, Notes, Streaks, Decisions | `handle*` functions have `await` but no try/catch | Silent failures if Supabase errors |
| Tasks | `crypto.randomUUID()` for checklist IDs | May fail on very old Android WebViews |
| Tasks | `assigned_agent: "srn"` hardcoded in quick add | Intentional for personal dashboard |
| Notifications | "Mark all as read" persists to localStorage only | Won't sync across devices — Supabase table needed for multi-device |
| Calendar timeline | start_date used as start time proxy | Tasks need a dedicated start_time input in Add/Edit modal for proper scheduling |

---

## 📋 Dev Preferences (always follow)
- ❌ No "Claude" or "AI" branding — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Always read full file before writing replacement
- ✅ ALL inline styles use CSS vars only — never hardcoded hex like `#7c6ffd`
- ✅ Discuss changes before implementing
- ✅ Prefer surgical edits over full file rewrites where possible
- ✅ h/m format for all time displays (never raw minutes > 60)
- ✅ All time values: `m < 60 ? Xm : Xh [Ym]` pattern
- ✅ No hover effects on mobile — click/tap only
- ✅ Sliding windows follow same pattern: offset state + date-range Supabase fetch + slide animation
- ✅ New components must use `var(--accent)`, `var(--text-primary)` etc — theme must work across all 6 accent colors
