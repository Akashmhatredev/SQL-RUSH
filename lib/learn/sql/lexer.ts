import { SqlError } from "./errors";

export type TokenKind = "word" | "qident" | "number" | "string" | "op" | "punct" | "eof";

export interface Token {
  kind: TokenKind;
  /** Lower-cased for words; unquoted contents for strings and quoted identifiers. */
  value: string;
  /** Exactly as written. */
  raw: string;
  start: number;
  end: number;
}

const OPERATORS = ["<>", "<=", ">=", "!=", "||", "::", "=", "<", ">", "+", "-", "*", "/", "%"];
const PUNCT = new Set(["(", ")", ",", ".", ";"]);

/**
 * Splits SQL into tokens. Comments are dropped. Smart quotes, which phones and word processors
 * like to insert, are rejected with a hint instead of a confusing syntax error.
 */
export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const c = sql[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "-" && sql[i + 1] === "-") {
      while (i < n && sql[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && sql[i + 1] === "*") {
      const close = sql.indexOf("*/", i + 2);
      if (close < 0) throw new SqlError("This comment never ends: add */ to close it.", { start: i, end: n });
      i = close + 2;
      continue;
    }

    const start = i;

    if (c === "'") {
      let value = "";
      i++;
      for (;;) {
        if (i >= n) {
          throw new SqlError("This text value is missing its closing quote '.", { start, end: n });
        }
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            value += "'";
            i += 2;
            continue;
          }
          i++;
          break;
        }
        value += sql[i++];
      }
      tokens.push({ kind: "string", value, raw: sql.slice(start, i), start, end: i });
      continue;
    }

    if (c === '"') {
      const close = sql.indexOf('"', i + 1);
      if (close < 0) throw new SqlError('This name is missing its closing quote ".', { start, end: n });
      i = close + 1;
      tokens.push({ kind: "qident", value: sql.slice(start + 1, close), raw: sql.slice(start, i), start, end: i });
      continue;
    }

    if (c === "‘" || c === "’" || c === "“" || c === "”") {
      throw new SqlError("That's a curly quote. SQL needs straight quotes: use ' for text values.", {
        start,
        end: start + 1,
      });
    }

    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(sql[i + 1] ?? ""))) {
      while (i < n && /[0-9]/.test(sql[i])) i++;
      if (sql[i] === "." && /[0-9]/.test(sql[i + 1] ?? "")) {
        i++;
        while (i < n && /[0-9]/.test(sql[i])) i++;
      }
      const raw = sql.slice(start, i);
      tokens.push({ kind: "number", value: raw, raw, start, end: i });
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      while (i < n && /[A-Za-z0-9_]/.test(sql[i])) i++;
      const raw = sql.slice(start, i);
      tokens.push({ kind: "word", value: raw.toLowerCase(), raw, start, end: i });
      continue;
    }

    const op = OPERATORS.find((o) => sql.startsWith(o, i));
    if (op) {
      i += op.length;
      tokens.push({ kind: "op", value: op, raw: op, start, end: i });
      continue;
    }

    if (PUNCT.has(c)) {
      i++;
      tokens.push({ kind: "punct", value: c, raw: c, start, end: i });
      continue;
    }

    throw new SqlError(`I don't understand the character "${c}".`, { start, end: start + 1 });
  }

  tokens.push({ kind: "eof", value: "", raw: "", start: n, end: n });
  return tokens;
}
