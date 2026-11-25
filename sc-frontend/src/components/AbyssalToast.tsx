import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';
export type ToastVariant = ToastType;

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  dismissToast: (id: string) => void;
}

const MAX_VISIBLE_TOASTS = 5;
const DEFAULT_TOAST_DURATION_MS = 4500;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let fallbackCounter = 0;
function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `abyssal-toast-${Date.now()}-${fallbackCounter}`;
}

export const AbyssalToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());
  const durationsRef = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id: string) => {
      clearTimer(id);
      durationsRef.current.delete(id);
      setToasts((prev) => prev.filter((item) => item.id !== id));
    },
    [clearTimer],
  );

  const scheduleDismiss = useCallback(
    (id: string, durationMs: number) => {
      clearTimer(id);
      if (durationMs <= 0) return;
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
      timersRef.current.set(id, timer);
    },
    [clearTimer, dismissToast],
  );

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs: number = DEFAULT_TOAST_DURATION_MS) => {
      const id = createToastId();
      durationsRef.current.set(id, durationMs);
      setToasts((prev) => {
        const next = [...prev, { id, message, type }];
        if (next.length > MAX_VISIBLE_TOASTS) {
          const evicted = next.slice(0, next.length - MAX_VISIBLE_TOASTS);
          evicted.forEach((item) => {
            clearTimer(item.id);
            durationsRef.current.delete(item.id);
          });
          return next.slice(next.length - MAX_VISIBLE_TOASTS);
        }
        return next;
      });
      scheduleDismiss(id, durationMs);
    },
    [clearTimer, scheduleDismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    const durations = durationsRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      durations.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        className="abyssal-toast-stack"
        role="region"
        aria-label="Notificaciones del Grimoire"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const IconComponent =
            toast.type === 'success'
              ? CheckCircle2
              : toast.type === 'error'
                ? AlertTriangle
                : Sparkles;
          return (
            <div
              key={toast.id}
              role="status"
              className={`abyssal-toast abyssal-toast--${toast.type}`}
              onMouseEnter={() => clearTimer(toast.id)}
              onFocus={() => clearTimer(toast.id)}
              onMouseLeave={() => {
                const dur = durationsRef.current.get(toast.id);
                if (dur !== undefined) scheduleDismiss(toast.id, dur);
              }}
              onBlur={() => {
                const dur = durationsRef.current.get(toast.id);
                if (dur !== undefined) scheduleDismiss(toast.id, dur);
              }}
            >
              <IconComponent
                size={18}
                aria-hidden="true"
                className="abyssal-toast__icon"
              />
              <span className="abyssal-toast__msg">{toast.message}</span>
              <button
                type="button"
                className="abyssal-toast__close"
                onClick={() => dismissToast(toast.id)}
                aria-label="Cerrar notificación"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de AbyssalToastProvider');
  }
  return ctx;
}

export default AbyssalToastProvider;
