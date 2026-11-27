import type {
  BinaryOp,
  Clause,
  ClauseKind,
  Cte,
  DeleteStmt,
  Expr,
  FromItem,
  InsertStmt,
  JoinClause,
  JoinKind,
  OrderItem,
  SelectItem,
  SelectStmt,
  Statement,
  UpdateStmt,
  WindowSpec,
} from "./ast";
import { SqlError, type Span } from "./errors";
import { tokenize, type Token } from "./lexer";

/** Words that end an expression or a list, so they can never be read as an alias. */
const RESERVED = new Set(
  `select from where group order having limit offset join inner left right full cross outer on union intersect
  except and or as into values set by when then else end not is in like ilike between asc desc nulls with over
  partition exists case null true false distinct all insert update delete natural using returning`.split(/\s+/),
);

const UNSUPPORTED: Record<string, string> = {
  union: "UNION isn't part of this course yet. Try one query at a time.",
  intersect: "INTERSECT isn't part of this course yet.",
  except: "EXCEPT isn't part of this course yet.",
  natural: "NATURAL JOIN isn't supported here. Write the join condition with ON instead.",
  using: "JOIN … USING isn't supported here. Write the join condition with ON instead, e.g. ON a.id = b.a_id.",
  returning: "RETURNING isn't supported here. Run a SELECT afterwards to see the rows.",
  create: "Creating tables isn't part of this playground. The tables you need already exist.",
  drop: "Dropping tables isn't allowed in this playground.",
  alter: "Changing a table's structure isn't part of this playground.",
  truncate: "TRUNCATE isn't supported here. Use DELETE FROM table_name instead.",
};

const CLAUSE_STARTERS = new Set(["from", "where", "group", "having", "order", "limit", "offset", "join"]);

function span(start: number, end: number): Span {
  return { start, end };
}

class Parser {
  private pos = 0;
  private readonly tokens: Token[];
  private clauseCounter = 0;

  constructor(private readonly sql: string) {
    this.tokens = tokenize(sql);
  }

  // --- token helpers -------------------------------------------------------

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private next(): Token {
    const t = this.peek();
    if (t.kind !== "eof") this.pos++;
    return t;
  }

  private prevEnd(): number {
    return this.tokens[Math.max(0, this.pos - 1)].end;
  }

  private isWord(word: string, offset = 0): boolean {
    const t = this.peek(offset);
    return t.kind === "word" && t.value === word;
  }

  private eatWord(word: string): Token | null {
    return this.isWord(word) ? this.next() : null;
  }

  private isPunct(p: string, offset = 0): boolean {
    const t = this.peek(offset);
    return t.kind === "punct" && t.value === p;
  }

  private eatPunct(p: string): Token | null {
    return this.isPunct(p) ? this.next() : null;
  }

  private isOp(op: string): boolean {
    const t = this.peek();
    return t.kind === "op" && t.value === op;
  }

  private describe(t: Token): string {
    if (t.kind === "eof") return "the end of the query";
    return `"${t.raw}"`;
  }

  private fail(message: string, t: Token = this.peek(), hint: string | null = null): never {
    throw new SqlError(message, t.kind === "eof" ? span(Math.max(0, t.start - 1), t.start) : t, hint);
  }

  private expectWord(word: string, context?: string): Token {
    const t = this.peek();
    if (this.isWord(word)) return this.next();
    if (t.kind === "eof") {
      this.fail(`The query ends too early: I expected ${word.toUpperCase()}${context ? ` ${context}` : ""}.`);
    }
    this.fail(`I expected ${word.toUpperCase()}${context ? ` ${context}` : ""} but found ${this.describe(t)}.`);
  }

  private expectPunct(p: string, what: string): Token {
    if (this.isPunct(p)) return this.next();
    const t = this.peek();
    if (p === ")") {
      this.fail(`A bracket is missing: add ) to close the (.`, t);
    }
    this.fail(`I expected ${what} but found ${this.describe(t)}.`, t);
  }

  private checkUnsupported(t: Token = this.peek()) {
    if (t.kind === "word" && UNSUPPORTED[t.value]) this.fail(UNSUPPORTED[t.value], t);
  }

