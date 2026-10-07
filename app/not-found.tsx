import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="clay max-w-md rounded-[2rem] p-8 text-center">
        <Logo className="mx-auto size-14" />
        <p className="clay-inset mt-6 rounded-2xl px-3 py-2 font-mono text-sm text-violet-700">
          SELECT * FROM pages WHERE url = &apos;this&apos;;
        </p>
        <h1 className="mt-4 text-3xl font-black text-ink-900">0 rows returned</h1>
        <p className="mt-2 text-ink-600">That page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center rounded-2xl bg-[linear-gradient(145deg,#8a6dff,#6a4cf5_55%,#5b3ee6)] px-6 text-sm font-extrabold text-white shadow-clay-btn transition-all hover:-translate-y-0.5 active:translate-y-px active:shadow-clay-pressed"
        >
          Back to the game
        </Link>
      </div>
    </main>
  );
}
