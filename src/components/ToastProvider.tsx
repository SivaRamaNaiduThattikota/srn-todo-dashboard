"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
}

const ToastContext = createContext<{
  addToast: (message: string, type?: Toast["type"]) => void;
}>({ addToast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const typeStyles: Record<Toast["type"], string> = {
    success: "border-status-done/30 text-status-done",
    info: "border-status-in_progress/30 text-status-in_progress",
    warning: "border-status-pending/30 text-status-pending",
    error: "border-status-blocked/30 text-status-blocked",
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass-heavy rounded-2xl px-5 py-3 animate-slide-up pointer-events-auto border ${typeStyles[toast.type]}`}
          >
            <span className="text-sm font-mono">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
