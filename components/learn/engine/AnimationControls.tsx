"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipForward, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPEEDS, type StepPlayer } from "./useStepPlayer";

function IconButton({
  label,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl text-ink-600 transition-all hover:bg-white hover:text-ink-900 hover:shadow-clay-sm active:shadow-clay-pressed disabled:pointer-events-none disabled:opacity-35",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Play, pause, step, replay, reset, speed and skip for any step-by-step animation,
 * plus a clickable progress track (one dot per step).
 */
export function AnimationControls({
  player,
  titles,
  className,
}: {
  player: StepPlayer;
  /** Step titles, used as the dots' labels. */
  titles: string[];
  className?: string;
}) {
  const { index, count, playing, speed } = player;
  const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];

  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-2", className)}>
      <div className="flex items-center gap-0.5">
        <IconButton label="Previous step" onClick={player.prev} disabled={index === 0}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <button
          type="button"
          onClick={player.toggle}
          aria-label={playing ? "Pause" : player.atEnd ? "Play again" : "Play"}
          className={cn(
            "grid size-11 place-items-center rounded-2xl text-white shadow-clay-btn transition-all hover:-translate-y-0.5 active:translate-y-px active:shadow-clay-pressed",
            "bg-[linear-gradient(145deg,#8a6dff,#6a4cf5_55%,#5b3ee6)]",
          )}
        >
          {playing ? (
            <Pause className="size-5 fill-current" />
          ) : (
            <Play className="size-5 translate-x-px fill-current" />
          )}
        </button>
        <IconButton label="Next step" onClick={player.next} disabled={player.atEnd}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      <ol className="mx-1 flex min-w-20 flex-1 items-center gap-1" aria-label="Animation steps">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="flex min-w-0 flex-1">
            <button
              type="button"
              onClick={() => player.goTo(i)}
              aria-label={`Step ${i + 1}: ${titles[i] ?? ""}`}
              aria-current={i === index ? "step" : undefined}
              title={titles[i]}
              className="group flex h-6 w-full items-center"
            >
              <span
                className={cn(
                  "h-2 w-full rounded-full transition-colors duration-300",
                  i < index ? "bg-violet-400" : i === index ? "bg-violet-600" : "bg-ink-200 group-hover:bg-ink-300",
                )}
              />
            </button>
          </li>
        ))}
      </ol>
      <span className="font-mono text-xs font-semibold text-ink-500 tabular-nums" aria-live="off">
        {index + 1}/{count}
      </span>

      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => player.setSpeed(nextSpeed)}
          className="h-9 min-w-12 rounded-xl px-2 font-mono text-xs font-bold text-ink-600 transition-all hover:bg-white hover:text-ink-900 hover:shadow-clay-sm"
          aria-label={`Speed ${speed}×. Change to ${nextSpeed}×`}
          title="Animation speed"
        >
          {speed}×
        </button>
        <IconButton label="Replay from the start" onClick={player.replay}>
          <RotateCcw className="size-4" />
        </IconButton>
        <IconButton label="Reset to the first step" onClick={player.reset} disabled={index === 0 && !playing}>
          <Undo2 className="size-4" />
        </IconButton>
        <IconButton label="Skip to the result" onClick={player.skip} disabled={player.atEnd}>
          <SkipForward className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}
