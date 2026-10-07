import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-b-[3px] border-ink-200 bg-white px-1.5 font-mono text-[10px] font-semibold text-ink-600",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
