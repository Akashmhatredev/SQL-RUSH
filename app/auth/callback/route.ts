import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

/** OAuth redirect target: trade the one-time code for a session cookie, then continue. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const message = providerError ?? "Sign-in failed or the link expired. Please try again.";
  return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
}
