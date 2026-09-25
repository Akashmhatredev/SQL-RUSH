import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-sky-400 to-violet-500",
  "from-emerald-400 to-sky-500",
  "from-fuchsia-400 to-orange-400",
  "from-amber-300 to-rose-500",
  "from-violet-400 to-pink-500",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function PlayerAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initials =
    name
      .replace(/[_-]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  return (
    <Avatar className={cn("size-9 ring-1 ring-white/10", className)}>
      {src && <AvatarImage src={src} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback
        className={cn("bg-gradient-to-br text-xs font-bold text-ink-950", GRADIENTS[hash(name) % GRADIENTS.length])}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
