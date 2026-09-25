"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { fieldErrors, type FormState } from "@/lib/schemas/errors";
import { profileInputSchema } from "@/lib/schemas/profile";
import { createClient } from "@/lib/supabase/server";
import { ServiceError } from "@/services/errors";
import { updateProfile } from "@/services/profile";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Your session expired. Please sign in again." };

  const parsed = profileInputSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  try {
    // RLS guarantees this only ever touches the caller's own row.
    const supabase = await createClient();
    await updateProfile(supabase, viewer.userId, {
      username: parsed.data.username,
      display_name: parsed.data.displayName,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "23505") {
      return { ok: false, errors: { username: "That username is already taken." } };
    }
    return { ok: false, message: e instanceof Error ? e.message : "Couldn't save your profile." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}
