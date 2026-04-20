# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v12.6 — iOS 26 Liquid Glass full upgrade (7 systems) + complete nav icon redesign (18 unique icons)
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
| Design version | **v12.6** — iOS 26 Liquid Glass full upgrade + custom icon system |
| CSS framework | Tailwind CSS + custom CSS vars in globals.css |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v12.6 (globals.css is source of truth)

### Core classes
`.liquid-glass`, `.liquid-glass-sweep`, `.cc-btn`, `.cc-btn-accent`, `.cc-chip`, `.cc-tile`, `.cc-habit`

### CSS variables — ALL components must use these, never hardcode hex
`--accent`, `--accent-light`, `--accent-muted`, `--accent-dim`, `--accent-glow`
`--glass-fill`, `--glass-border`, `--specular-top`, `--cc-glass-base`, `--shadow-xl`
`--text-primary`, `--text-secondary`, `--text-muted`, `--bg-input`
`--sp`, `--eo`, `--ei`, `--sm` (spring/easing curves — use instead of raw bezier strings)
`--mx`, `--my` (cursor 0–1 position, live-updated by ClientLayout mousemove handler)
`--blur-layer-bg`, `--blur-layer-mid`, `--blur-layer-top` (3-tier depth blur system)

### iOS 26 Glass utility classes (v12.5+)
`.ca` / `.ca-strong` — chromatic aberration RGB fringe on card edges
`.prism` + `<div class="prism-border">` — rotating rainbow chromatic border (use sparingly)
`.shim` — idle shimmer sweep (add as first child inside any card)
`.materialize` — glass blurs IN from nothing on route entry
`.haptic` — JS-toggled 5-keyframe spring bounce
`.gltxt` — glass text luminous raised effect for headings
`.lp-active` — liquid press squish physics (delegated from ClientLayout)
`.page-enter` / `.page-exit` — blur+scale route morph
`.modal-morph-enter` / `.modal-morph-exit` — iOS sheet clip-path animation
`.expand-grid` / `.expand-grid.open` — CSS grid trick for height→auto
`[data-swipe]` — touch swipe-to-dismiss on notification items

### Icon system (v12.6)
All 18 nav icons are purpose-built SVGs defined in the `ICONS` object in `Sidebar.tsx`.
`MobileNav.tsx` imports the same `ICONS` object — always add new icons to Sidebar first.
`strokeWidth: 1.6`, 20×20 default, every icon visually unique.

---

## 📁 All 18 Pages — Current Status (v12.6)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ v11.4 | Checklist per task, focus time panel, quick add bar, h/m format |
| Today | ✅ v12.5 | `/today` | ActionCards, stats+shim, ML roadmap, ProductivityGoalCard, prism score widget, haptic habits, `.ca` glass |
| Streaks | `/streaks` | ✅ v12.0 | Heatmap sliding window, long-press tooltip mobile |
| Focus | `/focus` | ✅ v12.0 | Auto Pomodoro, screen-off fixes, history chart sliding window, day detail panel |
| Notes | `/notes` | ✅ v12.4 | Browse icons (real filters), NoteCard tints, Shortcuts/Recent/Pinned working |
| Projects | `/projects` | ✅ | Mobile UX overhaul, 2×2 grid, Recycle Bin |
| Learning | `/learning` | ✅ | 10 phases DB-driven, ⓘ modal, ⏱ timeline header button |
| Interview | `/interview` | ✅ v12.4 | 4 tabs, active week highlight, Supabase persistence |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ v12.0 | Sliding window chart, click-to-detail panel |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo, Recycle Bin |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ v12.4 | CalendarWeekStrip, day timeline, start_date times, break tags |
| Settings | `/settings` | ✅ v11.1 | Accent themes, Google Calendar sync, templates, Export & Backup |
| Notebooks | `/notebooks` | ✅ v12.4 | 6 tag-grouped notebooks, colored tiles, drill-in view |
| Notifications | `/notifications` | ✅ v12.4 | Supabase read state, swipe-to-dismiss, live badge count |

---

## ✅ v12.5–v12.6 Session Changes

### v12.5 — iOS 26 Liquid Glass Full Upgrade (7 systems)

