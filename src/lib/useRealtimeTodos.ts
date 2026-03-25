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

    // Subscribe to realtime changes on the todos table
    const channel = supabase
      .channel("todos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        (payload: RealtimePostgresChangesPayload<Todo>) => {
          const timestamp = new Date().toLocaleTimeString();

          if (payload.eventType === "INSERT") {
            const newTodo = payload.new as Todo;
            setTodos((prev) => [newTodo, ...prev]);
            setLastEvent(`[${timestamp}] + New task: "${newTodo.title}"`);
          }

          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Todo;
            setTodos((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
            setLastEvent(
              `[${timestamp}] ~ Updated: "${updated.title}" -> ${updated.status}`
            );
          }

          if (payload.eventType === "DELETE") {
            const deleted = payload.old as Todo;
            setTodos((prev) => prev.filter((t) => t.id !== deleted.id));
            setLastEvent(`[${timestamp}] x Removed task`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { todos, loading, error, lastEvent, refetch: load };
}
