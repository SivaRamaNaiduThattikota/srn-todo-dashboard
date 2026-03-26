"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
}

export function ToastProvider({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // Listen for custom toast events from anywhere in the app
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.message) addToast(detail.message, detail.type || "info");
    };
    window.addEventListener("srn:toast", handler);
    return () => window.removeEventListener("srn:toast", handler);
  }, [addToast]);

  const colors: Record<Toast["type"], { border: string; text: string }> = {
    success: { border: "rgba(110,231,183,0.3)", text: "#6ee7b7" },
    info: { border: "rgba(96,165,250,0.3)", text: "#60a5fa" },
    warning: { border: "rgba(251,191,36,0.3)", text: "#fbbf24" },
    error: { border: "rgba(248,113,113,0.3)", text: "#f87171" },
  };

  return (
    <>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: "320px" }}>
        {toasts.map((toast) => (
          <div key={toast.id}
            className="glass-heavy rounded-2xl px-4 py-3 animate-slide-up pointer-events-auto"
            style={{ borderColor: colors[toast.type].border, borderWidth: "1px" }}>
            <span className="text-xs font-mono" style={{ color: colors[toast.type].text }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
