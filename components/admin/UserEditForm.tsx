"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { updateUserAction } from "@/app/admin/actions";
import { useToasts } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { levelForXp } from "@/lib/levels";
import type { FormState } from "@/lib/schemas/errors";

const INITIAL: FormState = { ok: false };

type Role = "player" | "admin";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="font-bold text-ink-800">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-ink-500">{hint}</p>
      )}
    </div>
  );
}

export function UserEditForm({
  user,
  isSelf,
}: {
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null; role: Role; xp: number };
  isSelf: boolean;
}) {
  const router = useRouter();
  const { push } = useToasts();
  const [state, action, pending] = useActionState(updateUserAction, INITIAL);
  const [role, setRole] = useState<Role>(user.role);
  const [xp, setXp] = useState(String(user.xp));

  useEffect(() => {
    if (!state.ok) return;
    push({ kind: "success", title: state.message ?? "Saved" });
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = state.errors ?? {};
  const invalid = (key: string) => ({
    "aria-invalid": !!err[key] || undefined,
    "aria-describedby": err[key] ? `${key}-error` : undefined,
  });
  const level = /^\d+$/.test(xp) ? levelForXp(Number(xp)) : null;

  return (
    <form action={action} className="clay grid gap-4 rounded-3xl p-5" noValidate>
      <h2 className="font-extrabold text-ink-900">Profile</h2>
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="role" value={role} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="username" label="Username" error={err.username} hint="3–24 lowercase letters, numbers or _.">
          <Input id="username" name="username" defaultValue={user.username} maxLength={24} {...invalid("username")} />
        </Field>
        <Field id="displayName" label="Display name" error={err.displayName} hint="Empty shows the username.">
          <Input
            id="displayName"
            name="displayName"
            defaultValue={user.displayName ?? ""}
            maxLength={40}
            {...invalid("displayName")}
          />
        </Field>
      </div>
      <Field id="avatarUrl" label="Avatar URL" error={err.avatarUrl} hint="An https:// image. Empty removes it.">
        <Input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          defaultValue={user.avatarUrl ?? ""}
          placeholder="https://…"
          {...invalid("avatarUrl")}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="role"
          label="Role"
          error={err.role}
          hint={isSelf ? "You can't remove your own admin role." : "Admins can use this panel."}
        >
          <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isSelf}>
            <SelectTrigger id="role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          id="xp"
          label="XP"
          error={err.xp}
          hint={level ? `Level ${level.index + 1} · ${level.name}. The level follows the XP.` : undefined}
        >
          <Input
            id="xp"
            name="xp"
            inputMode="numeric"
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            className="font-mono"
            {...invalid("xp")}
          />
        </Field>
      </div>

      {state.message && !state.ok && (
        <p
          className="clay rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-800 ring-2 ring-rose-300"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />} Save changes
        </Button>
      </div>
    </form>
  );
}
