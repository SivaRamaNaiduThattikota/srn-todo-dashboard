import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

// ── Types ──────────────────────────────────────────────────
export type TodoStatus = "pending" | "in_progress" | "done" | "blocked";
export type TodoPriority = "critical" | "high" | "medium" | "low";
export type TodoCategory = "learning" | "project" | "interview-prep" | "work" | "personal" | "general";
export type ResourceLinkType = "article" | "video" | "github" | "doc" | "tool" | "course" | "other";

export interface ResourceLink { title: string; url: string; type: ResourceLinkType; }

export interface Todo {
  id: string; title: string; description: string; status: TodoStatus; priority: TodoPriority;
  assigned_agent: string; due_date: string | null; completed_at: string | null; sort_order: number;
  category: TodoCategory; resource_links: ResourceLink[]; tags: string[]; estimated_mins: number | null;
  created_at: string; updated_at: string;
}
export interface Subtask { id: string; todo_id: string; title: string; is_done: boolean; created_at: string; }
export interface ActivityLog { id: string; todo_id: string | null; action: "created" | "status_changed" | "completed" | "deleted"; old_value: string | null; new_value: string | null; created_at: string; }
export interface TaskTemplate { id: string; title: string; description: string; priority: TodoPriority; assigned_agent: string; recurrence: "daily" | "weekly" | "monthly" | null; is_active: boolean; last_created_at: string | null; created_at: string; }
export interface DailyHabit { id: string; name: string; icon: string; color: string; sort_order: number; is_active: boolean; created_at: string; }
export interface HabitLog { id: string; habit_id: string; completed_date: string; created_at: string; }
export interface Note { id: string; title: string; content: string; tags: string[]; is_pinned: boolean; created_at: string; updated_at: string; }
export interface FocusSession { id: string; todo_id: string | null; duration_minutes: number; completed: boolean; started_at: string; ended_at: string | null; }
export interface WeeklyReview { id: string; week_start: string; tasks_completed: number; focus_minutes: number; streak_days: number; reflection: string; goals_next_week: string; created_at: string; }
export interface Project { id: string; title: string; description: string; category: string; tech: string[]; status: "planning" | "in-progress" | "completed" | "deployed"; progress: number; github_url: string; live_url: string; highlights: string[]; start_date: string | null; end_date: string | null; sort_order: number; created_at: string; updated_at: string; }

export interface Decision {
  id: string; decision: string; reasoning: string; expected_outcome: string;
  category: "career" | "technical" | "learning" | "financial" | "personal" | "project";
  status: "active" | "reviewed" | "reversed" | "validated";
  review_date: string; review_notes: string;
  created_at: string; updated_at: string;
}

export interface LearningProgress {
  id: string; phase_id: number; track_index: number; topic_index: number;
  is_done: boolean; created_at: string; updated_at: string;
}

// Learning v2 types
export interface LearningResource { label: string; url: string; }
export interface LearningTrack    { label: string; topics: string[]; }
export interface LearningWeek     { label: string; goals: string[]; }
export interface LearningPractice { title: string; problems: string[]; }

export interface LearningPhase {
  id: number;
  sort_order: number;
  title: string;
  duration: string;
  accent_color: string;
  bg_color: string;
  text_color: string;
  milestone: string;
  resources: LearningResource[];
  tracks: LearningTrack[];
  weeks: LearningWeek[];
  practice: LearningPractice[];
  created_at: string;
  updated_at: string;
}

export interface LearningWeekProgress {
  id: string; phase_id: number; week_index: number;
  is_done: boolean; done_at: string | null;
  created_at: string; updated_at: string;
}

// ── Todo CRUD ──────────────────────────────────────────────
export async function fetchTodos() {
  const { data, error } = await supabase.from("todos").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Todo[]).map((t) => ({ ...t, resource_links: t.resource_links ?? [], tags: t.tags ?? [], estimated_mins: t.estimated_mins ?? null }));
}
export async function addTodo(todo: Partial<Todo>) { const payload = { ...todo, resource_links: todo.resource_links ?? [], tags: todo.tags ?? [], estimated_mins: todo.estimated_mins ?? null }; const { data, error } = await supabase.from("todos").insert(payload).select().single(); if (error) throw error; return data as Todo; }
export async function updateTodo(id: string, updates: Partial<Todo>) { const { data, error } = await supabase.from("todos").update(updates).eq("id", id).select().single(); if (error) throw error; return data as Todo; }
export async function deleteTodo(id: string) { const { error } = await supabase.from("todos").delete().eq("id", id); if (error) throw error; }

