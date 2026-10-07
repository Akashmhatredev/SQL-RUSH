"use client";

import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  display,
  accent,
  index = 0,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  /** Shown instead of the animated number. */
  display?: string;
  /** Tailwind background class for the icon chip and glow, e.g. "bg-sky-500". */
  accent: string;
  index?: number;
  hint?: string;
}) {
  const shown = useCountUp(value, { from: 0 });
  return (
    <m.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 260, damping: 24 }}
      whileHover={{ y: -3 }}
      className="clay relative overflow-hidden rounded-3xl p-4"
      title={hint}
    >
      <div aria-hidden className={cn("absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-2xl", accent)} />
      <div className={cn("relative mb-3 grid size-10 place-items-center rounded-2xl shadow-clay-btn", accent)}>
        <Icon className="size-5 text-white" aria-hidden />
      </div>
      <p className="relative truncate font-mono text-2xl font-bold text-ink-900 sm:text-3xl">
        {display ?? `${shown.toLocaleString()}${suffix}`}
      </p>
      <p className="relative mt-0.5 text-xs font-semibold text-ink-500">{label}</p>
    </m.div>
  );
}

export function Section({
  id,
  title,
  children,
  delay = 0,
  action,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  delay?: number;
  action?: React.ReactNode;
}) {
  return (
    <m.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mt-8 scroll-mt-24"
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id={id ? `${id}-title` : undefined} className="text-lg font-extrabold text-ink-900">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </m.section>
  );
}
