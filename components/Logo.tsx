import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3cc9ff" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0d1024" />
      <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="url(#logo-g)" strokeWidth="3" />
      <path d="M35 10 18 36h12l-3 18 19-28H34l1-16Z" fill="url(#logo-g)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <span className="text-lg font-black tracking-tight text-white">
        SQL<span className="text-gradient"> Rush</span>
      </span>
    </span>
  );
}
