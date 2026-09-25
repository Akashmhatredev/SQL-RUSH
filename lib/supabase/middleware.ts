import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/redirect";
import type { Database } from "@/types/database";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Routes that need a signed-in user. */
const PROTECTED = ["/dashboard", "/play", "/admin"];

const matches = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Refreshes the Supabase session cookie on every request and guards routes:
 * signed-out users are sent to /login, non-admins are kept out of /admin.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Don't run code between createServerClient and getClaims(): it validates the
  // JWT and refreshes the session if needed.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = new URL(path, request.url);
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed auth cookies.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!userId && PROTECTED.some((p) => matches(pathname, p))) {
    return redirectTo("/login", { next: `${pathname}${search}` });
  }

  if (userId && matches(pathname, "/admin")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role !== "admin") return redirectTo("/dashboard", { denied: "admin" });
  }

  if (userId && pathname === "/login") {
    return redirectTo(safeNextPath(request.nextUrl.searchParams.get("next")));
  }

  return response;
}