#### System 1: SVG Refraction (`layout.tsx`)
- `#lg-refract` SVG filter injected once in root layout (zero visual footprint)
- `feTurbulence` + `feDisplacementMap` creates border-lensing displacement
- `@supports (backdrop-filter: url(#x))` — Chrome/Edge get full refraction, Safari falls back to blur
- `#lg-ca` filter also injected for SVG-based chromatic aberration

#### System 2: Chromatic Aberration (`.ca`, `.ca-strong`)
- Thin RGB-split fringe at glass card edges via `box-shadow: inset`
- `.ca` = subtle (0.5px offset), `.ca-strong` = prominent (1px + green channel)
- Applied: score widget (`.ca-strong`), habits card (`.ca`)
- `mix-blend-mode: screen` — works correctly on dark and light themes

#### System 3: Motion-Reactive Specular (`ClientLayout.tsx`)
- `mousemove` → `--mx`/`--my` CSS vars on `:root` via `requestAnimationFrame`
- Mobile: `deviceorientation` event uses device tilt for same effect
- `.liquid-glass::before` = `radial-gradient` centered at `calc(var(--mx)*100%)`
- Every glass card's specular highlight tracks cursor in real-time

#### System 4: Depth Layers
- 3-tier blur budget: sidebar `4px` / cards `20px` / modals `40px`
- `--blur-layer-bg/mid/top` CSS vars for consistent scaling
- Sidebar overridden to background-layer, modals to top-layer

#### System 5: Fluid Morphing Transitions
- Spring easing (`--sp`) on all `.cc-tile`, `.cc-btn`, `.cc-habit`, `.liquid-glass`, `.hover-lift`
- `.modal-morph-enter/exit` — `clip-path` iOS sheet animation
- `.expand-grid` — CSS grid trick for height→auto without JS measurement

#### System 6: Liquid Press (`ClientLayout.tsx`)
- Pointer event delegation from `document.body` — no per-element wiring needed
- Targets `.cc-btn`, `.cc-tile`, `.cc-habit`, `.hover-lift`
- 5-keyframe squish: `scaleX(1.06) scaleY(.92)` → overshoot → settle
- Auto-removes `.lp-active` after 520ms

#### System 7: Fluid Page Transitions (`ClientLayout.tsx`)
- Route change via `usePathname()` → `mainRef.current` gets `.page-enter`
- `.page-enter`: `blur(8px)→0` + `scale(.97)→1` + `translateY(12px)→0`
- Children stagger: `animation-delay: calc(var(--stagger-i) * 40ms)`
- `prefers-reduced-motion` media query disables all animations

### v12.6 — Complete Nav Icon Redesign

#### Icon system
- Replaced all generic Feather/Lucide stroke icons with 18 purpose-built SVGs
- All defined in `ICONS` object in `Sidebar.tsx`, consumed by both Sidebar and MobileNav
- `strokeWidth: 1.6`, 20×20 viewBox — thinner, more refined than before
- No two icons share the same visual shape

#### Key icon changes
| Route | Icon | Design intent |
|---|---|---|
| Today | Clock + compass ticks | Precise moment in time |
| Tasks | 3-row checklist | Literally a task list |
| Streaks | Flame with inner core | Heat/energy = streak |
| Focus | Crosshair target | Precision + concentration |
| Notes | Folded-corner document | Clearly a note/file |
| Projects | House silhouette | Home base for work |
| Learning | Graduation cap + arch | Dimensional, not flat |
| Interview | Monitor with `>_` prompt | Technical/screen-based |
| Analytics | EKG pulse waveform | Dynamic data flow |
| Assistant | Pin/teardrop with brain dot | AI probe/insight |

#### NavLink redesign (Sidebar)
- **Active pill**: gradient `accent-muted` bg + `accent-dim` border + specular top line
- **Icon container**: 28×28 rounded square — iOS Home Screen icon style
- **Hover**: icon scales `1.14×` with spring (icon container only, not whole row)
- **Label**: `fontWeight: 600` active vs `500` default
- **Badge**: accent pill (expanded) or accent dot on icon (collapsed)
- All transitions use `--sp` spring easing