// ── Subtasks ───────────────────────────────────────────────
export async function fetchSubtasks(todoId: string) { const { data, error } = await supabase.from("subtasks").select("*").eq("todo_id", todoId).order("created_at", { ascending: true }); if (error) throw error; return data as Subtask[]; }
export async function addSubtask(todoId: string, title: string) { const { data, error } = await supabase.from("subtasks").insert({ todo_id: todoId, title }).select().single(); if (error) throw error; return data as Subtask; }
export async function toggleSubtask(id: string, isDone: boolean) { await supabase.from("subtasks").update({ is_done: isDone }).eq("id", id); }
export async function deleteSubtask(id: string) { await supabase.from("subtasks").delete().eq("id", id); }

// ── Templates ──────────────────────────────────────────────
export async function fetchTemplates() { const { data, error } = await supabase.from("task_templates").select("*").order("created_at", { ascending: false }); if (error) throw error; return data as TaskTemplate[]; }
export async function addTemplate(template: Partial<TaskTemplate>) { const { data, error } = await supabase.from("task_templates").insert(template).select().single(); if (error) throw error; return data as TaskTemplate; }
export async function deleteTemplate(id: string) { await supabase.from("task_templates").delete().eq("id", id); }
export async function createTodoFromTemplate(template: TaskTemplate) { const todo = await addTodo({ title: template.title, description: template.description, priority: template.priority, assigned_agent: template.assigned_agent, status: "pending" }); await supabase.from("task_templates").update({ last_created_at: new Date().toISOString() }).eq("id", template.id); return todo; }

// ── Habits ─────────────────────────────────────────────────
export async function fetchHabits() { const { data, error } = await supabase.from("daily_habits").select("*").eq("is_active", true).order("sort_order", { ascending: true }); if (error) throw error; return data as DailyHabit[]; }
export async function addHabit(name: string, color: string = "#6ee7b7") { const { data, error } = await supabase.from("daily_habits").insert({ name, icon: name.charAt(0).toUpperCase(), color }).select().single(); if (error) throw error; return data as DailyHabit; }
export async function deleteHabit(id: string) { await supabase.from("daily_habits").update({ is_active: false }).eq("id", id); }
export async function fetchHabitLogs(days: number = 90) { const since = new Date(); since.setDate(since.getDate() - days); const { data, error } = await supabase.from("habit_log").select("*").gte("completed_date", since.toISOString().slice(0, 10)).order("completed_date", { ascending: false }); if (error) throw error; return data as HabitLog[]; }
export async function toggleHabitDay(habitId: string, date: string) { const { data } = await supabase.from("habit_log").select("id").eq("habit_id", habitId).eq("completed_date", date).single(); if (data) { await supabase.from("habit_log").delete().eq("id", data.id); return false; } else { await supabase.from("habit_log").insert({ habit_id: habitId, completed_date: date }); return true; } }

// ── Notes ──────────────────────────────────────────────────
export async function fetchNotes() { const { data, error } = await supabase.from("notes").select("*").order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }); if (error) throw error; return data as Note[]; }
export async function addNote(note: Partial<Note>) { const { data, error } = await supabase.from("notes").insert(note).select().single(); if (error) throw error; return data as Note; }
export async function updateNote(id: string, updates: Partial<Note>) { const { data, error } = await supabase.from("notes").update(updates).eq("id", id).select().single(); if (error) throw error; return data as Note; }
export async function deleteNote(id: string) { await supabase.from("notes").delete().eq("id", id); }

// ── Focus Sessions ─────────────────────────────────────────
export async function startFocusSession(todoId: string | null, minutes: number = 25) { const { data, error } = await supabase.from("focus_sessions").insert({ todo_id: todoId, duration_minutes: minutes }).select().single(); if (error) throw error; return data as FocusSession; }
export async function completeFocusSession(id: string) { await supabase.from("focus_sessions").update({ completed: true, ended_at: new Date().toISOString() }).eq("id", id); }
export async function fetchFocusSessions(days: number = 30) { const since = new Date(); since.setDate(since.getDate() - days); const { data, error } = await supabase.from("focus_sessions").select("*").gte("started_at", since.toISOString()).order("started_at", { ascending: false }); if (error) throw error; return data as FocusSession[]; }

// ── Weekly Reviews ─────────────────────────────────────────
export async function fetchWeeklyReviews() { const { data, error } = await supabase.from("weekly_reviews").select("*").order("week_start", { ascending: false }).limit(12); if (error) throw error; return data as WeeklyReview[]; }
export async function saveWeeklyReview(review: Partial<WeeklyReview>) { const { data, error } = await supabase.from("weekly_reviews").upsert(review, { onConflict: "week_start" }).select().single(); if (error) throw error; return data as WeeklyReview; }

