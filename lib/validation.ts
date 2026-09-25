import type { Question } from "@/types/question";

/**
 * Normalises SQL so that formatting differences don't matter:
 * case, whitespace, line breaks, semicolons, quote style, comments,
 * spacing around punctuation and a few optional keywords
 * (AS, ASC, INNER, OUTER) are all ignored.
 */
export function normalizeSql(sql: string): string {
  return sql
    .toLowerCase()
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/[`“”]/g, (ch) => (ch === "`" ? "" : "'"))
    .replace(/[‘’]/g, "'")
    .replace(/"/g, "'")
    .replace(/;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/<>/g, "!=")
    .replace(/\binner\s+join\b/g, "join")
    .replace(/\b(left|right|full)\s+outer\s+join\b/g, "$1 join")
    .replace(/\bas\b/g, " ")
    .replace(/\basc\b/g, " ")
    .replace(/\s*([,()=<>!+\-*/%|:])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalises plain text answers (multiple-choice, predict-output). */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export type UserAnswer =
  { kind: "text"; value: string } | { kind: "choice"; value: string | null } | { kind: "order"; value: string[] };

export function acceptedSql(question: Question): string[] {
  return [question.answer, ...(question.alternatives ?? [])];
}

export function isCorrect(question: Question, answer: UserAnswer): boolean {
  switch (question.type) {
    case "write-sql":
    case "fix-query": {
      if (answer.kind !== "text") return false;
      const given = normalizeSql(answer.value);
      if (!given) return false;
      return acceptedSql(question).some((sql) => normalizeSql(sql) === given);
    }
    case "multiple-choice":
    case "predict-output":
      return (
        answer.kind === "choice" &&
        answer.value !== null &&
        normalizeText(answer.value) === normalizeText(question.answer)
      );
    case "drag-drop": {
      if (answer.kind !== "order") return false;
      const expected = question.tokens ?? [];
      return (
        answer.value.length === expected.length &&
        answer.value.every((token, i) => normalizeText(token) === normalizeText(expected[i]))
      );
    }
  }
}

/** Human-readable version of what the player submitted, for the review screen. */
export function describeAnswer(answer: UserAnswer): string {
  switch (answer.kind) {
    case "text":
      return answer.value.trim() || "(no answer)";
    case "choice":
      return answer.value ?? "(no answer)";
    case "order":
      return answer.value.length ? answer.value.join(" ") : "(no answer)";
  }
}
