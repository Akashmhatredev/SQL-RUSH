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
