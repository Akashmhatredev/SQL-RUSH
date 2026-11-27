"use client";

import { m } from "framer-motion";
import { Check, Lock, Play, Star } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MODULES, type ModuleOutline } from "@/lib/learn/curriculum";
import type { LearnerState } from "@/lib/learn/progress";
import { lessonStatuses, moduleProgress, type LessonStatus } from "@/lib/learn/roadmap";
import { cn } from "@/lib/utils";

const MODULE_TONES: Record<ModuleOutline["color"], { header: string; bar: string; node: string }> = {
  sky: {
    header: "from-sky-200 to-sky-100",
    bar: "bg-gradient-to-r from-sky-400 to-sky-500",
    node: "from-sky-400 to-sky-600",
  },
  violet: {
    header: "from-violet-200 to-violet-100",
    bar: "bg-gradient-to-r from-violet-400 to-violet-500",
    node: "from-violet-400 to-violet-600",
  },
  emerald: {
    header: "from-emerald-200 to-emerald-100",
    bar: "bg-gradient-to-r from-emerald-400 to-emerald-500",
    node: "from-emerald-400 to-emerald-600",
  },
  amber: {
    header: "from-amber-200 to-amber-100",
    bar: "bg-gradient-to-r from-amber-400 to-amber-500",
    node: "from-amber-400 to-amber-600",
  },
  rose: {
    header: "from-rose-200 to-rose-100",
    bar: "bg-gradient-to-r from-rose-400 to-rose-500",
    node: "from-rose-400 to-rose-600",
  },
  fuchsia: {
    header: "from-fuchsia-200 to-fuchsia-100",
    bar: "bg-gradient-to-r from-fuchsia-400 to-fuchsia-500",
    node: "from-fuchsia-400 to-fuchsia-600",
  },
};

/** Horizontal offsets that make the lesson path wind left and right. */
const WIGGLE = [0, 56, 84, 56, 0, -56, -84, -56];

export const STATUS_LABELS: Record<LessonStatus, string> = {
  completed: "Completed",
  current: "In progress",
  available: "Ready to start",
  locked: "Locked",
};

function LessonNode({
  id,
  title,
  concept,
  status,
  perfect,
  index,
  tone,
}: {
  id: string;
  title: string;
  concept: string;
  status: LessonStatus;
  perfect: boolean;
  index: number;
  tone: string;
}) {
  const offset = WIGGLE[index % WIGGLE.length];
  const node = (
    <span className="relative grid place-items-center">
      {(status === "current" || status === "available") && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-40 [animation-duration:2s]",
            status === "current" ? "bg-violet-400" : "bg-sky-300",
          )}
        />
      )}
      <span
        className={cn(
          "relative grid size-[4.5rem] place-items-center rounded-full border-4 transition-transform group-hover:-translate-y-1 group-active:translate-y-0.5",
          status === "completed" && cn("border-white bg-gradient-to-br text-white shadow-clay-btn", tone),
          status === "current" &&
            "border-white bg-[linear-gradient(145deg,#8a6dff,#5b3ee6)] text-white shadow-clay-btn ring-4 ring-violet-300",
          status === "available" && "clay border-white text-violet-600",
          status === "locked" && "clay-inset border-transparent text-ink-400",
        )}
      >
        {status === "completed" ? (
          <Check className="size-8" strokeWidth={3} aria-hidden />
        ) : status === "locked" ? (
          <Lock className="size-6" aria-hidden />
        ) : (
          <Play className="size-7 translate-x-0.5 fill-current" aria-hidden />
        )}
        {perfect && status === "completed" && (
          <span
            className="absolute -right-1 -top-1 grid size-7 place-items-center rounded-full bg-amber-300 text-amber-900 shadow-clay-sm"
            title="Perfect lesson"
          >
            <Star className="size-4 fill-current" aria-label="perfect" />
          </span>
        )}
      </span>
      {(status === "current" || status === "available") && (
        <span className="absolute -top-8 whitespace-nowrap rounded-xl bg-white px-2.5 py-1 text-xs font-black text-violet-700 shadow-clay-sm">
          {status === "current" ? "Continue" : "Start"}
        </span>
      )}
    </span>
  );

  const label = (
    <span className="mt-2 block w-40 text-center">
      <span
        className={cn(
          "block text-sm font-extrabold leading-tight",
          status === "locked" ? "text-ink-500" : "text-ink-900",
        )}
      >
        {title}
      </span>
      {concept.toLowerCase().replace(/[^a-z]/g, "") !== title.toLowerCase().replace(/[^a-z]/g, "") && (
        <span className="mt-0.5 block font-mono text-[11px] font-semibold text-ink-500">{concept}</span>
      )}
    </span>
  );

  return (
    <m.li
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3 }}
      className="flex justify-center"
    >
      <div
        className="translate-x-[calc(var(--wiggle)*0.55)] sm:translate-x-(--wiggle)"
        style={{ "--wiggle": `${offset}px` } as React.CSSProperties}
      >
        {status === "locked" ? (
          <span
            className="group flex cursor-not-allowed flex-col items-center"
            aria-label={`${title}: locked. Finish the lesson before it first.`}
            title="Finish the lesson before this one to unlock it"
          >
            {node}
            {label}
          </span>
        ) : (
          <Link
            href={`/learn/${id}`}
            className="group flex flex-col items-center rounded-3xl"
            aria-label={`${title}: ${STATUS_LABELS[status]}`}
          >
            {node}
            {label}
          </Link>
        )}
      </div>
    </m.li>
  );
}

