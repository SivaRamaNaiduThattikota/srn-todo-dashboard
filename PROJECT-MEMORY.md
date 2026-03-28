# SRN Command Center — PROJECT-MEMORY.md
> Last updated: Session ending with globals.css v10, focus timer desktop ring, sidebar sticky fix, dropdown dark mode fix
> Stack: Next.js 14 · Supabase · Tailwind CSS · TypeScript · Framer Motion

---

## 🗂 Project Identity
| Field | Value |
|---|---|
| Name | SRN Command Center |
| Owner | Siva Rama Naidu (SRN) |
| Live URL | https://srn-todo-dashboard.vercel.app/ |
| Local path | `C:\Users\2321764\Downloads\00 - SRN Command Center\todo-dashboard` |
| Supabase project | `azpjxezbackhzuoznccg` (Mumbai region) |
| Design version | v10 — iOS 26 Liquid Glass |
| CSS framework | **Tailwind CSS** (NOT Bootstrap) + custom CSS vars |
| Font system | -apple-system / SF Pro Display + JetBrains Mono |

---

## 🎨 Design System — iOS 26 Liquid Glass v10

### Key files
- `src/app/globals.css` — full design system, v10
- `src/app/layout.tsx` — sets `data-mode="dark"` and `data-theme="green"` on `<html>`

### Typography — Fluid Scale (added v10)
No Bootstrap. Tailwind + custom fluid `clamp()` variables:
```css
--font-base:  clamp(14px, 0.875rem + 0.2vw, 16px)   /* body */
--text-xs:    clamp(11px, ..., 12px)
--text-sm:    clamp(12px, ..., 13.5px)
--text-md:    clamp(15px, ..., 17px)
--text-lg:    clamp(17px, ..., 20px)
--text-xl:    clamp(20px, ..., 24px)
--text-2xl:   clamp(24px, ..., 30px)
--text-mono:  clamp(11px, ..., 12.5px)
```
`html { font-size: var(--font-base); }` — all rem units auto-scale.

### Sticky Sidebar (fixed v10)
`html, body { overflow: hidden; }` + `main { overflow-y: auto; height: 100vh; }`  
→ sidebar is `position: fixed` and never scrolls with content.  
Mobile: reverts to `overflow: auto` so mobile scroll still works.

### Dark Mode Dropdown Fix (fixed v10)
```css
select option { background-color: #1a1a2e; color: rgba(255,255,255,0.90); }
[data-mode="light"] select option { background-color: #ffffff; color: rgba(18,18,40,0.88); }
```
Firefox-specific `@-moz-document` rule also added.

### Glass Classes
`.glass` · `.liquid-glass` · `.liquid-glass-sweep` · `.glass-heavy` · `.glass-sidebar`  
`.glass-modal` · `.spatial` · `.skeuo-raised` · `.clay` · `.cc-tile` · `.cc-btn` · `.cc-chip` · `.cc-habit`

### Accent Themes
`[data-theme="green|blue|purple|orange|pink|cyan"]`  
Changed via `ThemeProvider` → `setAccent()` in Settings page.

---

## 📁 All 14 Pages — Current Status (v10)

| Page | Route | Status | Last changed |
|---|---|---|---|
| Tasks | `/` | ✅ Clean | prev session |
| Today | `/today` | ✅ Inline status cycle added | prev session |
| Streaks | `/streaks` | ✅ Undo-delete added | prev session |
| Focus | `/focus` | ✅ Desktop big ring (280px), mobile 3×2 chip grid | **this session** |
| Notes | `/notes` | ✅ Search, undo, tag counts | prev session |
| Projects | `/projects` | ✅ Search, deadline badge, section undo | prev session |
| Board | `/board` | ✅ Tap-to-move mobile, sentence case | prev session |
| Analytics | `/analytics` | ✅ Clean | unchanged |
| AI Assistant | `/assistant` | ✅ Removed "free tier" footer | prev session |
| Review | `/review` | ✅ Fetches focus + habit data, saves correctly | prev session |
| Decisions | `/decisions` | ✅ Search + category filter + 5s undo | prev session |
| Briefing | `/briefing` | ✅ Clean | unchanged |
| Calendar | `/calendar` | ✅ Today button + click-to-create task | prev session |
| Settings | `/settings` | ✅ Version v10, glass borders | prev session |

---

## 🗃 Database — Supabase Schema v10 (11 tables)

