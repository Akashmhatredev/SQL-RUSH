"use client";

import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteAchievementAction, saveAchievementAction } from "@/app/admin/actions";
import { AchievementIcon } from "@/components/AchievementIcon";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ACHIEVEMENT_ICONS, METRIC_KEYS, METRICS } from "@/lib/achievements";
import type { FormState } from "@/lib/schemas/errors";
import { cn } from "@/lib/utils";
import type { AchievementWithCount } from "@/services/admin";

const INITIAL: FormState = { ok: false };

function AchievementDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AchievementWithCount | null;
}) {
  const router = useRouter();
  const { push } = useToasts();
  const [state, action, pending] = useActionState(saveAchievementAction, INITIAL);
  const [icon, setIcon] = useState(editing?.icon ?? "trophy");
  const [metric, setMetric] = useState<string>(editing?.metric ?? "questions_correct");
  const [active, setActive] = useState(editing?.is_active ?? true);

  useEffect(() => {
    if (!state.ok) return;
    push({ kind: "success", title: state.message ?? "Saved" });
    onOpenChange(false);
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = state.errors ?? {};
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <form action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? `Edit “${editing.title}”` : "New achievement"}</DialogTitle>
            <DialogDescription>
              Unlocks automatically once a player&apos;s metric reaches the threshold, checked after every answer and
              run.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="mode" value={editing ? "update" : "create"} />
          <input type="hidden" name="icon" value={icon} />
          <input type="hidden" name="metric" value={metric} />
          {active && <input type="hidden" name="isActive" value="on" />}

          <div className="grid gap-1.5">
            <Label htmlFor="a-id">Id</Label>
            <Input
              id="a-id"
              name="id"
              defaultValue={editing?.id}
              readOnly={!!editing}
              placeholder="e.g. marathon-50"
              className={cn(editing && "opacity-60")}
              aria-invalid={!!err.id}
            />
            {err.id ? (
              <p className="text-xs text-rose-300">{err.id}</p>
            ) : (
              <p className="text-xs text-slate-500">Lowercase letters, numbers and dashes. Can&apos;t change later.</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-title">Title</Label>
            <Input id="a-title" name="title" defaultValue={editing?.title} maxLength={60} aria-invalid={!!err.title} />
            {err.title && <p className="text-xs text-rose-300">{err.title}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-description">Description</Label>
            <Input
              id="a-description"
              name="description"
              defaultValue={editing?.description}
              maxLength={200}
              aria-invalid={!!err.description}
            />
            {err.description && <p className="text-xs text-rose-300">{err.description}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="grid gap-1.5">
              <Label>Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="w-full" aria-label="Metric">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong">
                  {METRIC_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {METRICS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err.metric && <p className="text-xs text-rose-300">{err.metric}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="a-threshold">Threshold</Label>
              <Input
                id="a-threshold"
                name="threshold"
                type="number"
                min={1}
                defaultValue={editing?.threshold ?? 10}
                aria-invalid={!!err.threshold}
              />
              {err.threshold && <p className="text-xs text-rose-300">{err.threshold}</p>}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Icon">
              {ACHIEVEMENT_ICONS.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={icon === name}
                  aria-label={name}
                  onClick={() => setIcon(name)}
                  className={cn(
                    "grid aspect-square place-items-center rounded-lg border transition-colors",
                    icon === name
                      ? "border-amber-300/70 bg-gradient-to-br from-amber-300 to-orange-500 text-ink-950"
                      : "border-white/10 text-slate-400 hover:border-white/30 hover:text-white",
                  )}
                >
                  <AchievementIcon name={name} className="size-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[120px_1fr] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="a-sort">Sort order</Label>
              <Input id="a-sort" name="sortOrder" type="number" min={0} defaultValue={editing?.sort_order ?? 0} />
            </div>
            <div className="flex items-center gap-3 pb-2">
              <Switch id="a-active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="a-active">Active</Label>
            </div>
          </div>
          {state.message && !state.ok && (
            <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2.5 text-sm text-rose-100" role="alert">
              {state.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" aria-hidden />} {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AchievementManager({ achievements }: { achievements: AchievementWithCount[] }) {
  const router = useRouter();
  const { push } = useToasts();
  const [dialog, setDialog] = useState<{ open: boolean; editing: AchievementWithCount | null; key: number }>({
    open: false,
    editing: null,
    key: 0,
  });
  const [deleting, setDeleting] = useState<AchievementWithCount | null>(null);
  const [pending, startTransition] = useTransition();

  const openDialog = (editing: AchievementWithCount | null) =>
    setDialog((d) => ({ open: true, editing, key: d.key + 1 }));

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={() => openDialog(null)}>
          <Plus aria-hidden /> New achievement
        </Button>
      </div>
      <ul className="grid gap-2.5 md:grid-cols-2">
        {achievements.map((a) => (
          <li
            key={a.id}
            className={cn("glass flex items-center gap-3 rounded-2xl p-3.5", !a.is_active && "opacity-60")}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-ink-950">
              <AchievementIcon name={a.icon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-white">
                <span className="truncate">{a.title}</span>
                {!a.is_active && <Badge className="border-white/10 bg-white/5 text-slate-400">Inactive</Badge>}
              </p>
              <p className="truncate text-xs text-slate-400">{a.description}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {METRICS[a.metric].label} ≥ {a.threshold.toLocaleString()} · {a.unlocks.toLocaleString()} unlocked ·{" "}
                <span className="font-mono">{a.id}</span>
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => openDialog(a)} aria-label={`Edit ${a.title}`}>
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-rose-300 hover:bg-rose-500/10"
              onClick={() => setDeleting(a)}
              aria-label={`Delete ${a.title}`}
              disabled={pending}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>

      <AchievementDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        editing={dialog.editing}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from {deleting?.unlocks ?? 0} player collection{deleting?.unlocks === 1 ? "" : "s"}. To
              retire it but keep players&apos; badges, edit it and switch it to inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => {
                const target = deleting;
                setDeleting(null);
                if (!target) return;
                startTransition(async () => {
                  const res = await deleteAchievementAction(target.id);
                  push({ kind: res.ok ? "success" : "error", title: res.message ?? "Done" });
                  if (res.ok) router.refresh();
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
