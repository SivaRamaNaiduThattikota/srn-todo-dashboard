"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, fetchTodos, type Todo } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export function useRealtimeTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTodos();
      setTodos(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("todos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        (payload: RealtimePostgresChangesPayload<Todo>) => {
          const ts = new Date().toLocaleTimeString();

          if (payload.eventType === "INSERT") {
            const t = payload.new as Todo;
            setTodos((prev) => [t, ...prev]);
            setLastEvent(`[${ts}] + New: "${t.title}"`);
            // Dispatch toast event
            window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `New task: ${t.title}`, type: "success" } }));
          }

          if (payload.eventType === "UPDATE") {
            const t = payload.new as Todo;
            setTodos((prev) => prev.map((x) => (x.id === t.id ? t : x)));
            setLastEvent(`[${ts}] ~ "${t.title}" → ${t.status}`);
            if (t.status === "done") {
              window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Completed: ${t.title}`, type: "success" } }));
            }
          }

          if (payload.eventType === "DELETE") {
            const t = payload.old as Todo;
            setTodos((prev) => prev.filter((x) => x.id !== t.id));
            setLastEvent(`[${ts}] − Removed task`);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { todos, loading, error, lastEvent, refetch: load };
}