#### MobileNav redesign
- Same `ICONS` object as Sidebar
- Active tab: `accent-muted` bg + `accent-dim` border + top specular line
- Icon scales `1.08×` with spring on active state
- Active indicator dot at top of tab item
- More sheet: grid tiles use `accent-muted` bg on active route

### Files changed in v12.5–v12.6
| File | Changes |
|---|---|
| `src/app/globals.css` | 7 iOS 26 systems appended: refraction, CA, specular vars, depth layers, morphing, liquid press, page transitions |
| `src/app/layout.tsx` | SVG filter defs injected (`#lg-refract`, `#lg-ca`) |
| `src/components/ClientLayout.tsx` | Systems 3+6+7: mousemove specular, liquid press delegation, page transition trigger, `mainRef` |
| `src/app/today/page.tsx` | `.ca-strong` on score widget, `.ca` on habits card, `.gltxt` on headings, `.shim` on stats |
| `src/components/Sidebar.tsx` | Complete rewrite: 18 purpose-built SVG icons, iOS liquid pill active state, spring hover, icon containers |
| `src/components/MobileNav.tsx` | Complete rewrite: same ICONS set, accent-muted active state, spring tab animations |
| `PROJECT-MEMORY.md` | Updated to v12.6 |

---

## ✅ v12.4 Session Changes (8 backlog items)

### Files changed in v12.4
| File | Changes |
|---|---|
| `src/app/notifications/page.tsx` | Supabase read state, swipe-to-dismiss, unread count broadcast |
| `src/components/Sidebar.tsx` | NavLink badge prop, notif unread count, Notebooks in MORE_NAV |
| `src/app/notebooks/page.tsx` | NEW PAGE — 6 notebook groups, colored tiles, drill-in view |
| `src/app/calendar/page.tsx` | Sort by start_date, time range display on event cards |
| `src/app/today/page.tsx` | fetchPeriodTotals, score widget → Analytics link, periodTotals prop |
| `src/components/ProductivityGoalCard.tsx` | periodTotals prop, accurate per-tab totals, label updates per tab |
| `src/app/notes/page.tsx` | Browse icons: Shortcuts=pinned, Recent=last 24h, Pinned=filter |
| `src/app/interview/page.tsx` | Active week highlight badge + coloured outline ring |
| `src/lib/supabase.ts` | fetchPeriodTotals(), fetchNotifReadIds(), saveNotifReadIds() |

---

## ✅ v12.1–v12.3 Session Changes

### New Components (`src/components/`)
- `ActionCards.tsx` — 4 gradient action cards (accent/amber/teal/pink), theme-aware
- `NoteCard.tsx` — colored-tint cards (purple/teal/amber), auto-tint from tags
- `ProductivityGoalCard.tsx` — Weekly/Daily/Monthly real Supabase tabs
- `CalendarWeekStrip.tsx` — 7-day horizontal pill strip

### supabase.ts additions (v12.1–v12.4)
```
fetchCompletedByRange(from, to)   — shared helper for all count functions
fetchWeeklyTaskCounts()           — last 7 days, one bar per day
fetchDailyTaskCounts()            — today in 6 four-hour blocks
fetchMonthlyTaskCounts()          — current month grouped by week
fetchPeriodTotals()               — { daily, weekly, monthly } completed counts
fetchNotifReadIds()               — Set<string> from interview_prep table
saveNotifReadIds(ids)             — upsert to interview_prep table
```

---

## 🗃 Database Schema (unchanged — no new tables since v11.4)

