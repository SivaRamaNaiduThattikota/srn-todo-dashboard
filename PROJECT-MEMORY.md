# SRN Command Center — PROJECT-MEMORY.md
> **Last updated:** Session v10.2 — Sidebar collapse/expand, nav scroll, content margin fix, font sizes, button visibility
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
| Design version | **v10.2** — iOS 26 Liquid Glass |
| CSS framework | **Tailwind CSS** (NOT Bootstrap) + custom CSS vars |
| Font system | `-apple-system / SF Pro Display` + `JetBrains Mono` |

---

## 🎨 Design System — v10.2

### globals.css — Key rules

**Typography (v10.1+)**
```css
html { font-size: 16px; }   /* stable rem base — DO NOT use var() here */

--font-base:  clamp(15px, ..., 16px)   /* body text */
--text-xs:    13px                      /* small labels */
--text-sm:    clamp(13.5px, ..., 14.5px) /* buttons, nav labels */
--text-md:    clamp(15.5px, ..., 17px)
--text-mono:  clamp(12px, ..., 13px)
```

**Accent button text fix (v10.1)**
```css
/* Dark mode */ --accent-btn-text: rgba(255,255,255,0.95);
/* Light mode */ --accent-btn-text: rgba(10,10,20,0.90);
.cc-btn-accent { color: var(--accent-btn-text) !important; }
```
All `.cc-btn-accent` buttons use `--accent-btn-text` so text is always readable regardless of accent colour (Sunset orange, green, purple, etc).

**Sidebar scroll fix (v10)**
```css
html, body { overflow: hidden; height: 100%; }
main { overflow-y: auto; height: 100vh; }
@media (max-width: 767px) { html, body { overflow: auto; height: auto; } main { height: auto; } }
```

**Select dropdown dark mode fix**
```css
select option { background-color: #15152a; color: rgba(255,255,255,0.92); }
[data-mode="light"] select option { background-color: #ffffff; color: rgba(18,18,40,0.88); }
```

### Glass Classes
`.glass` · `.liquid-glass` · `.liquid-glass-sweep` · `.glass-heavy` · `.glass-sidebar`
`.glass-modal` · `.spatial` · `.skeuo-raised` · `.clay`
`.cc-tile` · `.cc-btn` · `.cc-btn-accent` · `.cc-btn-danger` · `.cc-chip` · `.cc-habit`

---

## 🧩 Sidebar Architecture (v10.2)

### Files
- `src/components/Sidebar.tsx` — sidebar panel + floating collapse button
- `src/components/ClientLayout.tsx` — layout wrapper, margin management

### How it works
```
ClientLayout
  ├── SidebarContext  { collapsed, setCollapsed }
  ├── <Sidebar />     (md+ only)
  └── <main>          marginLeft = JS-computed (no CSS vars)
```

**Sidebar widths:**
| Breakpoint | Width | Labels |
|---|---|---|
| Mobile `< 768px` | 0 (hidden) | — |
| Tablet `768–1023px` | 60px always | Icons only |
| Desktop `≥ 1024px` expanded | 224px | Icons + labels |
| Desktop `≥ 1024px` collapsed | 60px | Icons only |

**Critical implementation rules:**
1. `marginLeft` in `<main>` is driven by **JS state** (`useState`), not CSS `@media` strings or CSS vars. This avoids hydration flash.
2. Sidebar `<nav>` uses `flex: 1; minHeight: 0; overflowY: auto` — **NO flex spacer inside the nav** (that kills scrolling).
3. Settings is `flexShrink: 0` **outside** the `<nav>`, always pinned at bottom.
4. Collapse/expand button is a `position: fixed` circle **outside** `<aside>`, at `left: sidebarW - 13px` so it's always visible even when sidebar is 60px wide.
5. `moreOpen` state is **independent** of collapse state — collapsing never auto-expands More items.

### Collapse button
```tsx
// Outside <aside>, position:fixed, transitions with sidebar
<button style={{ position:"fixed", left:`${sidebarW-13}px`, top:"48px", ... }}>
  <svg>  {/* chevron rotates 180° when collapsed */}  </svg>
</button>
```

---

## 📁 All 14 Pages — Current Status (v10.2)

| Page | Route | Status | Key features |
|---|---|---|---|
| Tasks | `/` | ✅ | Realtime, search, bulk ops, CSV/JSON export |
| Today | `/today` | ✅ | Inline status cycle, habit tiles, quick actions |
| Streaks | `/streaks` | ✅ | Heatmap, 5s undo delete |
| Focus | `/focus` | ✅ | 280px ring on desktop, 3×2 chips mobile, manual log |
| Notes | `/notes` | ✅ | Search + highlight, tag counts, undo delete, grid/list |
| Projects | `/projects` | ✅ | Search, deadline badge, section undo |
| Board | `/board` | ✅ | Drag desktop, tap-to-move mobile |
| Analytics | `/analytics` | ✅ | 14-day chart, velocity, agent workload |
| AI Assistant | `/assistant` | ✅ | Smart rules engine, insight cards |
| Review | `/review` | ✅ | Fetches focus + habit data correctly |
| Decisions | `/decisions` | ✅ | Search + category filter + 5s undo |
| Briefing | `/briefing` | ✅ | Auto-generated daily brief |
| Calendar | `/calendar` | ✅ | Today button, click-day → AddTodoModal |
| Settings | `/settings` | ✅ | Accent themes, Google Calendar sync, templates |

---

## 🗃 Database Schema v10 (11 tables)

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

