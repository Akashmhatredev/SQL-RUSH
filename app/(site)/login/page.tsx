import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";
import { ConfigNotice } from "@/components/layout/ConfigNotice";
import { getViewer } from "@/lib/auth";
import { safeNextPath } from "@/lib/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to SQL Rush with Google or GitHub.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!isSupabaseConfigured) return <ConfigNotice className="mt-16" />;
  const { next, error } = await searchParams;
  const destination = safeNextPath(next);
  if (await getViewer()) redirect(destination);
  return (
    <main className="grid min-h-[70dvh] place-items-center px-4 py-12">
      <LoginCard next={destination} error={error ? error.slice(0, 200) : null} />
    </main>
  );
}
