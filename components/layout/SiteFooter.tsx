import Link from "next/link";
import { Kbd } from "@/components/ui/kbd";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-6xl border-t border-ink-200/70 px-4 py-6 text-center text-xs text-ink-500 sm:px-6">
      <p>
        Race the clock. Master SQL. ·{" "}
        <Link href="/leaderboard" className="font-semibold hover:text-violet-700">
          Leaderboards
        </Link>
      </p>
      <p className="mt-1">
        Press <Kbd>?</Kbd> for keyboard shortcuts · Dialect: PostgreSQL · Daily reset at 00:00 UTC
      </p>
    </footer>
  );
}