  private identifier(what: string): Token {
    const t = this.peek();
    if (t.kind === "qident") return this.next();
    if (t.kind === "word" && !RESERVED.has(t.value)) return this.next();
    this.checkUnsupported(t);
    if (t.kind === "eof") this.fail(`The query ends too early: I expected ${what}.`, t);
    this.fail(`I expected ${what} but found ${this.describe(t)}.`, t);
  }

  private clause(kind: ClauseKind, start: number): Clause {
    return { id: `${kind}-${this.clauseCounter++}`, kind, span: span(start, this.prevEnd()) };
  }

  // --- statements ------------------------------------------------------------

  parseScript(): Statement[] {
    const statements: Statement[] = [];
    while (this.peek().kind !== "eof") {
      if (this.eatPunct(";")) continue;
      statements.push(this.parseStatement());
      const t = this.peek();
      if (t.kind === "eof") break;
      if (!this.eatPunct(";")) {
        this.checkUnsupported(t);
        if (t.kind === "word" && t.value === "order" && !this.isWord("by", 1)) {
          this.fail("ORDER needs BY: write ORDER BY.", t);
        }
        if (t.kind === "word" && t.value === "group" && !this.isWord("by", 1)) {
          this.fail("GROUP needs BY: write GROUP BY.", t);
        }
        if (t.kind === "word" && (t.value === "select" || t.value === "insert" || t.value === "update")) {
          this.fail(`Put a semicolon ; between statements before ${this.describe(t)}.`, t);
        }
        if (t.kind === "word" && t.value === "where" && statements.at(-1)?.type === "select") {
          this.fail(
            "WHERE is in the wrong place. The order is SELECT … FROM … WHERE … GROUP BY … ORDER BY … LIMIT.",
            t,
          );
        }
        this.fail(`I didn't expect ${this.describe(t)} here.`, t);
      }
    }
    if (!statements.length) throw new SqlError("Write a query first.", null);
    return statements;
  }

  private parseStatement(): Statement {
    const t = this.peek();
    this.checkUnsupported(t);
    if (this.isWord("select") || this.isWord("with")) return this.parseSelect();
    if (this.isWord("insert")) return this.parseInsert();
    if (this.isWord("update")) return this.parseUpdate();
    if (this.isWord("delete")) return this.parseDelete();
    if (t.kind === "word" && t.value === "from") {
      this.fail("A query starts with SELECT, then the columns, then FROM.", t, "Try: SELECT * FROM table_name");
    }
    this.fail(`A statement starts with SELECT, INSERT, UPDATE or DELETE, not ${this.describe(t)}.`, t);
  }

