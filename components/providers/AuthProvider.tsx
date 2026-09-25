"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient, type TypedSupabaseClient } from "@/lib/supabase/client";
import { getProfile } from "@/services/profile";
import type { Profile } from "@/types/database";

export interface InitialViewer {
  userId: string;
  email: string | null;
  profile: Profile | null;
}

interface AuthContextValue {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  isAdmin: boolean;
  configured: boolean;
  /** Re-read the profile, e.g. after a game changed XP. */
  refreshProfile: () => Promise<Profile | null>;
  /** Apply a change locally (optimistic update after an edit). */
  setProfile: (profile: Profile) => void;
  signOut: () => Promise<void>;
  supabase: TypedSupabaseClient | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialViewer,
  children,
}: {
  initialViewer: InitialViewer | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => (isSupabaseConfigured ? createClient() : null), []);
  const [userId, setUserId] = useState(initialViewer?.userId ?? null);
  const [email, setEmail] = useState(initialViewer?.email ?? null);
  const [profile, setProfile] = useState<Profile | null>(initialViewer?.profile ?? null);
  const userRef = useRef(userId);
  userRef.current = userId;

  // The server re-renders the layout after router.refresh(): adopt its fresh data.
  useEffect(() => {
    setUserId(initialViewer?.userId ?? null);
    setEmail(initialViewer?.email ?? null);
    setProfile(initialViewer?.profile ?? null);
  }, [initialViewer?.userId, initialViewer?.email, initialViewer?.profile]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextId = session?.user.id ?? null;
      if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && nextId !== userRef.current)) {
        setUserId(nextId);
        setEmail(session?.user.email ?? null);
        if (!nextId) setProfile(null);
        // Server Components read the session from cookies: re-render them.
        router.refresh();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [supabase, router]);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !userRef.current) return null;
    try {
      const next = await getProfile(supabase, userRef.current);
      if (next) setProfile(next);
      return next;
    } catch {
      return null;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setUserId(null);
    setProfile(null);
    router.push("/");
    router.refresh();
  }, [supabase, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      userId,
      email,
      profile,
      isAdmin: profile?.role === "admin",
      configured: isSupabaseConfigured,
      refreshProfile,
      setProfile,
      signOut,
      supabase,
    }),
    [userId, email, profile, refreshProfile, signOut, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
