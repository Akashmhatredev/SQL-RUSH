import type { Metadata } from "next";
import { Suspense } from "react";
import { GameLauncher } from "@/components/game/GameLauncher";
import { ConfigNotice } from "@/components/layout/ConfigNotice";
import { Logo } from "@/components/Logo";
import { requireViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Play",
  description: "Answer SQL questions against the clock: write, fix, predict and build queries.",
};

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!isSupabaseConfigured) return <ConfigNotice className="mt-24" />;
  const params = new URLSearchParams(
    Object.entries(await searchParams).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  await requireViewer(`/play${params.size ? `?${params}` : ""}`);

  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <Logo className="size-14 animate-pulse" />
        </div>
      }
    >
      <GameLauncher />
    </Suspense>
  );
}
