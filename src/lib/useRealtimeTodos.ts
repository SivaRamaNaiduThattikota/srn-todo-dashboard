"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, fetchTodos, type Todo } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { playAddSound, playDoneSound, playDeleteSound } from "@/lib/sounds";

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
            // Only add to list if not already soft-deleted
            if (!t.deleted_at) {
              setTodos((prev) => [t, ...prev]);
              setLastEvent(`[${ts}] + New: "${t.title}"`);
              playAddSound();
              window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `New task: ${t.title}`, type: "success" } }));
            }
          }

          if (payload.eventType === "UPDATE") {
            const t = payload.new as Todo;
            const old = payload.old as Todo;

            // ── KEY FIX: soft-delete means deleted_at just became non-null ──
            // Remove it from the active list immediately — it's now in the bin.
            if (t.deleted_at) {
              setTodos((prev) => prev.filter((x) => x.id !== t.id));
              setLastEvent(`[${ts}] − "${t.title}" moved to bin`);
              playDeleteSound();
              return;
            }

            // Restore from bin: deleted_at cleared → add back to active list
            if (!t.deleted_at && (old as any).deleted_at) {
              setTodos((prev) => {
                // avoid duplicates
                const exists = prev.some((x) => x.id === t.id);
                return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [t, ...prev];
              });
              setLastEvent(`[${ts}] ↩ "${t.title}" restored`);
              window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Restored: ${t.title}`, type: "success" } }));
              return;
            }

            // Normal field update (status change, title edit, etc.)
            setTodos((prev) => prev.map((x) => (x.id === t.id ? t : x)));
            setLastEvent(`[${ts}] ~ "${t.title}" → ${t.status}`);
            if (t.status === "done" && old.status !== "done") {
              playDoneSound();
              window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: `Completed: ${t.title}`, type: "success" } }));
            }
          }

          if (payload.eventType === "DELETE") {
            // Hard delete (from recycle bin)
            const t = payload.old as Todo;
            setTodos((prev) => prev.filter((x) => x.id !== t.id));
            setLastEvent(`[${ts}] − Removed task`);
            playDeleteSound();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { todos, loading, error, lastEvent, refetch: load };
}
