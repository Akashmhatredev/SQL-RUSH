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
            <DialogTitle className="text-xl font-extrabold text-ink-900">Edit profile</DialogTitle>
            <DialogDescription>Your username and display name appear on the leaderboards.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="displayName" className="font-bold text-ink-800">
              Display name
            </Label>
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
              <p id="displayName-error" className="text-xs font-semibold text-rose-700">
                {state.errors.displayName}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username" className="font-bold text-ink-800">
              Username
            </Label>
            <div className="clay-inset flex items-center rounded-xl transition-[box-shadow] focus-within:ring-[3px] focus-within:ring-ring/50">
              <span className="pl-3.5 text-sm font-bold text-ink-500">@</span>
              <Input
                id="username"
                name="username"
                defaultValue={profile.username}
                maxLength={24}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className="border-0 bg-transparent pl-1 shadow-none focus-visible:ring-0"
                aria-invalid={!!state.errors?.username}
                aria-describedby="username-help"
              />
            </div>
            <p
              id="username-help"
              className={state.errors?.username ? "text-xs font-semibold text-rose-700" : "text-xs text-ink-500"}
            >
              {state.errors?.username ?? "3–24 characters: lowercase letters, numbers and underscores."}
            </p>
          </div>
          {state.message && !state.ok && (
            <p className="rounded-2xl bg-rose-100 p-3 text-sm font-semibold text-rose-800 shadow-clay-sm" role="alert">
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
