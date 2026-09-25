"use client";

import { useAuth } from "@/hooks/useAuth";
import type { TypedSupabaseClient } from "@/lib/supabase/client";

/** The browser Supabase client. Throws if the env vars are missing, so call it only where a backend is required. */
export function useSupabase(): TypedSupabaseClient {
  const { supabase } = useAuth();
  if (!supabase)
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return supabase;
}
