import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ── Types ──────────────────────────────────────────────────
export type TodoStatus = "pending" | "in_progress" | "done" | "blocked";
export type TodoPriority = "critical" | "high" | "medium" | "low";

export interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
  priority: TodoPriority;
  assigned_agent: string;
  created_at: string;
  updated_at: string;
}

// ── CRUD helpers ───────────────────────────────────────────
export async function fetchTodos() {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Todo[];
}

export async function addTodo(todo: Partial<Todo>) {
  const { data, error } = await supabase
    .from("todos")
    .insert(todo)
    .select()
    .single();
  if (error) throw error;
  return data as Todo;
}

export async function updateTodo(id: string, updates: Partial<Todo>) {
  const { data, error } = await supabase
    .from("todos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Todo;
}

export async function deleteTodo(id: string) {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw error;
}
