"use client";

import { LoaderCircle, Mail, MailCheck, TriangleAlert } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

type Method = "google" | "email";

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

export function LoginCard({ next, error }: { next: string; error?: string | null }) {
  const { supabase } = useAuth();
  const [pending, setPending] = useState<Method | null>(null);
  const [failure, setFailure] = useState<string | null>(error ?? null);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Both methods come back through /auth/callback, which exchanges the code for a session.
  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setPending("google");
    setFailure(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser is already navigating to Google.
    if (oauthError) {
      setFailure(oauthError.message);
      setPending(null);
    }
  };

  const sendMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = email.trim();
    if (!supabase || !address) return;
    setPending("email");
    setFailure(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl() },
    });
    setPending(null);
    if (otpError) setFailure(otpError.message);
    else setSentTo(address);
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

      {sentTo ? (
        <div
          className="relative mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm"
          role="status"
        >
          <MailCheck className="mx-auto size-8 text-emerald-300" aria-hidden />
          <p className="mt-2 font-semibold text-white">Check your inbox</p>
          <p className="mt-1 text-slate-300">
            We sent a sign-in link to <span className="font-medium text-white">{sentTo}</span>. Open it in this browser
            to continue.
          </p>
          <Button variant="link" size="sm" className="mt-2" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <div className="relative mt-6 grid gap-2.5">
          <Button
            size="lg"
            className="bg-white text-slate-900 hover:bg-slate-100"
            variant="outline"
            onClick={() => void signInWithGoogle()}
            disabled={pending !== null || !supabase}
          >
            {pending === "google" ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="my-1 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500" aria-hidden>
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form className="grid gap-2.5" onSubmit={(e) => void sendMagicLink(e)}>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="h-12 rounded-2xl border-white/15 bg-white/5 px-4 text-white"
              disabled={pending !== null || !supabase}
            />
            <Button type="submit" size="lg" variant="primary" disabled={pending !== null || !supabase || !email.trim()}>
              {pending === "email" ? (
                <LoaderCircle className="size-5 animate-spin" aria-hidden />
              ) : (
                <Mail className="size-5" aria-hidden />
              )}
              Email me a sign-in link
            </Button>
          </form>
        </div>
      )}
      <p className="relative mt-5 text-xs text-slate-500">
        We only use your name and avatar for your public player profile.
      </p>
    </div>
  );
}
