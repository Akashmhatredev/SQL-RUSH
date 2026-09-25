"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setUserRoleAction } from "@/app/admin/actions";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Role = "player" | "admin";

export function UserRoleSelect({
  userId,
  role,
  name,
  isSelf,
}: {
  userId: string;
  role: Role;
  name: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const { push } = useToasts();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<Role | null>(null);

  const apply = (next: Role) =>
    startTransition(async () => {
      const result = await setUserRoleAction(userId, next);
      push({ kind: result.ok ? "success" : "error", title: result.message ?? "Done" });
      if (result.ok) router.refresh();
    });

  return (
    <div className="flex items-center gap-2">
      <Select value={role} onValueChange={(v) => v !== role && setTarget(v as Role)} disabled={pending || isSelf}>
        <SelectTrigger size="sm" className="w-28" aria-label={`Role for ${name}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass-strong">
          <SelectItem value="player">Player</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
      {pending && <LoaderCircle className="size-4 animate-spin text-slate-400" aria-label="Saving" />}
      <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target === "admin" ? `Make ${name} an admin?` : `Remove admin access from ${name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target === "admin"
                ? "Admins can edit and delete questions, manage achievements, see every player's email and change roles."
                : "They will lose access to the admin panel immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={target === "admin" ? "primary" : "danger"}
              onClick={() => {
                if (target) apply(target);
                setTarget(null);
              }}
            >
              {target === "admin" ? "Make admin" : "Remove admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
