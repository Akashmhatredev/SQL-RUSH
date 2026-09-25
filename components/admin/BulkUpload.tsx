"use client";

import { CircleCheck, CircleX, Download, FileJson, LoaderCircle, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { importQuestionsAction } from "@/app/admin/actions";
import { useToasts } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTY_CONFIG, QUESTION_TYPE_LABELS } from "@/lib/config";
import { questionInputSchema } from "@/lib/schemas/question";
import { cn } from "@/lib/utils";
import type { Difficulty, QuestionType } from "@/types/question";

const CHUNK = 200;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const TEMPLATE = [
  {
    difficulty: "easy",
    type: "write-sql",
    topic: "WHERE",
    question: "Show all employees from the Sales department.",
    answer: "SELECT * FROM employees WHERE department = 'Sales';",
    alternatives: [],
    hint: "Filter rows with WHERE.",
    explanation: "WHERE keeps only the rows where the condition is true.",
  },
  {
    difficulty: "easy",
    type: "multiple-choice",
    topic: "SELECT",
    question: "Which query returns every column of the products table?",
    options: ["SELECT * FROM products", "SELECT % FROM products", "SELECT ALL FROM products", "GET * FROM products"],
    answer: "SELECT * FROM products",
    explanation: "The asterisk * means all columns.",
  },
  {
    difficulty: "easy",
    type: "fix-query",
    topic: "SELECT",
    question: "This query should list every employee, but it won't run. Fix it.",
    query: "SELEC * FORM employees;",
    answer: "SELECT * FROM employees;",
    explanation: "SELECT and FROM must be spelled exactly.",
  },
  {
    difficulty: "medium",
    type: "predict-output",
    topic: "COUNT",
    question: "What does this query return?",
    query: "SELECT COUNT(*) FROM t;",
    sampleTables: [{ name: "t", columns: ["id"], rows: [[1], [2], [3]] }],
    options: ["3", "1", "0", "(no rows)"],
    answer: "3",
    explanation: "COUNT(*) counts every row.",
  },
  {
    difficulty: "easy",
    type: "drag-drop",
    topic: "WHERE",
    question: "Arrange the pieces to list all Gold-tier customers.",
    tokens: ["SELECT *", "FROM customers", "WHERE tier = 'Gold'"],
    distractors: ["HAVING tier = 'Gold'"],
    explanation: "A query reads SELECT → FROM → WHERE.",
  },
];

interface Row {
  index: number;
  raw: Record<string, unknown>;
  errors: string[];
}