/** The learning path: every module, every lesson, and which ones are done, current, open or locked. */
export function Roadmap({ state }: { state: LearnerState | null }) {
  const statuses = lessonStatuses(state);
  const progress = moduleProgress(state);

  return (
    <div className="space-y-10">
      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-ink-600" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="size-3" strokeWidth={3} />
          </span>
          Completed
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-5 rounded-full bg-violet-600 ring-2 ring-violet-300" /> In progress
        </li>
        <li className="flex items-center gap-1.5">
          <span className="clay size-5 rounded-full" /> Ready to start
        </li>
        <li className="flex items-center gap-1.5">
          <span className="clay-inset grid size-5 place-items-center rounded-full text-ink-400">
            <Lock className="size-3" />
          </span>
          Locked
        </li>
      </ul>

      {MODULES.map((mod, mi) => {
        const p = progress[mi];
        const tone = MODULE_TONES[mod.color];
        const locked = mod.lessons.every((l) => statuses[l.id] === "locked");
        return (
          <section key={mod.id} aria-labelledby={`module-${mod.id}`} className={cn(locked && "opacity-80")}>
            <div
              className={cn("relative overflow-hidden rounded-[2rem] bg-gradient-to-br p-5 shadow-clay", tone.header)}
            >
              <div className="flex flex-wrap items-center gap-4">
                <span
                  className="grid size-14 shrink-0 place-items-center rounded-3xl bg-white/80 text-3xl shadow-clay-sm"
                  aria-hidden
                >
                  {mod.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-ink-600">Module {mod.number}</p>
                  <h2 id={`module-${mod.id}`} className="text-2xl font-black tracking-tight text-ink-900">
                    {mod.title}
                  </h2>
                  <p className="text-sm font-semibold text-ink-700">{mod.tagline}</p>
                </div>
                <div className="w-full sm:w-44">
                  <p className="mb-1 flex justify-between text-xs font-bold text-ink-700">
                    <span>{p.complete ? "Complete! 🎉" : locked ? "Locked" : "Progress"}</span>
                    <span className="font-mono">
                      {p.done}/{p.total}
                    </span>
                  </p>
                  <ProgressBar
                    value={p.done / p.total}
                    barClassName={tone.bar}
                    label={`Module ${mod.number} progress`}
                  />
                </div>
              </div>
            </div>
            <ol
              className="relative mx-auto mt-8 flex max-w-md flex-col gap-9"
              aria-label={`Module ${mod.number} lessons`}
            >
              {mod.lessons.map((l, li) => (
                <LessonNode
                  key={l.id}
                  id={l.id}
                  title={l.title}
                  concept={l.concept}
                  status={statuses[l.id]}
                  perfect={!!state?.lessons[l.id]?.perfect}
                  index={li + mi * 2}
                  tone={tone.node}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
