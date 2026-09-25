export type SqlTokenKind =
  "keyword" | "function" | "string" | "number" | "comment" | "operator" | "punct" | "ident" | "space";

export interface SqlToken {
  kind: SqlTokenKind;
  text: string;
}

const KEYWORDS = new Set(
  `select from where and or not in is null like ilike between order by group having limit offset distinct as on join
  inner left right full outer cross natural union all intersect except case when then else end with recursive over
  partition rows range preceding following current row unbounded asc desc nulls first last insert into values update
  set delete create table view index primary key foreign references drop alter add exists any some true false
  fetch next only filter within lateral using rollup cube grouping sets interval date timestamp window`
    .split(/\s+/)
    .filter(Boolean),
);

const FUNCTIONS = new Set(
  `count sum avg min max round coalesce nullif cast extract date_trunc upper lower length trim concat substring
  row_number rank dense_rank ntile lag lead first_value last_value percent_rank cume_dist now current_date abs
  floor ceil greatest least string_agg array_agg to_char generate_series age date_part replace position`
    .split(/\s+/)
    .filter(Boolean),
);

const PATTERN =
  /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^']|'')*'?|"(?:[^"])*"?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(<>|<=|>=|!=|::|\|\||[=<>+\-*/%])|([^\sA-Za-z0-9_])/g;

export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  for (const m of sql.matchAll(PATTERN)) {
    const [text, comment, str, number, word, space, op] = m;
    if (comment) tokens.push({ kind: "comment", text });
    else if (str) tokens.push({ kind: "string", text });
    else if (number) tokens.push({ kind: "number", text });
    else if (word) {
      const lower = word.toLowerCase();
      const next = sql.slice((m.index ?? 0) + word.length).match(/^\s*\(/);
      if (FUNCTIONS.has(lower) && next) tokens.push({ kind: "function", text });
      else if (KEYWORDS.has(lower)) tokens.push({ kind: "keyword", text });
      else tokens.push({ kind: "ident", text });
    } else if (space) tokens.push({ kind: "space", text });
    else if (op) tokens.push({ kind: "operator", text });
    else tokens.push({ kind: "punct", text });
  }
  return tokens;
}

/** Heuristic: does this multiple-choice option look like SQL rather than prose? */
export function looksLikeSql(text: string): boolean {
  return /^\s*(select|with|update|insert|delete|create|from|where|group by|order by|having|join|left join|case)\b/i.test(
    text,
  );
}
