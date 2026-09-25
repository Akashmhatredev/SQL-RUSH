/**
 * Daily challenges and daily/weekly leaderboards roll over at midnight UTC,
 * matching the database (see private.utc_today()).
 */

/** Today's UTC date as YYYY-MM-DD. */
export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** "Sep 25" for a YYYY-MM-DD key, without shifting it through the local time zone. */
export function formatDateKey(
  key: string,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { ...opts, timeZone: "UTC" });
}

/** Milliseconds until the next daily challenge (midnight UTC). */
export function msUntilUtcMidnight(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

/** The daily challenge number: #1 was 2025-01-01. */
export function dailyNumber(key: string = utcDateKey()): number {
  return daysBetween("2025-01-01", key) + 1;
}

/** The streak as it stands today: it silently breaks if a whole UTC day was missed. */
export function liveDayStreak(dayStreak: number, lastPlayedOn: string | null, today = utcDateKey()): number {
  if (!lastPlayedOn) return 0;
  return daysBetween(lastPlayedOn, today) <= 1 ? dayStreak : 0;
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }) : null;

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (!rtf) return new Date(iso).toLocaleString();
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(iso).toLocaleDateString();
}
