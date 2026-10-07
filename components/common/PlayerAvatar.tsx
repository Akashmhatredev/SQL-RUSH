import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-sky-200 to-violet-300",
  "from-emerald-200 to-sky-300",
  "from-fuchsia-200 to-orange-200",
  "from-amber-200 to-rose-300",
  "from-violet-200 to-pink-300",
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
    <Avatar className={cn("size-9 shadow-clay-sm ring-2 ring-white", className)}>
      {src && <AvatarImage src={src} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br text-xs font-extrabold text-ink-900",
          GRADIENTS[hash(name) % GRADIENTS.length],
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
