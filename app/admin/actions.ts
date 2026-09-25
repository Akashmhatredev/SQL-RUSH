"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { achievementInputSchema } from "@/lib/schemas/achievement";
import { fieldErrors, type FormState } from "@/lib/schemas/errors";
import { questionInputSchema, toQuestionRow } from "@/lib/schemas/question";
import { createClient } from "@/lib/supabase/server";
import {
  bulkInsertQuestions,
  createQuestion,
  deleteAchievement,
  deleteQuestion,
  setUserRole,
  updateQuestion,
  upsertAchievement,
} from "@/services/admin";

// Every action re-checks the admin role; RLS on the tables is the final guard.

const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

// --- questions --------------------------------------------------------------

/** Create (no id) or update (with id) a question from the JSON-encoded form payload. */
export async function saveQuestionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let viewer;
  try {
    viewer = await assertAdmin();
  } catch {
    return { ok: false, message: "Admins only." };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { ok: false, message: "The form data was malformed." };
  }
  const parsed = questionInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Fix the highlighted fields." };

  const supabase = await createClient();
  const { id, ...fields } = parsed.data;
  // toQuestionRow(fields) has no id: it never changes on update and is generated on create.
  const row = toQuestionRow(fields);
  let savedId: number;
  try {
    if (id) {
      await updateQuestion(supabase, id, row);
      savedId = id;
    } else {
      savedId = (await createQuestion(supabase, { ...row, created_by: viewer.userId })).id;
    }
  } catch (e) {
    return { ok: false, message: message(e, "Couldn't save the question.") };
  }
  revalidatePath("/admin/questions");
  revalidatePath("/admin");
  redirect(`/admin/questions?saved=${savedId}`);
}

export async function deleteQuestionAction(id: number): Promise<FormState> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    await deleteQuestion(supabase, id);
  } catch (e) {
    return { ok: false, message: message(e, "Couldn't delete the question.") };
  }
  revalidatePath("/admin/questions");
  revalidatePath("/admin");
  return { ok: true, message: `Question #${id} deleted.` };
}

export async function setQuestionActiveAction(id: number, isActive: boolean): Promise<FormState> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    await updateQuestion(supabase, id, { is_active: isActive });
  } catch (e) {
    return { ok: false, message: message(e, "Couldn't update the question.") };
  }
  revalidatePath("/admin/questions");
  return { ok: true, message: isActive ? `Question #${id} is live.` : `Question #${id} is hidden from games.` };
}

export interface ImportResult extends FormState {
  inserted?: number;
  skipped?: number;
  /** index in the uploaded array → problems */
  rowErrors?: Record<number, string[]>;
}

const MAX_IMPORT = 1000;

/** Validates every question again on the server, then inserts them in batches. */
export async function importQuestionsAction(questions: unknown[]): Promise<ImportResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, message: "Admins only." };
  }
  if (!Array.isArray(questions) || questions.length === 0) return { ok: false, message: "No questions to import." };
  if (questions.length > MAX_IMPORT) return { ok: false, message: `Import at most ${MAX_IMPORT} questions at a time.` };

  const rowErrors: Record<number, string[]> = {};
  const rows = [];
  for (const [i, q] of questions.entries()) {
    const parsed = questionInputSchema.safeParse(q);
    if (parsed.success) rows.push(toQuestionRow(parsed.data));
    else rowErrors[i] = parsed.error.issues.map((issue) => `${issue.path.join(".") || "question"}: ${issue.message}`);
  }
  if (Object.keys(rowErrors).length) {
    return { ok: false, message: "Some questions are invalid. Nothing was imported.", rowErrors };
  }

  try {
    const supabase = await createClient();
    const inserted = await bulkInsertQuestions(supabase, rows);
    revalidatePath("/admin/questions");
    revalidatePath("/admin");
    return {
      ok: true,
      inserted,
      skipped: rows.length - inserted,
      message: `Imported ${inserted} question${inserted === 1 ? "" : "s"}${rows.length - inserted ? `, skipped ${rows.length - inserted} whose id already exists` : ""}.`,
    };
  } catch (e) {
    return { ok: false, message: message(e, "The import failed.") };
  }
}

// --- users ------------------------------------------------------------------

export async function setUserRoleAction(userId: string, role: "player" | "admin"): Promise<FormState> {
  const parsed = z.object({ userId: z.uuid(), role: z.enum(["player", "admin"]) }).safeParse({ userId, role });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  try {
    await assertAdmin();
    const supabase = await createClient();
    await setUserRole(supabase, parsed.data.userId, parsed.data.role);
  } catch (e) {
    return { ok: false, message: message(e, "Couldn't change the role.") };
  }
  revalidatePath("/admin/users");
  return { ok: true, message: role === "admin" ? "User promoted to admin." : "Admin access removed." };
}

// --- achievements -----------------------------------------------------------

export async function saveAchievementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, message: "Admins only." };
  }
  const mode = formData.get("mode") === "update" ? "update" : "create";
  const parsed = achievementInputSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon"),
    metric: formData.get("metric"),
    threshold: formData.get("threshold"),
    sortOrder: formData.get("sortOrder") || 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const a = parsed.data;
  try {
    const supabase = await createClient();
    await upsertAchievement(
      supabase,
      {
        id: a.id,
        title: a.title,
        description: a.description,
        icon: a.icon,
        metric: a.metric,
        threshold: a.threshold,
        sort_order: a.sortOrder,
        is_active: a.isActive,
      },
      mode,
    );
  } catch (e) {
    const msg = message(e, "Couldn't save the achievement.");
    return /already exists/i.test(msg)
      ? { ok: false, errors: { id: "An achievement with this id already exists." } }
      : { ok: false, message: msg };
  }
  revalidatePath("/admin/achievements");
  return {
    ok: true,
    message: mode === "create" ? `Achievement "${a.title}" created.` : `Achievement "${a.title}" saved.`,
  };
}

export async function deleteAchievementAction(id: string): Promise<FormState> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    await deleteAchievement(supabase, id);
  } catch (e) {
    return { ok: false, message: message(e, "Couldn't delete the achievement.") };
  }
  revalidatePath("/admin/achievements");
  return { ok: true, message: "Achievement deleted." };
}
