"use client";

import { LoaderCircle, Pencil } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { updateProfileAction } from "@/app/(site)/dashboard/actions";
import { useToasts } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type { FormState } from "@/lib/schemas/errors";
import type { Profile } from "@/types/database";

const INITIAL: FormState = { ok: false };

export function EditProfileDialog({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateProfileAction, INITIAL);
  const { push } = useToasts();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    if (!state.ok) return;
    setOpen(false);
    push({ kind: "success", title: state.message ?? "Saved" });
    void refreshProfile();
  }, [state, push, refreshProfile]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Pencil aria-hidden /> Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle className="text-white">Edit profile</DialogTitle>
            <DialogDescription>Your username and display name appear on the leaderboards.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={profile.display_name ?? ""}
              maxLength={40}
              required
              aria-invalid={!!state.errors?.displayName}
              aria-describedby={state.errors?.displayName ? "displayName-error" : undefined}
            />
            {state.errors?.displayName && (
              <p id="displayName-error" className="text-xs text-rose-300">
                {state.errors.displayName}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center rounded-md border border-input bg-transparent focus-within:ring-[3px] focus-within:ring-ring/50">
              <span className="pl-3 text-sm text-slate-500">@</span>
              <Input
                id="username"
                name="username"
                defaultValue={profile.username}
                maxLength={24}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className="border-0 pl-1 shadow-none focus-visible:ring-0"
                aria-invalid={!!state.errors?.username}
                aria-describedby="username-help"
              />
            </div>
            <p
              id="username-help"
              className={state.errors?.username ? "text-xs text-rose-300" : "text-xs text-slate-500"}
            >
              {state.errors?.username ?? "3–24 characters: lowercase letters, numbers and underscores."}
            </p>
          </div>
          {state.message && !state.ok && (
            <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2.5 text-sm text-rose-100" role="alert">
              {state.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" aria-hidden />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
