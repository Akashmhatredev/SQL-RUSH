import { z } from "zod";
import { ACHIEVEMENT_ICONS, METRIC_KEYS } from "@/lib/achievements";
import type { AchievementMetric } from "@/types/database";

export const achievementInputSchema = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, "Use 2–40 lowercase letters, numbers and dashes."),
  title: z.string().trim().min(1, "Title is required.").max(60),
  description: z.string().trim().min(1, "Description is required.").max(200),
  icon: z.enum(ACHIEVEMENT_ICONS),
  metric: z.enum(METRIC_KEYS as [AchievementMetric, ...AchievementMetric[]], { error: "Pick a metric." }),
  threshold: z.coerce.number().int("Must be a whole number.").positive("Must be at least 1.").max(10_000_000),
  sortOrder: z.coerce.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
});

export type AchievementInput = z.output<typeof achievementInputSchema>;
