import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export type TypedSupabaseClient = SupabaseClient<Database>;

/** Supabase client for Client Components. @supabase/ssr keeps one instance per browser tab. */
export function createClient(): TypedSupabaseClient {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
