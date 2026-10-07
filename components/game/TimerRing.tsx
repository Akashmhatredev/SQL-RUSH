import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WARNING_SECONDS } from "@/lib/config";

const SIZE = 64;
const STROKE = 5;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Animated countdown circle. Turns amber, then flashing red under 10 seconds. */
export function TimerRing({
  remaining,
  duration,
  paused,
  untimed,
}: {
  remaining: number;
  duration: number;
  paused?: boolean;
  untimed?: boolean;
}) {
  if (untimed) {
    return (
      <div
        className="clay grid size-14 place-items-center rounded-full text-violet-500 shadow-clay-sm sm:size-16"
        title="No timer"
      >
        <InfinityIcon className="size-6" aria-label="No timer" />
      </div>
    );
  }
  const fraction = duration > 0 ? remaining / duration : 0;
  const danger = remaining <= WARNING_SECONDS && remaining > 0;
  const warn = fraction <= 0.5 && !danger;
  const color = danger ? "#f43f5e" : warn ? "#f59e0b" : "#8b6cff";
  const seconds = Math.ceil(remaining);

  return (
    <div
      className={cn(
        "clay relative size-14 shrink-0 rounded-full shadow-clay-sm sm:size-16",
        danger && !paused && "animate-[pulse_1s_ease-in-out_infinite]",
      )}
      role="timer"
      aria-label={`${seconds} seconds left`}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#e4ddf7" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={STROKE + 4}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 100ms linear, stroke 300ms ease" }}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 100ms linear, stroke 300ms ease" }}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 grid place-items-center font-mono text-lg font-bold tabular-nums sm:text-xl",
          danger ? "text-rose-700" : warn ? "text-amber-700" : "text-ink-900",
        )}
        aria-hidden
      >
        {seconds}
      </span>
    </div>
  );
}
