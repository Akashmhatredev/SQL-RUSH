import { z } from "zod";

export const profileInputSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, "3–24 characters: lowercase letters, numbers and underscores."),
  displayName: z.string().trim().min(1, "Display name is required.").max(40, "At most 40 characters."),
});

export type ProfileInput = z.output<typeof profileInputSchema>;

/** An admin editing any player. Empty optional fields clear the value. */
export const adminUserInputSchema = z.object({
  userId: z.uuid(),
  username: profileInputSchema.shape.username,
  displayName: z
    .string()
    .trim()
    .max(40, "At most 40 characters.")
    .transform((v) => v || null),
  avatarUrl: z
    .string()
    .trim()
    .max(1000, "That URL is too long.")
    .refine((v) => !v || /^https:\/\/\S+$/.test(v), "Use an https:// image URL, or leave it empty.")
    .transform((v) => v || null),
  role: z.enum(["player", "admin"], { error: "Pick a role." }),
  xp: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number, 0 or more.")
    .transform(Number)
    .pipe(z.number().max(10_000_000, "At most 10,000,000 XP.")),
});

export type AdminUserInput = z.output<typeof adminUserInputSchema>;