| Table | Key columns |
|---|---|
| `todos` | id, title, description, status, priority, assigned_agent, due_date, category, tags, resource_links, estimated_mins, completed_at |
| `daily_habits` | id, name, icon, color, created_at |
| `habit_logs` | id, habit_id, completed_date |
| `focus_sessions` | id, todo_id, duration_minutes, completed, started_at, ended_at |
| `notes` | id, title, content, tags, pinned, created_at |
| `projects` | id, title, category, tech, highlights, github_url, live_url, progress, end_date, sort_order |
| `project_sections` | id, project_id, title, items, category, sort_order |
| `weekly_reviews` | id, week_start, tasks_completed, focus_minutes, streak_days, reflection, goals_next_week |
| `decisions` | id, decision, reasoning, expected_outcome, category, status, review_date, review_notes, created_at |
| `activity_log` | id, todo_id, action, old_value, new_value, created_at |
| `task_templates` | id, title, priority, recurrence, created_at |

**SQL files in project root:**
- `supabase-master.sql` — full schema
- `supabase-decisions.sql` — decisions table
- `supabase-projects.sql` — projects + sections
- `ds-projects-seed.sql` — 11 ML portfolio projects seed data

---

## 🧩 Key Components

| Component | Purpose | Notable features |
|---|---|---|
| `ClientLayout.tsx` | Wraps all pages | Sidebar (md+) + MobileNav (sm only) |
| `Sidebar.tsx` | Desktop left nav | Fixed 60px collapsed / 220px expanded, glass-sidebar |
| `MobileNav.tsx` | Mobile bottom bar | 4 primary tabs + "More" bottom sheet grid |
| `AddTodoModal.tsx` | Add/create task | 3-tab modal, `prefillDueDate` prop for calendar |
| `ThemeProvider.tsx` | Dark/light + accent | Sets `data-mode` + `data-theme` on `<html>` |
| `ToastProvider.tsx` | Toast notifications | Listens for `srn:toast` custom events |
| `PageTransition.tsx` | Page animations | Framer Motion slide/fade |
| `TodoCard.tsx` | Task card | Status cycle, priority color, due date |
| `StatsBar.tsx` | Stats row on Tasks page | Completion %, counts |
| `EventLog.tsx` | Live event feed | Shows last realtime event |

---

## 🔧 Bugs Fixed (Cumulative)

### v10 — This session
- [x] **globals.css** — fluid typography scale with CSS `clamp()` vars
- [x] **globals.css** — `html/body overflow:hidden` + `main overflow-y:auto` → sidebar no longer scrolls
- [x] **globals.css** — `select option` dark bg fix (#1a1a2e) + Firefox @-moz-document rule
- [x] **focus/page.tsx** — desktop timer ring now 280px (was 180px everywhere), uses `lg:hidden` / `hidden lg:block` dual SVG approach
- [x] **focus/page.tsx** — clock font uses `clamp(2rem, 5vw, 3.5rem)` for smooth responsive sizing

### Prev session — Critical + Significant
- [x] Calendar: all hardcoded Tailwind color classes → CSS vars, Today button, click-day → AddTodoModal
- [x] Today: `pb-32 md:pb-10` mobile nav clearance, inline status cycle button
- [x] Review: fetches `focusSessions` + `habits` + `habitLogs`, saves `focus_minutes` + `streak_days`
- [x] Decisions: 5s undo delete, search bar, category filter pills
- [x] Streaks: 5s undo delete (was instant permanent)
- [x] Board: mobile tap-to-move (tap card → tap column), sentence case header
- [x] Assistant: removed "Running on smart rules engine (free)" footer
- [x] Settings: `border: "1px solid var(--border-default)"` → `0.5px solid var(--glass-border)`, version → v10
- [x] Focus: DURATIONS = [15,25,45,60,90,120], manual log 3×2 grid on mobile

---

## 🚀 Deployment

```bash
# Push to Vercel (auto-deploys on push to main)
git add -A
git commit -m "feat: v10 fluid typography, sticky sidebar, dark dropdown fix, focus desktop ring"
git push origin main
```

**Environment variables needed in Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📋 Preferences (never deviate from these)

- Never include "Claude" or AI branding in project files — use "AI assistant" or "agent"
- Every session ends with a summary table
- Build first, then explain
- Complete working files — no skeletons
- Visual-first outputs
- Inline styles using CSS vars (not hardcoded Tailwind color classes like `text-white`, `bg-red-500`)

---

## ⏳ Pending / Next Steps

- [ ] Push latest to GitHub + Vercel
- [ ] Run `supabase-master.sql` if DB schema has drifted
- [ ] Run `ds-projects-seed.sql` for ML portfolio projects
- [ ] Regenerate PDF documentation (v10)
- [ ] Regenerate PPT presentation (v10)
- [ ] Hackathon: Azure IoT Hub + Azure ML + FastAPI patient monitoring project
- [ ] Consider: Analytics page category filter
- [ ] Consider: Briefing page interactive priorities (mark done from briefing)
- [ ] Consider: Data export for notes + focus sessions + habits
