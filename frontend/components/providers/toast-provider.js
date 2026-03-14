"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, variant: "success", ...toast }]);
    window.setTimeout(() => dismissToast(id), toast.duration ?? 3500);
  }, [dismissToast]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-2xl border p-4 shadow-glow backdrop-blur-xl",
              toast.variant === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                : "border-primary/30 bg-card/95 text-foreground"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {toast.variant === "error" ? (
                  <CircleAlert className="h-5 w-5 text-rose-300" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{toast.title}</div>
                {toast.description ? (
                  <div className="mt-1 text-sm text-muted-foreground">{toast.description}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
