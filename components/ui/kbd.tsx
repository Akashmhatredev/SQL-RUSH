import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/15 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-slate-300",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
