export interface Span {
  start: number;
  end: number;
}

/**
 * A mistake in the learner's SQL, phrased for a beginner. `span` points at the part of the
 * query to underline; `hint` is an optional next step ("Did you mean …?").
 */
export class SqlError extends Error {
  readonly span: Span | null;
  readonly hint: string | null;

  constructor(message: string, span: Span | null = null, hint: string | null = null) {
    super(message);
    this.name = "SqlError";
    this.span = span;
    this.hint = hint;
  }
}

/** Levenshtein distance, for "did you mean" suggestions. */
function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** The closest candidate to `name`, if it is close enough to be a likely typo. */
export function suggest(name: string, candidates: Iterable<string>): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  const target = name.toLowerCase();
  for (const c of candidates) {
    const d = distance(target, c.toLowerCase());
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }
  if (best === null) return null;
  const limit = Math.max(1, Math.floor(Math.max(target.length, best.length) / 3));
  return bestScore <= limit ? best : null;
}