---

## 🔧 Complete Bug Fix History

### v10.2 — This session (sidebar + layout)
- [x] **ClientLayout.tsx** — marginLeft now pure JS state, no CSS var injection, no hydration flash
- [x] **ClientLayout.tsx** — `isLg` defaults to `true` to avoid desktop flash on first render
- [x] **Sidebar.tsx** — collapse/expand button is `position:fixed` **outside** `<aside>`, always visible
- [x] **Sidebar.tsx** — `<nav>` has `flex:1; minHeight:0; overflowY:auto` — no flex spacer inside (that was killing scroll)
- [x] **Sidebar.tsx** — Settings is `flexShrink:0` outside nav, always pinned at bottom
- [x] **Sidebar.tsx** — `moreOpen` independent of `collapsed` — no auto-expansion on collapse
- [x] **Sidebar.tsx** — collapsed icon-only mode has `···` toggle for More section
- [x] **Sidebar.tsx** — `showLabel` properly gates title text, nav labels, More button text

### v10.1 — Font + button visibility
- [x] **globals.css** — `html { font-size: 16px }` (stable rem base)
- [x] **globals.css** — `--accent-btn-text` var: white in dark mode, dark in light mode
- [x] **globals.css** — `.cc-btn-accent` uses `color: var(--accent-btn-text) !important`
- [x] **globals.css** — `.cc-btn-danger` text `rgba(255,240,240,0.98)` always visible
- [x] **globals.css** — `--text-sm: clamp(13.5px, ..., 14.5px)` — larger readable UI text
- [x] **Sidebar.tsx** — nav label font-size `13.5px` (was `12px`)

### v10 — Design system + critical bugs
- [x] **globals.css** — `select option` dark background fix + Firefox rule
- [x] **globals.css** — `html/body overflow:hidden` + `main overflow-y:auto` sticky sidebar
- [x] **focus/page.tsx** — dual SVG rings: 180px mobile / 280px desktop
- [x] **focus/page.tsx** — duration chips `grid-cols-3 sm:flex`, added 90m/120m options
- [x] **calendar/page.tsx** — CSS vars throughout, Today button, click-day → modal
- [x] **today/page.tsx** — inline status cycle `○→◑→●`
- [x] **review/page.tsx** — fetches focus sessions + habits, saves `focus_minutes` + `streak_days`
- [x] **decisions/page.tsx** — 5s undo, search bar, category filter pills
- [x] **streaks/page.tsx** — 5s undo delete with countdown banner
- [x] **board/page.tsx** — mobile tap-to-move, sentence case header
- [x] **assistant/page.tsx** — removed "free tier" footer
- [x] **settings/page.tsx** — glass borders fixed, version → v10

---

## 🚀 Deployment

```bash
git add -A
git commit -m "fix: sidebar nav scroll, content margin, collapse button always visible"
git push origin main
```

**Vercel env vars required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📋 Preferences (always follow)

- ❌ No "Claude" branding anywhere — use "AI assistant" or "agent"
- ✅ Every session ends with a summary table
- ✅ Build first, then explain
- ✅ Complete working files — no skeletons or placeholders
- ✅ Inline styles using CSS vars (never hardcoded Tailwind colour classes)
- ✅ Always check PROJECT-MEMORY.md at session start

---

## ✅ What to do RIGHT NOW (in order)

### Step 1 — Push to GitHub (5 min)
```bash
cd "C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard"
git add -A
git commit -m "fix: v10.2 sidebar collapse, nav scroll, content margin, font sizes, button text"
git push origin main
```
Vercel auto-deploys on push. Check https://srn-todo-dashboard.vercel.app/ after ~2 min.

### Step 2 — Verify these 5 things in the browser (10 min)
| Check | Expected result |
|---|---|
| Sidebar expand/collapse | Circle button at right edge of sidebar, click collapses to 60px, click again expands to 224px |
| Sidebar scroll | Open "More" section, all 7 items show, can scroll down to see Settings |
| Content margin | Page content starts immediately after sidebar, no huge gap |
| Button text | "Start", "Add project", "Log decision" buttons all have readable text |
| Dropdown dark mode | Focus page hour dropdown, task selector — options visible with dark background |

### Step 3 — Seed ML Projects (5 min)
Run `ds-projects-seed.sql` in your Supabase SQL editor:
> Supabase Dashboard → SQL Editor → New query → paste content of `ds-projects-seed.sql` → Run

### Step 4 — Start using the dashboard daily
Your daily routine to use the dashboard for:
- **Today page** — check habits, mark tasks done inline
- **Focus page** — start a timer for every study session
- **Streaks page** — verify Python/SQL/ML habit streaks
- **Decisions page** — log any career/tech decisions
- **Briefing page** — open every morning as your daily plan

---

## ⏳ Feature Backlog (future sessions)

| Priority | Feature | Notes |
|---|---|---|
| 🔴 High | Hackathon project | Azure IoT Hub + Azure ML + FastAPI patient monitoring |
| 🔴 High | ML portfolio on Projects page | Run `ds-projects-seed.sql` first |
| 🟡 Medium | Analytics category filter | Filter 14-day chart by task category |
| 🟡 Medium | Briefing interactive priorities | Mark priority done directly from Briefing |
| 🟡 Medium | Data export | Export notes, focus sessions, habits to CSV |
| 🟢 Low | PDF documentation v10.2 | Regenerate with latest features |
| 🟢 Low | PPT presentation v10.2 | Regenerate with latest features |