  parseSelect(): SelectStmt {
    const start = this.peek().start;
    const clauses: Clause[] = [];
    const ctes: Cte[] = [];

    if (this.isWord("with")) {
      const withStart = this.next().start;
      do {
        const nameTok = this.identifier("a name for the WITH query");
        this.expectWord("as", `after the name "${nameTok.raw}"`);
        const open = this.expectPunct("(", "( to start the WITH query");
        if (!this.isWord("select") && !this.isWord("with")) {
          this.fail("A WITH query needs a SELECT inside its brackets.", this.peek());
        }
        const query = this.parseSelect();
        const close = this.expectPunct(")", ")");
        ctes.push({ name: nameTok.value, query, span: span(open.start, close.end) });
      } while (this.eatPunct(","));
      clauses.push(this.clause("with", withStart));
    }

    const selectTok = this.expectWord("select");
    let distinct = false;
    if (this.eatWord("distinct")) distinct = true;
    else this.eatWord("all");

    const columns: SelectItem[] = [];
    if (CLAUSE_STARTERS.has(this.peek().value) && this.peek().kind === "word") {
      this.fail(`Say which columns to show after SELECT, e.g. SELECT * or SELECT name.`, this.peek());
    }
    do {
      if (this.peek().kind === "word" && this.peek().value === "from") {
        this.fail("There's an extra comma before FROM.", this.tokens[this.pos - 1]);
      }
      columns.push(this.parseSelectItem());
    } while (this.eatPunct(","));
    clauses.push(this.clause("select", selectTok.start));

    let from: FromItem | null = null;
    const joins: JoinClause[] = [];
    if (this.isWord("from")) {
      const fromTok = this.next();
      from = this.parseFromItem();
      clauses.push(this.clause("from", fromTok.start));
      for (;;) {
        const joinStart = this.peek().start;
        if (this.eatPunct(",")) {
          const item = this.parseFromItem();
          joins.push({ kind: "cross", keyword: ",", item, on: null, span: span(joinStart, this.prevEnd()) });
          clauses.push(this.clause("join", joinStart));
          continue;
        }
        const kind = this.parseJoinKeyword();
        if (!kind) break;
        const item = this.parseFromItem();
        let on: Expr | null = null;
        if (kind.kind !== "cross") {
          this.checkUnsupported();
          if (!this.isWord("on")) {
            this.fail(
              `${kind.keyword} needs ON to say how rows match, e.g. ON a.id = b.a_id.`,
              this.peek().kind === "eof" ? this.tokens[this.pos - 1] : this.peek(),
            );
          }
          this.next();
          on = this.parseExpr();
        }
        joins.push({ ...kind, item, on, span: span(joinStart, this.prevEnd()) });
        clauses.push(this.clause("join", joinStart));
      }
    } else if (
      this.peek().kind === "word" &&
      !RESERVED.has(this.peek().value) &&
      columns.at(-1)?.expr.type === "star"
    ) {
      this.fail(`Did you forget FROM before ${this.describe(this.peek())}?`, this.peek());
    }

    let where: Expr | null = null;
    if (this.isWord("where")) {
      const t = this.next();
      where = this.parseExpr();
      clauses.push(this.clause("where", t.start));
    }

    const groupBy: Expr[] = [];
    if (this.isWord("group")) {
      const t = this.next();
      if (!this.eatWord("by")) this.fail("GROUP needs BY: write GROUP BY.", t);
      do groupBy.push(this.parseExpr());
      while (this.eatPunct(","));
      clauses.push(this.clause("group", t.start));
    }

    let having: Expr | null = null;
    if (this.isWord("having")) {
      const t = this.next();
      having = this.parseExpr();
      clauses.push(this.clause("having", t.start));
    }

    const orderBy: OrderItem[] = [];
    if (this.isWord("order")) {
      const t = this.next();
      if (!this.eatWord("by")) this.fail("ORDER needs BY: write ORDER BY.", t);
      orderBy.push(...this.parseOrderList());
      clauses.push(this.clause("order", t.start));
    }

    let limit: Expr | null = null;
    let offset: Expr | null = null;
    if (this.isWord("limit") || this.isWord("offset")) {
      const limitStart = this.peek().start;
      for (let i = 0; i < 2; i++) {
        if (!limit && this.eatWord("limit")) limit = this.parseAdditive();
        else if (!offset && this.eatWord("offset")) {
          offset = this.parseAdditive();
          this.eatWord("rows");
        }
      }
      clauses.push(this.clause("limit", limitStart));
    }

    return {
      type: "select",
      ctes,
      distinct,
      columns,
      from,
      joins,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      offset,
      clauses,
      span: span(start, this.prevEnd()),
    };
  }

  private parseJoinKeyword(): { kind: JoinKind; keyword: string } | null {
    const t = this.peek();
    this.checkUnsupported(t);
    const start = t.start;
    let kind: JoinKind | null = null;
    if (this.eatWord("join")) kind = "inner";
    else if (this.isWord("inner") && this.isWord("join", 1)) {
      this.pos += 2;
      kind = "inner";
    } else if (this.isWord("cross") && this.isWord("join", 1)) {
      this.pos += 2;
      kind = "cross";
    } else if (this.isWord("left") || this.isWord("right") || this.isWord("full")) {
      const word = this.peek().value as "left" | "right" | "full";
      const offset = this.isWord("outer", 1) ? 2 : 1;
      if (!this.isWord("join", offset)) return null;
      this.pos += offset + 1;
      kind = word;
    }
    if (!kind) return null;
    return { kind, keyword: this.sql.slice(start, this.prevEnd()).replace(/\s+/g, " ").toUpperCase() };
  }

