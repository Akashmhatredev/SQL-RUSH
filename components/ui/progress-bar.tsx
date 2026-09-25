import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  barClassName = "bg-gradient-to-r from-sky-400 to-violet-500",
  label,
  shimmer = false,
  color,
}: {
  /** 0..1 */
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
  shimmer?: boolean;
  /** Solid bar colour, overriding barClassName's gradient. */
  color?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/[0.07]", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-full transition-[width] duration-700 ease-out",
          barClassName,
        )}
        style={{ width: `${pct}%`, ...(color ? { background: color } : null) }}
      >
        {shimmer && (
          <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        )}
      </div>
    </div>
  );
}
