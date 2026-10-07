"use client";

import { AnimatePresence, m } from "framer-motion";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AchievementIcon } from "@/components/AchievementIcon";
import type { Level } from "@/lib/levels";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export interface ToastAchievement {
  title: string;
  description: string;
  icon: string;
}

export type ToastInput =
  | { kind: "achievement"; achievement: ToastAchievement }
  | { kind: "level"; level: Level }
  | { kind: "info" | "success" | "error"; title: string; description?: string };

type Toast = ToastInput & { id: number };

const ToastContext = createContext<{ push: (toast: ToastInput) => void } | null>(null);

const DURATION = 3800;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-2), { ...toast, id }]);
      if (toast.kind === "achievement") sound.play("achievement");
      if (toast.kind === "level") sound.play("levelup");
      window.setTimeout(() => dismiss(id), toast.kind === "error" ? DURATION + 1500 : DURATION);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <m.button
              key={t.id}
              layout
              type="button"
              onClick={() => dismiss(t.id)}
              initial={{ opacity: 0, y: -24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="pointer-events-auto w-full max-w-sm text-left"
            >
              <ToastBody toast={t} />
            </m.button>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastBody({ toast }: { toast: Toast }) {
  if (toast.kind === "achievement") {
    return (
      <div className="clay-strong flex items-center gap-3 rounded-3xl bg-amber-50 p-3 ring-2 ring-amber-200">
        <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-clay-btn">
          <AchievementIcon name={toast.achievement.icon} className="size-6" />
          <span className="absolute inset-0 animate-ping rounded-2xl bg-amber-300/40 [animation-iteration-count:2]" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Achievement unlocked</p>
          <p className="truncate font-extrabold text-ink-900">{toast.achievement.title}</p>
          <p className="truncate text-xs text-ink-600">{toast.achievement.description}</p>
        </div>
      </div>
    );
  }
  if (toast.kind === "level") {
    return (
      <div className="clay-strong flex items-center gap-3 rounded-3xl bg-violet-50 p-3 ring-2 ring-violet-200">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-200 to-violet-300 text-2xl shadow-clay-btn">
          {toast.level.emoji}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">Level up!</p>
          <p className="font-extrabold text-ink-900">You are now {toast.level.name}</p>
        </div>
      </div>
    );
  }
  const Icon = toast.kind === "success" ? CircleCheck : toast.kind === "error" ? CircleAlert : Info;
  return (
    <div
      className={cn(
        "clay-strong flex items-center gap-3 rounded-3xl p-3",
        toast.kind === "error" && "ring-2 ring-rose-200",
        toast.kind === "success" && "ring-2 ring-emerald-200",
      )}
    >
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl shadow-clay-sm",
          toast.kind === "error"
            ? "bg-rose-100 text-rose-600"
            : toast.kind === "success"
              ? "bg-emerald-100 text-emerald-600"
              : "bg-sky-100 text-sky-600",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-ink-900">{toast.title}</p>
        {toast.description && <p className="text-xs text-ink-600">{toast.description}</p>}
      </div>
    </div>
  );
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToasts must be used inside <ToastProvider>");
  return ctx;
}
