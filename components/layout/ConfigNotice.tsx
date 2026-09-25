import { DatabaseZap } from "lucide-react";

/** Shown instead of backend features until the Supabase env vars are set. */
export function ConfigNotice({ className }: { className?: string }) {
  return (
    <div
      className={`glass mx-auto max-w-xl rounded-3xl border-amber-300/30 p-6 text-center ${className ?? ""}`}
      role="alert"
    >
      <DatabaseZap className="mx-auto size-9 text-amber-300" aria-hidden />
      <h2 className="mt-3 text-lg font-bold text-white">Connect Supabase to play</h2>
      <p className="mt-1 text-sm text-slate-400">
        Set <code className="font-mono text-amber-200">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-amber-200">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> (or
        your Vercel project), run the migrations in <code>supabase/migrations</code>, then restart the app.
      </p>
    </div>
  );
}