| Table | Key columns |
|---|---|
| `todos` | id, title, description, status, priority, assigned_agent, start_date, due_date, category, tags, resource_links, estimated_mins, completed_at, deleted_at, checklist (jsonb) |
| `daily_habits` | id, name, icon, color |
| `habit_log` | id, habit_id, completed_date |
| `focus_sessions` | id, todo_id, duration_minutes, completed, started_at, ended_at |
| `notes` | id, title, content, tags, is_pinned, deleted_at, updated_at |
| `projects` | id, title, category, tech, highlights, github_url, live_url, progress, end_date, sort_order, deleted_at |
| `project_sections` | id, project_id, title, items, category, sort_order |
| `weekly_reviews` | id, week_start, tasks_completed, focus_minutes, streak_days, reflection, goals_next_week |
| `decisions` | id, decision, reasoning, expected_outcome, category, status, review_date, review_notes, deleted_at |
| `activity_log` | id, todo_id, action, old_value, new_value, created_at |
| `task_templates` | id, title, priority, recurrence |
| `learning_phases` | id, sort_order, title, duration, accent_color, bg_color, text_color, milestone, resources, tracks, weeks, practice, deleted_at |
| `learning_progress` | id, phase_id (FK), track_index, topic_index, is_done, done_at |
| `learning_week_progress` | id, phase_id (FK), week_index, is_done, done_at |
| `interview_prep` | id, key (UNIQUE), data (jsonb), updated_at — stores notif read IDs + interview progress |

---

## 🔊 Focus Timer Audio Architecture (v12.0 — unchanged)
`warmUpAudio()` · `resumeAndPlay(fn)` · `getAudioCtx()`
`playFocusDone()` (rising tones) · `playBreakDone()` (descending) · `playCountdownBeep()` (880Hz)

## 🍅 Auto Pomodoro Architecture (v12.0 — unchanged)
Session done → 5s countdown → break → break done → 3s countdown → next session. Cancel stops cycle.

## 📱 Mobile Layout Rules (unchanged)
Modal pattern: `fixed z-[61] bottom-0 left-0 right-0`, `maxHeight: 92dvh`, `borderRadius: 24px 24px 0 0`
Desktop: `sm:fixed sm:inset-0 sm:m-auto sm:rounded-[24px] sm:max-w-lg sm:max-h-[80vh]`

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

## ⏳ Feature Backlog (updated v12.6)

| Priority | Feature | Notes |
|---|---|---|
| 🟡 Medium | Recycle bin auto-purge | Auto-hard-delete items older than 30 days |
| 🟡 Medium | Learning: phase reorder | Drag to reorder phases |
| 🟡 Medium | Analytics category filter | Filter by task category |
| 🟡 Medium | Focus page mobile test | Verify layout on 320–430px screens |
| 🟡 Medium | Calendar: start_time UI | Add time picker to task Add/Edit modal |
| 🟢 Low | Notebooks: create note from within | Add note directly in drill-in view |
| 🟢 Low | Sidebar: animated sliding active pill | CSS position transition (needs JS layout measurement) |
| 🟢 Low | Mobile: gyroscope permission prompt | iOS requires user gesture for DeviceOrientationEvent |

---

## 🐛 Known Code Quality Issues (non-breaking)

| Location | Issue | Impact |
|---|---|---|
| Tasks, Today, Notes, Streaks, Decisions | `handle*` functions have `await` but no try/catch | Silent failures on Supabase errors |
| Tasks | `crypto.randomUUID()` for checklist IDs | May fail on very old Android WebViews |
| Tasks | `assigned_agent: "srn"` hardcoded | Intentional for personal dashboard |
| Calendar timeline | `start_date` used as start time proxy | No dedicated time-of-day input yet |
| iOS mobile | DeviceOrientation specular needs permission | Works on Android, blocked on iOS without gesture |

---

## 📋 Dev Preferences (always follow)
- ❌ No "Claude" or "AI" branding — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Always read full file before writing replacement
- ✅ ALL inline styles use CSS vars only — never hardcoded hex like `#7c6ffd`
- ✅ Use `--sp`, `--eo`, `--ei`, `--sm` easing vars — never raw cubic-bezier strings
- ✅ Prefer surgical edits over full file rewrites where possible
- ✅ h/m format for all time displays (never raw minutes > 60)
- ✅ All time values: `m < 60 ? Xm : Xh [Ym]` pattern
- ✅ No hover effects on mobile — click/tap only
- ✅ Sliding windows: offset state + date-range Supabase fetch + slide animation
- ✅ New components must be theme-aware (all 6 accent colors must work)
- ✅ Nav icons: add to `ICONS` object in `Sidebar.tsx`, same object imported in `MobileNav.tsx`
