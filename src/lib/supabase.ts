import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

// ── Types ──────────────────────────────────────────────────
export type TodoStatus = "pending" | "in_progress" | "done" | "blocked";
export type TodoPriority = "critical" | "high" | "medium" | "low";

export interface Todo {
  id: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: TodoPriority;
  assigned_agent: string;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  todo_id: string;
  title: string;
  is_done: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  todo_id: string | null;
  action: "created" | "status_changed" | "completed" | "deleted";
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: TodoPriority;
  assigned_agent: string;
  recurrence: "daily" | "weekly" | "monthly" | null;
  is_active: boolean;
  last_created_at: string | null;
  created_at: string;
}

// ── Todo CRUD ──────────────────────────────────────────────
export async function fetchTodos() {
  const { data, error } = await supabase.from("todos").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Todo[];
}

export async function addTodo(todo: Partial<Todo>) {
  const { data, error } = await supabase.from("todos").insert(todo).select().single();
  if (error) throw error;
  return data as Todo;
}

export async function updateTodo(id: string, updates: Partial<Todo>) {
  const { data, error } = await supabase.from("todos").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Todo;
}

export async function deleteTodo(id: string) {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw error;
}

// ── Subtask CRUD ───────────────────────────────────────────
export async function fetchSubtasks(todoId: string) {
  const { data, error } = await supabase.from("subtasks").select("*").eq("todo_id", todoId).order("created_at", { ascending: true });
  if (error) throw error;
  return data as Subtask[];
}

export async function addSubtask(todoId: string, title: string) {
  const { data, error } = await supabase.from("subtasks").insert({ todo_id: todoId, title }).select().single();
  if (error) throw error;
  return data as Subtask;
}

export async function toggleSubtask(id: string, isDone: boolean) {
  await supabase.from("subtasks").update({ is_done: isDone }).eq("id", id);
}

export async function deleteSubtask(id: string) {
  await supabase.from("subtasks").delete().eq("id", id);
}

// ── Templates CRUD ─────────────────────────────────────────
export async function fetchTemplates() {
  const { data, error } = await supabase.from("task_templates").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as TaskTemplate[];
}

export async function addTemplate(template: Partial<TaskTemplate>) {
  const { data, error } = await supabase.from("task_templates").insert(template).select().single();
  if (error) throw error;
  return data as TaskTemplate;
}

export async function deleteTemplate(id: string) {
  await supabase.from("task_templates").delete().eq("id", id);
}

export async function createTodoFromTemplate(template: TaskTemplate) {
  const todo = await addTodo({
    title: template.title,
    description: template.description,
    priority: template.priority,
    assigned_agent: template.assigned_agent,
    status: "pending",
  });
  // Update last_created_at on template
  await supabase.from("task_templates").update({ last_created_at: new Date().toISOString() }).eq("id", template.id);
  return todo;
}

// ── Analytics ──────────────────────────────────────────────
export async function fetchActivityLog(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase.from("activity_log").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false });
  if (error) throw error;
  return data as ActivityLog[];
}
