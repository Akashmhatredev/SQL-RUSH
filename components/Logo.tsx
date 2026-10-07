import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-9 drop-shadow-[3px_5px_6px_rgb(80_60_150/0.3)]", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a08bff" />
          <stop offset="1" stopColor="#5b3ee6" />
        </linearGradient>
        <radialGradient id="logo-sheen" cx="0.3" cy="0.25" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="20" fill="url(#logo-g)" />
      <rect width="64" height="64" rx="20" fill="url(#logo-sheen)" />
      <path d="M36 12 19 37h12l-3 17 19-28H35l1-14Z" fill="#3a2799" opacity="0.35" transform="translate(2 3)" />
      <path d="M36 12 19 37h12l-3 17 19-28H35l1-14Z" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <span className="text-lg font-black tracking-tight text-ink-900">
        SQL<span className="text-gradient"> Rush</span>
      </span>
    </span>
  );
}
