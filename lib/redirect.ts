/**
 * Only same-site relative paths are allowed as post-login destinations,
 * so `?next=` can't be used as an open redirect.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const url = new URL(next, "http://sql-rush.local");
    if (url.origin !== "http://sql-rush.local") return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
