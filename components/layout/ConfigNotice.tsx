import { DatabaseZap } from "lucide-react";

/** Shown instead of backend features until the Supabase env vars are set. */
export function ConfigNotice({ className }: { className?: string }) {
  return (
    <div
      className={`clay mx-auto max-w-xl rounded-[2rem] bg-amber-50 p-6 text-center ring-2 ring-amber-200 ${className ?? ""}`}
      role="alert"
    >
      <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-amber-100 shadow-clay-sm">
        <DatabaseZap className="size-7 text-amber-600" aria-hidden />
      </span>
      <h2 className="mt-3 text-lg font-extrabold text-ink-900">Connect Supabase to play</h2>
      <p className="mt-1 text-sm text-ink-600">
        Set <code className="font-mono font-semibold text-amber-800">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono font-semibold text-amber-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
        <code>.env.local</code> (or your Vercel project), run the migrations in <code>supabase/migrations</code>, then
        restart the app.
      </p>
    </div>
  );
}
