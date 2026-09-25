import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <Logo className="mx-auto size-14" />
        <p className="mt-6 font-mono text-sm text-sky-300">SELECT * FROM pages WHERE url = &apos;this&apos;;</p>
        <h1 className="mt-2 text-3xl font-black text-white">0 rows returned</h1>
        <p className="mt-2 text-slate-400">That page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-sky-400 to-violet-500 px-6 text-sm font-semibold text-ink-950"
        >
          Back to the game
        </Link>
      </div>
    </main>
  );
}
