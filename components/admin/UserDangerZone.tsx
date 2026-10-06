"use client";

import { LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteUserAction, resetUserProgressAction } from "@/app/admin/actions";
import { useToasts } from "@/components/providers/ToastProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UserDangerZone({
  userId,
  username,
  isSelf,
  isAdmin,
}: {
  userId: string;
  username: string;
  isSelf: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { push } = useToasts();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"reset" | "delete" | null>(null);
  const [running, setRunning] = useState<"reset" | "delete" | null>(null);
  const [typed, setTyped] = useState("");

  const canDelete = !isSelf && !isAdmin;

  const run = (which: "reset" | "delete") => {
    setDialog(null);
    setRunning(which);
    startTransition(async () => {
      const res = which === "reset" ? await resetUserProgressAction(userId) : await deleteUserAction(userId);
      push({ kind: res.ok ? "success" : "error", title: res.message ?? "Done" });
      setRunning(null);
      if (!res.ok) return;
      if (which === "delete") router.replace("/admin/users");
      else router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.04] p-4 sm:p-5" aria-labelledby="danger">
      <h2 id="danger" className="font-semibold text-rose-100">
        Danger zone
      </h2>
      <div className="mt-3 divide-y divide-rose-400/10">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 max-w-xl">
            <p className="text-sm font-medium text-white">Reset progress</p>
            <p className="text-xs text-slate-400">
              Deletes every game, score, answer and badge of this player and sets their XP and stats to zero. The
              account, names and role stay.
            </p>
          </div>
          <Button variant="danger" size="sm" disabled={pending} onClick={() => setDialog("reset")}>
            {running === "reset" ? <LoaderCircle className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
            Reset progress
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 max-w-xl">
            <p className="text-sm font-medium text-white">Delete account</p>
            <p className="text-xs text-slate-400">
              {isSelf
                ? "You can't delete your own account."
                : isAdmin
                  ? "Change their role to Player first."
                  : "Removes the sign-in account and everything that belongs to it. They can sign up again as a new player."}
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            disabled={pending || !canDelete}
            onClick={() => {
              setTyped("");
              setDialog("delete");
            }}
          >
            {running === "delete" ? <LoaderCircle className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
            Delete account
          </Button>
        </div>
      </div>

      <AlertDialog open={dialog === "reset"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset @{username}&apos;s progress?</AlertDialogTitle>
            <AlertDialogDescription>
              Their games, scores, answers and badges are deleted and they drop off every leaderboard. This can&apos;t
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={() => run("reset")}>
              Reset progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "delete"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete @{username}?</AlertDialogTitle>
            <AlertDialogDescription>
              The account and all of its games, scores and badges are deleted permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-username" className="text-slate-300">
              Type <span className="font-mono text-white">{username}</span> to confirm
            </Label>
            <Input
              id="confirm-username"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="danger" disabled={typed.trim() !== username} onClick={() => run("delete")}>
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
