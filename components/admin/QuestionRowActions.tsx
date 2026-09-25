"use client";

import { Eye, EyeOff, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteQuestionAction, setQuestionActiveAction } from "@/app/admin/actions";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function QuestionRowActions({ id, isActive, preview }: { id: number; isActive: boolean; preview: string }) {
  const router = useRouter();
  const { push } = useToasts();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await action();
      push({ kind: result.ok ? "success" : "error", title: result.message ?? (result.ok ? "Done" : "Failed") });
      if (result.ok) router.refresh();
    });

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/admin/questions/${id}`} aria-label={`Edit question ${id}`}>
              <Pencil />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={() => run(() => setQuestionActiveAction(id, !isActive))}
            aria-label={isActive ? `Hide question ${id}` : `Publish question ${id}`}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : isActive ? <EyeOff /> : <Eye />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isActive ? "Hide from games" : "Publish"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
            disabled={pending}
            onClick={() => setConfirm(true)}
            aria-label={`Delete question ${id}`}
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question #{id}?</AlertDialogTitle>
            <AlertDialogDescription className="line-clamp-3">“{preview}”</AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-sm text-slate-400">
            Past answers keep their scores. To take a question out of rotation without losing it, hide it instead.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={() => run(() => deleteQuestionAction(id))}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
