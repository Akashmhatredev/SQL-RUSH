"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setUserAchievementAction } from "@/app/admin/actions";
import { AchievementIcon } from "@/components/AchievementIcon";
import { useToasts } from "@/components/providers/ToastProvider";
import { Switch } from "@/components/ui/switch";
import { METRICS } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import type { AchievementRow } from "@/types/database";

/** Every achievement with a switch to award or revoke it for one player. */
export function UserAchievements({
  userId,
  achievements,
  unlocked,
}: {
  userId: string;
  achievements: AchievementRow[];
  unlocked: Record<string, string>;
}) {
  const router = useRouter();
  const { push } = useToasts();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (id: string, next: boolean) => {
    setBusy(id);
    startTransition(async () => {
      const res = await setUserAchievementAction(userId, id, next);
      push({ kind: res.ok ? "success" : "error", title: res.message ?? "Done" });
      if (res.ok) router.refresh();
      setBusy(null);
    });
  };

  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {achievements.map((a) => {
        const at = unlocked[a.id];
        return (
          <li key={a.id} className={cn("clay flex items-center gap-3 rounded-3xl p-3", at && "bg-amber-50")}>
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-2xl",
                at
                  ? "bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-clay-btn"
                  : "bg-ink-100 text-ink-400 shadow-clay-pressed",
              )}
            >
              <AchievementIcon name={a.icon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900">{a.title}</p>
              <p className="truncate text-[11px] font-semibold text-ink-500">
                {at
                  ? `Unlocked ${new Date(at).toLocaleDateString()}`
                  : `${METRICS[a.metric].label} ≥ ${a.threshold.toLocaleString()}`}
                {!a.is_active && " · inactive"}
              </p>
            </div>
            {busy === a.id && <LoaderCircle className="size-4 animate-spin text-ink-500" aria-label="Saving" />}
            <Switch
              checked={!!at}
              disabled={busy !== null}
              onCheckedChange={(next) => toggle(a.id, next)}
              aria-label={at ? `Revoke ${a.title}` : `Award ${a.title}`}
            />
          </li>
        );
      })}
    </ul>
  );
}