  private parseFromItem(): FromItem {
    const start = this.peek().start;
    if (this.isPunct("(")) {
      this.next();
      if (!this.isWord("select") && !this.isWord("with")) this.fail("Expected a SELECT inside the brackets.");
      const query = this.parseSelect();
      this.expectPunct(")", ")");
      this.eatWord("as");
      const alias = this.identifier("a name for this subquery (e.g. AS t)");
      return { kind: "subquery", query, alias: alias.value, span: span(start, this.prevEnd()) };
    }
    const t = this.peek();
    if (t.kind === "eof") this.fail("The query ends too early: which table should I read from?", t);
    if (t.kind === "word" && RESERVED.has(t.value)) {
      this.fail(`I expected a table name but found ${this.describe(t)}.`, t);
    }
    const name = this.identifier("a table name");
    let alias: string | null = null;
    if (this.eatWord("as")) alias = this.identifier("an alias").value;
    else if ((this.peek().kind === "word" && !RESERVED.has(this.peek().value)) || this.peek().kind === "qident") {
      alias = this.next().value;
    }
    return {
      kind: "table",
      name: name.kind === "qident" ? name.value : name.value.toLowerCase(),
      alias,
      span: span(start, this.prevEnd()),
    };
  }

  private parseSelectItem(): SelectItem {
    const start = this.peek().start;
    if (this.isOp("*")) {
      const t = this.next();
      return { expr: { type: "star", table: null, span: t }, alias: null, span: t };
    }
    if (
      (this.peek().kind === "word" || this.peek().kind === "qident") &&
      this.isPunct(".", 1) &&
      this.peek(2).kind === "op" &&
      this.peek(2).value === "*"
    ) {
      const table = this.next().value;
      this.next();
      this.next();
      const s = span(start, this.prevEnd());
      return { expr: { type: "star", table, span: s }, alias: null, span: s };
    }
    const expr = this.parseExpr();
    let alias: string | null = null;
    if (this.eatWord("as")) alias = this.identifier("a column alias after AS").value;
    else if ((this.peek().kind === "word" && !RESERVED.has(this.peek().value)) || this.peek().kind === "qident") {
      alias = this.next().value;
    }
    return { expr, alias, span: span(start, this.prevEnd()) };
  }

  private parseOrderList(): OrderItem[] {
    const items: OrderItem[] = [];
    do {
      const start = this.peek().start;
      const expr = this.parseExpr();
      let dir: "asc" | "desc" = "asc";
      if (this.eatWord("desc")) dir = "desc";
      else this.eatWord("asc");
      let nulls: "first" | "last" | null = null;
      if (this.eatWord("nulls")) {
        if (this.eatWord("first")) nulls = "first";
        else if (this.eatWord("last")) nulls = "last";
        else this.fail("NULLS must be followed by FIRST or LAST.");
      }
      items.push({ expr, dir, nulls, span: span(start, this.prevEnd()) });
    } while (this.eatPunct(","));
    return items;
  }

  private parseInsert(): InsertStmt {
    const start = this.next().start;
    this.expectWord("into", "after INSERT");
    const tableTok = this.identifier("a table name");
    let columns: string[] | null = null;
    if (this.eatPunct("(")) {
      columns = [];
      do columns.push(this.identifier("a column name").value);
      while (this.eatPunct(","));
      this.expectPunct(")", ")");
    }
    const clauses: Clause[] = [this.clause("insert", start)];
    const valuesTok = this.peek();
    if (this.isWord("select")) this.fail("INSERT … SELECT isn't supported here. Use VALUES (…) instead.");
    this.expectWord("values", "before the new values");
    const rows: Expr[][] = [];
    do {
      this.expectPunct("(", "( to start a row of values");
      const row: Expr[] = [];
      do row.push(this.parseExpr());
      while (this.eatPunct(","));
      this.expectPunct(")", ")");
      rows.push(row);
    } while (this.eatPunct(","));
    clauses.push(this.clause("values", valuesTok.start));
    return {
      type: "insert",
      table: tableTok.value,
      tableSpan: tableTok,
      columns,
      rows,
      clauses,
      span: span(start, this.prevEnd()),
    };
  }

