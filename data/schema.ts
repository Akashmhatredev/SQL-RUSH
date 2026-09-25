import type { Difficulty } from "@/types/question";

export interface SchemaColumn {
  name: string;
  /** PostgreSQL type, also used by the question validator. */
  type: string;
  note?: string;
}

export interface SchemaTable {
  name: string;
  description: string;
  /** The lowest difficulty whose questions use this table. */
  level: Difficulty;
  columns: SchemaColumn[];
}

/**
 * The shared practice database every question is written against.
 * Dialect: PostgreSQL-flavoured standard SQL.
 */
export const SCHEMA: SchemaTable[] = [
  {
    name: "employees",
    description: "Company staff",
    level: "easy",
    columns: [
      { name: "id", type: "integer", note: "PK" },
      { name: "name", type: "text" },
      { name: "email", type: "text" },
      { name: "department", type: "text", note: "'Sales', 'Engineering', 'Marketing', 'HR', 'Finance'" },
      { name: "job_title", type: "text" },
      { name: "salary", type: "numeric" },
      { name: "hire_date", type: "date" },
      { name: "manager_id", type: "integer", note: "FK → employees.id, NULL for the CEO" },
      { name: "city", type: "text" },
      { name: "age", type: "integer" },
    ],
  },
  {
    name: "departments",
    description: "Departments, joined on departments.name = employees.department",
    level: "medium",
    columns: [
      { name: "id", type: "integer", note: "PK" },
      { name: "name", type: "text" },
      { name: "location", type: "text" },
      { name: "budget", type: "numeric" },
    ],
  },
  {
    name: "customers",
    description: "People who place orders",
    level: "easy",
    columns: [
      { name: "id", type: "integer", note: "PK" },
      { name: "name", type: "text" },
      { name: "email", type: "text" },
      { name: "city", type: "text" },
      { name: "country", type: "text" },
      { name: "signup_date", type: "date" },
      { name: "tier", type: "text", note: "'Bronze', 'Silver', 'Gold'" },
    ],
  },
  {
    name: "orders",
    description: "One row per order",
    level: "easy",
    columns: [
      { name: "id", type: "integer", note: "PK" },
      { name: "customer_id", type: "integer", note: "FK → customers.id" },
      { name: "order_date", type: "date" },
      { name: "status", type: "text", note: "'pending', 'shipped', 'delivered', 'cancelled'" },
      { name: "total_amount", type: "numeric" },
    ],
  },
  {
    name: "products",
    description: "Items for sale",
    level: "easy",
    columns: [
      { name: "id", type: "integer", note: "PK" },
      { name: "name", type: "text" },
      { name: "category", type: "text", note: "'Electronics', 'Books', 'Clothing', 'Home', 'Toys'" },
      { name: "price", type: "numeric" },
      { name: "stock", type: "integer" },
      { name: "supplier_id", type: "integer", note: "FK → suppliers.id" },
    ],
  },
  {
    name: "order_items",
    description: "Line items of each order",
    level: "medium",
    columns: [
      { name: "id", type: "integer", note: "PK" },
      { name: "order_id", type: "integer", note: "FK → orders.id" },
      { name: "product_id", type: "integer", note: "FK → products.id" },
      { name: "quantity", type: "integer" },
      { name: "unit_price", type: "numeric" },
    ],
  },
  {
    name: "suppliers",
    description: "Product suppliers",
    level: "medium",
    columns: [
      { name: "id", type: "integer", note: "PK" },
      { name: "name", type: "text" },
      { name: "country", type: "text" },
    ],
  },
  {
    name: "user_events",
    description: "Product analytics events",
    level: "hard",
    columns: [
      { name: "id", type: "integer", note: "PK" },
      { name: "user_id", type: "integer" },
      { name: "event_type", type: "text", note: "'login', 'view', 'add_to_cart', 'purchase'" },
      { name: "event_time", type: "timestamp" },
    ],
  },
  {
    name: "fact_sales",
    description: "Star-schema fact table, one row per sale line",
    level: "expert",
    columns: [
      { name: "sale_id", type: "integer", note: "PK" },
      { name: "date_key", type: "integer", note: "FK → dim_date" },
      { name: "product_key", type: "integer", note: "FK → dim_product" },
      { name: "store_key", type: "integer", note: "FK → dim_store" },
      { name: "customer_key", type: "integer", note: "FK → dim_customer" },
      { name: "quantity", type: "integer" },
      { name: "revenue", type: "numeric" },
      { name: "cost", type: "numeric" },
    ],
  },
  {
    name: "dim_date",
    description: "Calendar dimension",
    level: "expert",
    columns: [
      { name: "date_key", type: "integer", note: "PK, e.g. 20240131" },
      { name: "full_date", type: "date" },
      { name: "year", type: "integer" },
      { name: "quarter", type: "integer" },
      { name: "month", type: "integer" },
      { name: "month_name", type: "text" },
      { name: "day_of_week", type: "text" },
      { name: "is_weekend", type: "boolean" },
    ],
  },
  {
    name: "dim_product",
    description: "Product dimension",
    level: "expert",
    columns: [
      { name: "product_key", type: "integer", note: "PK" },
      { name: "product_name", type: "text" },
      { name: "category", type: "text" },
      { name: "brand", type: "text" },
    ],
  },
  {
    name: "dim_store",
    description: "Store dimension",
    level: "expert",
    columns: [
      { name: "store_key", type: "integer", note: "PK" },
      { name: "store_name", type: "text" },
      { name: "city", type: "text" },
      { name: "region", type: "text" },
    ],
  },
  {
    name: "dim_customer",
    description: "Customer dimension",
    level: "expert",
    columns: [
      { name: "customer_key", type: "integer", note: "PK" },
      { name: "customer_name", type: "text" },
      { name: "segment", type: "text", note: "'Consumer', 'Corporate', 'Small Business'" },
      { name: "country", type: "text" },
    ],
  },
];

const TABLE_PATTERNS = SCHEMA.map((table) => ({
  table,
  pattern: new RegExp(`\\b${table.name}\\b`, "i"),
}));

/** Schema tables mentioned in any of the given SQL snippets, in schema order. */
export function tablesReferenced(...sql: (string | undefined)[]): SchemaTable[] {
  const text = sql.filter(Boolean).join("\n");
  return TABLE_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ table }) => table);
}

/** Names of the tables a question uses, stored as questions.schema_tables for the in-game schema panel. */
export function schemaTablesFor(q: {
  answer: string;
  query?: string | null;
  tokens?: string[] | null;
  question: string;
}): string[] {
  return tablesReferenced(q.answer, q.query ?? undefined, ...(q.tokens ?? []), q.question).map((t) => t.name);
}

export const SCHEMA_BY_NAME: Record<string, SchemaTable> = Object.fromEntries(SCHEMA.map((t) => [t.name, t]));
