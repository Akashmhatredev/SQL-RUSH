"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

type Provider = "google" | "github";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12S6.6 21.7 12 21.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12Z"
      />
      <path
        fill="#34A853"
        d="M3.4 7.5l3.2 2.3C7.5 7.9 9.6 6.3 12 6.3c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 8.3 2.3 5.1 4.4 3.4 7.5Z"
        opacity=".9"
      />
      <path
        fill="#FBBC05"
        d="M12 21.7c2.5 0 4.7-.8 6.3-2.3l-2.9-2.4c-.8.6-1.9 1-3.4 1-3.9 0-5.3-2.6-5.5-3.9l-3.2 2.5c1.7 3.1 4.9 5.1 8.7 5.1Z"
        opacity=".9"
      />
      <path
        fill="#4285F4"
        d="M21.3 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.2-1 2.2-2.1 2.9l2.9 2.4c1.9-1.8 3-4.4 3-7.6Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12a11.5 11.5 0 0 0 7.9 10.9c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5Z" />
    </svg>
  );
}

export function LoginCard({ next, error }: { next: string; error?: string | null }) {
  const { supabase } = useAuth();
  const [pending, setPending] = useState<Provider | null>(null);
  const [failure, setFailure] = useState<string | null>(error ?? null);

  const signIn = async (provider: Provider) => {
    if (!supabase) return;
    setPending(provider);
    setFailure(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    // On success the browser is already navigating to the provider.
    if (oauthError) {
      setFailure(oauthError.message);
      setPending(null);
    }
  };

  return (
    <div className="glass-strong relative w-full max-w-sm overflow-hidden rounded-3xl p-6 text-center sm:p-8">
      <div
        aria-hidden
        className="absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl"
      />
      <Logo className="relative mx-auto size-14" />
      <h1 className="relative mt-5 text-2xl font-black text-white">Sign in to SQL Rush</h1>
      <p className="relative mt-1 text-sm text-slate-400">Save your XP, climb the leaderboards and keep your streak.</p>

      {failure && (
        <p
          className="relative mt-5 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-left text-sm text-rose-100"
          role="alert"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {failure}
        </p>
      )}

      <div className="relative mt-6 grid gap-2.5">
        <Button
          size="lg"
          className="bg-white text-slate-900 hover:bg-slate-100"
          variant="outline"
          onClick={() => void signIn("google")}
          disabled={pending !== null || !supabase}
        >
          {pending === "google" ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <GoogleIcon />}
          Continue with Google
        </Button>
        <Button
          size="lg"
          className="border-white/15 bg-[#24292f] text-white hover:bg-[#2f363d]"
          variant="outline"
          onClick={() => void signIn("github")}
          disabled={pending !== null || !supabase}
        >
          {pending === "github" ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <GitHubIcon />}
          Continue with GitHub
        </Button>
      </div>
      <p className="relative mt-5 text-xs text-slate-500">
        We only use your name and avatar for your public player profile.
      </p>
    </div>
  );
}
