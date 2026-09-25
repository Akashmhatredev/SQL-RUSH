import type { z } from "zod";

/** Flattens zod issues into { field: message } for forms (first message per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "form";
    out[key] ??= issue.message;
  }
  return out;
}

/** The standard return type of our form Server Actions. */
export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}
