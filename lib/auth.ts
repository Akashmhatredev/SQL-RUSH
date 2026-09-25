import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export interface Viewer {
  userId: string;
  email: string | null;
  profile: Profile | null;
}

/**
 * The signed-in user and their profile, or null. Cached per request, so
 * layouts, pages and actions can all call it for the price of one lookup.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
  return { userId: claims.sub, email: typeof claims.email === "string" ? claims.email : null, profile };
});

/** For protected pages: the viewer, or a redirect to /login that comes back here afterwards. */
export async function requireViewer(returnTo: string): Promise<Viewer & { profile: Profile }> {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return viewer as Viewer & { profile: Profile };
}

/** For admin pages and actions. The middleware checks too; RLS is the final guard. */
export async function requireAdmin(): Promise<Viewer & { profile: Profile }> {
  const viewer = await requireViewer("/admin");
  if (viewer.profile.role !== "admin") redirect("/dashboard?denied=admin");
  return viewer;
}

/** Same check for Server Actions, which should return an error rather than redirect. */
export async function assertAdmin(): Promise<Viewer & { profile: Profile }> {
  const viewer = await getViewer();
  if (!viewer?.profile || viewer.profile.role !== "admin") throw new Error("Admins only.");
  return viewer as Viewer & { profile: Profile };
}