function parseRows(text: string, ignoreIds: boolean): { rows: Row[]; error?: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { rows: [], error: `That isn't valid JSON: ${(e as Error).message}` };
  }
  const list = Array.isArray(data) ? data : (data as { questions?: unknown })?.questions;
  if (!Array.isArray(list))
    return { rows: [], error: 'Expected a JSON array of questions (or { "questions": [...] }).' };
  if (list.length > 1000) return { rows: [], error: "At most 1,000 questions per upload." };
  return {
    rows: list.map((item, index) => {
      const raw = (typeof item === "object" && item ? { ...(item as Record<string, unknown>) } : {}) as Record<
        string,
        unknown
      >;
      if (ignoreIds) delete raw.id;
      const parsed = questionInputSchema.safeParse(raw);
      return {
        index,
        raw,
        errors: parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join(".") || "question"}: ${i.message}`),
      };
    }),
  };
}

export function BulkUpload() {
  const { push } = useToasts();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [ignoreIds, setIgnoreIds] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = useMemo(
    () => (text.trim() ? parseRows(text, ignoreIds) : { rows: [] as Row[], error: undefined }),
    [text, ignoreIds],
  );
  const invalid = parsed.rows.filter((r) => r.errors.length);
  const canImport = parsed.rows.length > 0 && invalid.length === 0 && !parsed.error && !pending;

  const readFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      push({ kind: "error", title: "File too large", description: "Upload at most 5 MB at a time." });
      return;
    }
    setFileName(file.name);
    setResult(null);
    setText(await file.text());
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "sql-rush-questions-template.json" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = () =>
    startTransition(async () => {
      const all = parsed.rows.map((r) => r.raw);
      let inserted = 0;
      let skipped = 0;
      setProgress(0);
      setResult(null);
      for (let i = 0; i < all.length; i += CHUNK) {
        const res = await importQuestionsAction(all.slice(i, i + CHUNK));
        if (!res.ok) {
          setProgress(null);
          const detail = res.rowErrors
            ? Object.entries(res.rowErrors)
                .slice(0, 3)
                .map(([k, v]) => `#${Number(k) + i + 1}: ${v[0]}`)
                .join(" · ")
            : undefined;
          setResult(`${res.message}${inserted ? ` (${inserted} were imported before this batch.)` : ""}`);
          push({ kind: "error", title: res.message ?? "Import failed", description: detail });
          return;
        }
        inserted += res.inserted ?? 0;
        skipped += res.skipped ?? 0;
        setProgress(Math.min(1, (i + CHUNK) / all.length));
      }
      const summary = `Imported ${inserted} question${inserted === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} with an existing id` : ""}.`;
      setResult(summary);
      push({ kind: "success", title: "Import complete", description: summary });
      setProgress(null);
    });

  return (
    <div className="grid gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void readFile(file);
        }}
        className={cn(
          "glass grid place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-sky-400/70 bg-sky-400/5" : "border-white/10",
        )}
      >
        <FileJson className="size-10 text-sky-300" aria-hidden />
        <p className="mt-3 font-semibold text-white">{fileName ?? "Drop a .json file here"}</p>
        <p className="mt-1 text-sm text-slate-400">Same format as data/questions/*.json. Up to 1,000 questions.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden /> Choose file
          </Button>
          <Button size="sm" onClick={downloadTemplate}>
            <Download aria-hidden /> Download template
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <details className="glass rounded-2xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-200">…or paste JSON</summary>
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFileName(null);
            setResult(null);
          }}
          rows={10}
          className="mt-3 font-mono text-xs"
          placeholder='[{ "difficulty": "easy", "type": "write-sql", ... }]'
          spellCheck={false}
          aria-label="Questions JSON"
        />
      </details>

      <div className="flex items-center gap-3">
        <Switch id="ignoreIds" checked={ignoreIds} onCheckedChange={setIgnoreIds} />
        <Label htmlFor="ignoreIds" className="text-sm text-slate-300">
          Ignore ids in the file and always create new questions
        </Label>
      </div>
      <p className="-mt-2 text-xs text-slate-500">
        Otherwise, questions whose id already exists are skipped, so re-uploading a file never overwrites edits.
      </p>

      {parsed.error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100" role="alert">
          {parsed.error}
        </p>
      )}

      {parsed.rows.length > 0 && (
        <section className="glass rounded-2xl" aria-label="Preview">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">{parsed.rows.length}</span> questions ·{" "}
              <span className="text-emerald-300">{parsed.rows.length - invalid.length} valid</span>
              {invalid.length > 0 && <span className="text-rose-300"> · {invalid.length} with problems</span>}
            </p>
            <Button variant="primary" onClick={runImport} disabled={!canImport}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
              Import {parsed.rows.length} question{parsed.rows.length === 1 ? "" : "s"}
            </Button>
          </div>
          {progress !== null && <ProgressBar value={progress} className="rounded-none" label="Import progress" />}
          <ul className="max-h-[28rem] divide-y divide-white/5 overflow-y-auto">
            {parsed.rows.map((r) => {
              const d = r.raw.difficulty as Difficulty;
              const t = r.raw.type as QuestionType;
              return (
                <li key={r.index} className="flex gap-3 px-4 py-2.5">
                  {r.errors.length ? (
                    <CircleX className="mt-0.5 size-4 shrink-0 text-rose-400" aria-label="Invalid" />
                  ) : (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-label="Valid" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-100">
                      <span className="mr-2 font-mono text-xs text-slate-500">
                        #{r.index + 1}
                        {r.raw.id ? ` · id ${String(r.raw.id)}` : ""}
                      </span>
                      {String(r.raw.question ?? "(no question text)")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {DIFFICULTY_CONFIG[d]?.label ?? String(r.raw.difficulty ?? "?")} ·{" "}
                      {QUESTION_TYPE_LABELS[t]?.label ?? String(r.raw.type ?? "?")}
                    </p>
                    {r.errors.map((e) => (
                      <p key={e} className="text-xs text-rose-300">
                        {e}
                      </p>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {result && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200" role="status">
          {result}{" "}
          <Link href="/admin/questions" className="font-medium text-sky-300 hover:text-sky-200">
            View questions →
          </Link>
        </p>
      )}
    </div>
  );
}