  private parseUpdate(): UpdateStmt {
    const start = this.next().start;
    const tableTok = this.identifier("a table name");
    const clauses: Clause[] = [this.clause("update", start)];
    const setTok = this.peek();
    this.expectWord("set", "after the table name");
    const sets: UpdateStmt["sets"] = [];
    do {
      const colStart = this.peek().start;
      const col = this.identifier("a column name");
      if (this.isPunct(".")) {
        this.next();
        this.identifier("a column name");
        this.fail("In SET, write just the column name, without the table name in front.", col);
      }
      if (!this.isOp("=")) this.fail(`Use = to give "${col.raw}" its new value.`);
      this.next();
      const expr = this.parseExpr();
      sets.push({ column: col.value, expr, span: span(colStart, this.prevEnd()) });
    } while (this.eatPunct(","));
    clauses.push(this.clause("set", setTok.start));
    let where: Expr | null = null;
    if (this.isWord("where")) {
      const t = this.next();
      where = this.parseExpr();
      clauses.push(this.clause("where", t.start));
    }
    return {
      type: "update",
      table: tableTok.value,
      tableSpan: tableTok,
      sets,
      where,
      clauses,
      span: span(start, this.prevEnd()),
    };
  }

  private parseDelete(): DeleteStmt {
    const start = this.next().start;
    this.expectWord("from", "after DELETE");
    const tableTok = this.identifier("a table name");
    const clauses: Clause[] = [this.clause("delete", start)];
    let where: Expr | null = null;
    if (this.isWord("where")) {
      const t = this.next();
      where = this.parseExpr();
      clauses.push(this.clause("where", t.start));
    }
    return {
      type: "delete",
      table: tableTok.value,
      tableSpan: tableTok,
      where,
      clauses,
      span: span(start, this.prevEnd()),
    };
  }

  // --- expressions -----------------------------------------------------------