// ── Projects ───────────────────────────────────────────────
export async function fetchProjects() { const { data, error } = await supabase.from("projects").select("*").order("sort_order", { ascending: true }); if (error) throw error; return data as Project[]; }
export async function addProject(project: Partial<Project>) { const { data, error } = await supabase.from("projects").insert(project).select().single(); if (error) throw error; return data as Project; }
export async function updateProject(id: string, updates: Partial<Project>) { const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single(); if (error) throw error; return data as Project; }
export async function deleteProject(id: string) { await supabase.from("projects").delete().eq("id", id); }

// ── Decisions ──────────────────────────────────────────────
export async function fetchDecisions() { const { data, error } = await supabase.from("decisions").select("*").order("created_at", { ascending: false }); if (error) throw error; return data as Decision[]; }
export async function addDecision(decision: Partial<Decision>) { const { data, error } = await supabase.from("decisions").insert(decision).select().single(); if (error) throw error; return data as Decision; }
export async function updateDecision(id: string, updates: Partial<Decision>) { const { data, error } = await supabase.from("decisions").update(updates).eq("id", id).select().single(); if (error) throw error; return data as Decision; }
export async function deleteDecision(id: string) { await supabase.from("decisions").delete().eq("id", id); }

// ── Analytics ──────────────────────────────────────────────
export async function fetchActivityLog(days: number = 30) { const since = new Date(); since.setDate(since.getDate() - days); const { data, error } = await supabase.from("activity_log").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false }); if (error) throw error; return data as ActivityLog[]; }

// ── Learning Progress (topic-level) ───────────────────────
export async function fetchLearningProgress(): Promise<LearningProgress[]> {
  const { data, error } = await supabase.from("learning_progress").select("*").order("phase_id", { ascending: true });
  if (error) throw error;
  return data as LearningProgress[];
}
export async function toggleLearningTopic(phaseId: number, trackIndex: number, topicIndex: number, currentDone: boolean): Promise<void> {
  const { error } = await supabase.from("learning_progress").upsert(
    { phase_id: phaseId, track_index: trackIndex, topic_index: topicIndex, is_done: !currentDone },
    { onConflict: "phase_id,track_index,topic_index" }
  );
  if (error) throw error;
}

// ── Learning Phases (v2 — DB-driven) ──────────────────────
export async function fetchLearningPhases(): Promise<LearningPhase[]> {
  const { data, error } = await supabase.from("learning_phases").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data as LearningPhase[];
}
export async function upsertLearningPhase(phase: Partial<LearningPhase> & { id?: number }): Promise<LearningPhase> {
  const payload = { ...phase };
  if (!payload.id) delete payload.id;
  const { data, error } = payload.id
    ? await supabase.from("learning_phases").update(payload).eq("id", payload.id).select().single()
    : await supabase.from("learning_phases").insert(payload).select().single();
  if (error) throw error;
  return data as LearningPhase;
}
export async function deleteLearningPhase(id: number): Promise<void> {
  const { error } = await supabase.from("learning_phases").delete().eq("id", id);
  if (error) throw error;
}

// ── Learning Week Progress ────────────────────────────────
export async function fetchLearningWeekProgress(): Promise<LearningWeekProgress[]> {
  const { data, error } = await supabase.from("learning_week_progress").select("*").order("phase_id", { ascending: true });
  if (error) throw error;
  return data as LearningWeekProgress[];
}
export async function toggleLearningWeek(phaseId: number, weekIndex: number, currentDone: boolean): Promise<void> {
  const { error } = await supabase.from("learning_week_progress").upsert(
    { phase_id: phaseId, week_index: weekIndex, is_done: !currentDone, done_at: !currentDone ? new Date().toISOString() : null },
    { onConflict: "phase_id,week_index" }
  );
  if (error) throw error;
}
export async function fetchLearningStats(): Promise<{ totalTopics: number; doneTopics: number; totalWeeks: number; doneWeeks: number }> {
  const [phases, topicProgress, weekProgress] = await Promise.all([
    fetchLearningPhases(),
    fetchLearningProgress(),
    fetchLearningWeekProgress(),
  ]);
  const totalTopics = phases.reduce((s, p) => s + p.tracks.reduce((ss, t) => ss + t.topics.length, 0), 0);
  const doneTopics  = topicProgress.filter((r) => r.is_done).length;
  const totalWeeks  = phases.reduce((s, p) => s + p.weeks.length, 0);
  const doneWeeks   = weekProgress.filter((r) => r.is_done).length;
  return { totalTopics, doneTopics, totalWeeks, doneWeeks };
}
