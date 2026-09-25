/** An error whose message is safe and friendly enough to show to the player. */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

interface PostgrestLikeError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Our SQL functions raise user-facing messages with SQLSTATE P0001/P0002/28000/42501.
 * Everything else (constraint names, network failures…) gets a generic message.
 */
export function toServiceError(error: unknown, fallback = "Something went wrong. Please try again."): ServiceError {
  if (error instanceof ServiceError) return error;
  const e = (error ?? {}) as PostgrestLikeError;
  const code = e.code;
  const message = e.message ?? (error instanceof Error ? error.message : "");
  if (code === "P0001" || code === "P0002") return new ServiceError(message, code);
  if (code === "28000" || code === "PGRST301" || /JWT/i.test(message)) {
    return new ServiceError("Your session expired. Please sign in again.", code);
  }
  if (code === "42501") return new ServiceError("You don't have permission to do that.", code);
  if (code === "23505") return new ServiceError("That already exists.", code);
  if (code === "23514") return new ServiceError("Some values aren't valid.", code);
  if (/fetch|network|Failed to fetch|NetworkError/i.test(message)) {
    return new ServiceError("Couldn't reach the server. Check your connection and try again.", "network");
  }
  return new ServiceError(fallback, code);
}

export function unwrap<T>(result: { data: T | null; error: unknown }, fallback?: string): T {
  if (result.error) throw toServiceError(result.error, fallback);
  return result.data as T;
}