  parseExpr(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.isWord("or")) {
      this.next();
      const right = this.parseAnd();
      left = { type: "binary", op: "or", left, right, span: span(left.span.start, right.span.end) };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.isWord("and")) {
      this.next();
      const right = this.parseNot();
      left = { type: "binary", op: "and", left, right, span: span(left.span.start, right.span.end) };
    }
    return left;
  }

  private parseNot(): Expr {
    if (this.isWord("not") && !this.isWord("exists", 1)) {
      const t = this.next();
      const arg = this.parseNot();
      return { type: "unary", op: "not", arg, span: span(t.start, arg.span.end) };
    }
    return this.parseIs();
  }

  private parseIs(): Expr {
    let left = this.parseComparison();
    while (this.isWord("is")) {
      const isTok = this.next();
      const not = !!this.eatWord("not");
      if (this.isOp("=")) this.fail("Write IS NULL or IS NOT NULL, without =.");
      if (!this.eatWord("null")) {
        this.fail("After IS, write NULL (or NOT NULL).", this.peek().kind === "eof" ? isTok : this.peek());
      }
      left = { type: "is_null", arg: left, not, span: span(left.span.start, this.prevEnd()) };
    }
    return left;
  }

  private parseComparison(): Expr {
    let left = this.parsePredicate();
    for (;;) {
      const t = this.peek();
      if (t.kind !== "op" || !["=", "<>", "!=", "<", "<=", ">", ">="].includes(t.value)) break;
      this.next();
      const right = this.parsePredicate();
      const op = (t.value === "<>" ? "!=" : t.value) as BinaryOp;
      left = { type: "binary", op, left, right, span: span(left.span.start, right.span.end) };
    }
    return left;
  }

  private parsePredicate(): Expr {
    const left = this.parseConcat();
    const not =
      this.isWord("not") &&
      (this.isWord("in", 1) || this.isWord("between", 1) || this.isWord("like", 1) || this.isWord("ilike", 1));
    if (not) this.next();

    if (this.isWord("in")) {
      this.next();
      this.expectPunct("(", "( after IN");
      if (this.isWord("select") || this.isWord("with")) {
        const query = this.parseSelect();
        this.expectPunct(")", ")");
        return { type: "in", arg: left, list: null, query, not, span: span(left.span.start, this.prevEnd()) };
      }
      const list: Expr[] = [];
      do list.push(this.parseExpr());
      while (this.eatPunct(","));
      this.expectPunct(")", ")");
      return { type: "in", arg: left, list, query: null, not, span: span(left.span.start, this.prevEnd()) };
    }
    if (this.isWord("between")) {
      this.next();
      const low = this.parseConcat();
      this.expectWord("and", "between the two BETWEEN values");
      const high = this.parseConcat();
      return { type: "between", arg: left, low, high, not, span: span(left.span.start, high.span.end) };
    }
    if (this.isWord("like") || this.isWord("ilike")) {
      const ci = this.next().value === "ilike";
      const pattern = this.parseConcat();
      return { type: "like", arg: left, pattern, not, ci, span: span(left.span.start, pattern.span.end) };
    }
    return left;
  }

  private parseConcat(): Expr {
    let left = this.parseAdditive();
    while (this.isOp("||")) {
      this.next();
      const right = this.parseAdditive();
      left = { type: "binary", op: "||", left, right, span: span(left.span.start, right.span.end) };
    }
    return left;
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.next().value as BinaryOp;
      const right = this.parseMultiplicative();
      left = { type: "binary", op, left, right, span: span(left.span.start, right.span.end) };
    }
    return left;
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary();
    while (this.isOp("*") || this.isOp("/") || this.isOp("%")) {
      const op = this.next().value as BinaryOp;
      const right = this.parseUnary();
      left = { type: "binary", op, left, right, span: span(left.span.start, right.span.end) };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.isOp("-")) {
      const t = this.next();
      const arg = this.parseUnary();
      if (arg.type === "literal" && typeof arg.value === "number") {
        return { ...arg, value: -arg.value, span: span(t.start, arg.span.end) };
      }
      return { type: "unary", op: "-", arg, span: span(t.start, arg.span.end) };
    }
    if (this.isOp("+")) this.next();
    let expr = this.parsePrimary();
    while (this.isOp("::")) {
      this.next();
      const typeTok = this.identifier("a type name after ::");
      expr = { type: "cast", arg: expr, to: castType(typeTok, this), span: span(expr.span.start, this.prevEnd()) };
    }
    return expr;
  }

  /** Used by castType to report errors with the parser's conventions. */
  failAt(message: string, t: Token): never {
    this.fail(message, t);
  }

  private parsePrimary(): Expr {
    const t = this.peek();

    if (t.kind === "number") {
      this.next();
      const isInt = !t.raw.includes(".");
      return { type: "literal", value: Number(t.raw), kind: isInt ? "int" : "numeric", span: t };
    }
    if (t.kind === "string") {
      this.next();
      return { type: "literal", value: t.value, kind: "text", span: t };
    }
    if (t.kind === "qident") {
      this.next();
      return this.columnRest(t);
    }
    if (t.kind === "punct" && t.value === "(") {
      this.next();
      if (this.isWord("select") || this.isWord("with")) {
        const query = this.parseSelect();
        const close = this.expectPunct(")", ")");
        return { type: "subquery", query, span: span(t.start, close.end) };
      }
      const inner = this.parseExpr();
      const close = this.expectPunct(")", ")");
      return { ...inner, span: span(t.start, close.end) } as Expr;
    }
    if (t.kind === "eof") {
      const prev = this.tokens[this.pos - 1];
      this.fail(`The query ends too early${prev ? `: something is missing after ${this.describe(prev)}` : ""}.`, t);
    }
    if (t.kind === "op" && t.value === "*") {
      this.fail("* can only be used as SELECT * or COUNT(*).", t);
    }
    if (t.kind !== "word") this.fail(`I expected a value or a column name but found ${this.describe(t)}.`, t);

    switch (t.value) {
      case "null":
        this.next();
        return { type: "literal", value: null, kind: "null", span: t };
      case "true":
      case "false":
        this.next();
        return { type: "literal", value: t.value === "true", kind: "bool", span: t };
      case "date":
        if (this.peek(1).kind === "string") {
          this.next();
          const s = this.next();
          return { type: "literal", value: s.value, kind: "date", span: span(t.start, s.end) };
        }
        break;
      case "case":
        return this.parseCase();
      case "exists": {
        this.next();
        this.expectPunct("(", "( after EXISTS");
        const query = this.parseSelect();
        const close = this.expectPunct(")", ")");
        return { type: "exists", query, not: false, span: span(t.start, close.end) };
      }
      case "not":
        if (this.isWord("exists", 1)) {
          this.next();
          this.next();
          this.expectPunct("(", "( after EXISTS");
          const query = this.parseSelect();
          const close = this.expectPunct(")", ")");
          return { type: "exists", query, not: true, span: span(t.start, close.end) };
        }
        break;
    }

    if (RESERVED.has(t.value)) {
      this.checkUnsupported(t);
      const prev = this.tokens[this.pos - 1];
      if (prev && prev.kind === "punct" && prev.value === ",")
        this.fail(`There's an extra comma before ${this.describe(t)}.`, prev);
      this.fail(`I expected a value or a column name but found ${this.describe(t)}.`, t);
    }

    this.next();
    if (this.isPunct("(")) return this.parseFunction(t);
    return this.columnRest(t);
  }

  private columnRest(first: Token): Expr {
    if (this.isPunct(".")) {
      this.next();
      const col = this.peek();
      if (col.kind === "op" && col.value === "*") {
        this.fail(`${first.raw}.* can only be used in the SELECT list.`, col);
      }
      const nameTok = this.identifier("a column name after the dot");
      return {
        type: "column",
        table: first.kind === "qident" ? first.value : first.value,
        name: nameTok.value,
        span: span(first.start, nameTok.end),
      };
    }
    return { type: "column", table: null, name: first.value, span: first };
  }

  private parseFunction(nameTok: Token): Expr {
    this.next(); // (
    const name = nameTok.value;
    let star = false;
    let distinct = false;
    const args: Expr[] = [];
    if (this.isOp("*")) {
      this.next();
      star = true;
    } else if (!this.isPunct(")")) {
      if (this.eatWord("distinct")) distinct = true;
      do args.push(this.parseExpr());
      while (this.eatPunct(","));
    }
    this.expectPunct(")", ")");
    let over: WindowSpec | null = null;
    if (this.isWord("over")) {
      const overTok = this.next();
      this.expectPunct("(", "( after OVER");
      const partitionBy: Expr[] = [];
      const orderBy: OrderItem[] = [];
      if (this.eatWord("partition")) {
        this.expectWord("by", "after PARTITION");
        do partitionBy.push(this.parseExpr());
        while (this.eatPunct(","));
      }
      if (this.eatWord("order")) {
        this.expectWord("by", "after ORDER");
        orderBy.push(...this.parseOrderList());
      }
      if (this.isWord("rows") || this.isWord("range")) {
        this.fail("Custom window frames (ROWS/RANGE) aren't supported here.");
      }
      const close = this.expectPunct(")", ")");
      over = { partitionBy, orderBy, span: span(overTok.start, close.end) };
    }
    return { type: "func", name, args, distinct, star, over, span: span(nameTok.start, this.prevEnd()) };
  }

  private parseCase(): Expr {
    const start = this.next().start;
    let base: Expr | null = null;
    if (!this.isWord("when")) base = this.parseExpr();
    const whens: { when: Expr; then: Expr }[] = [];
    while (this.eatWord("when")) {
      const when = this.parseExpr();
      this.expectWord("then", "after the WHEN condition");
      const then = this.parseExpr();
      whens.push({ when, then });
    }
    if (!whens.length) this.fail("CASE needs at least one WHEN … THEN ….");
    let elseExpr: Expr | null = null;
    if (this.eatWord("else")) elseExpr = this.parseExpr();
    this.expectWord("end", "to close the CASE");
    return { type: "case", base, whens, else: elseExpr, span: span(start, this.prevEnd()) };
  }
}

function castType(t: Token, parser: Parser): "int" | "numeric" | "text" | "date" {
  switch (t.value) {
    case "int":
    case "integer":
    case "bigint":
    case "smallint":
      return "int";
    case "numeric":
    case "decimal":
    case "real":
    case "float":
      return "numeric";
    case "text":
    case "varchar":
      return "text";
    case "date":
      return "date";
    default:
      parser.failAt(`I can't convert to "${t.raw}". Try int, numeric, text or date.`, t);
  }
}

/** Parses one or more statements separated by semicolons. */
export function parseSql(sql: string): Statement[] {
  return new Parser(sql).parseScript();
}
