"use client";

import { CircleCheck, CircleX, Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
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
import {
  columnFor,
  EXAMPLE_QUESTIONS,
  fieldLabel,
  QUESTIONS_SHEET,
  SHEET_FIELDS,
  sheetToQuestions,
  TEMPLATE_PATH,
} from "@/lib/question-sheet";
import { questionInputSchema } from "@/lib/schemas/question";
import { cn } from "@/lib/utils";
import type { Difficulty, QuestionType } from "@/types/question";

const CHUNK = 200;
const MAX_QUESTIONS = 1000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** A question read from a file, before validation. */
interface Item {
  label: string;
  raw: Record<string, unknown>;
  /** Problems found while reading, by question field. */
  errors?: Record<string, string>;
}

interface Source {
  kind: "json" | "sheet";
  items: Item[];
  error?: string;
  notice?: string;
}

interface Row {
  index: number;
  label: string;
  raw: Record<string, unknown>;
  errors: string[];
}

function parseJson(text: string): Source {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { kind: "json", items: [], error: `That isn't valid JSON: ${(e as Error).message}` };
  }
  const list = Array.isArray(data) ? data : (data as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) {
    return { kind: "json", items: [], error: 'Expected a JSON array of questions (or { "questions": [...] }).' };
  }
  return {
    kind: "json",
    items: list.map((item, i) => ({
      label: `#${i + 1}`,
      raw: typeof item === "object" && item ? { ...(item as Record<string, unknown>) } : {},
    })),
  };
}

async function parseWorkbook(file: File): Promise<Source> {
  // Loaded on demand: only admins uploading a spreadsheet need it.
  const { default: readExcelFile } = await import("read-excel-file/browser");
  let sheets;
  try {
    sheets = await readExcelFile(file);
  } catch (e) {
    const code = (e as { code?: string }).code;
    return {
      kind: "sheet",
      items: [],
      error:
        code === "XLS_FILE_NOT_SUPPORTED"
          ? "That's an old .xls file. Open it in Excel, save it as .xlsx (Excel Workbook) and upload that."
          : `Couldn't read that spreadsheet: ${(e as Error).message}`,
    };
  }
  const sheet = sheets.find((s) => s.sheet.trim().toLowerCase() === QUESTIONS_SHEET.toLowerCase()) ?? sheets[0];
  const parsed = sheetToQuestions(sheet.data as unknown[][]);
  const notes = [`Read from the “${sheet.sheet}” sheet.`];
  if (parsed.ignoredColumns.length) notes.push(`Ignored columns: ${parsed.ignoredColumns.join(", ")}.`);
  return {
    kind: "sheet",
    items: parsed.questions.map((q) => ({ label: `Row ${q.row}`, raw: q.raw, errors: q.errors })),
    error: parsed.error ?? (parsed.questions.length ? undefined : "The sheet has no question rows below the header."),
    notice: notes.join(" "),
  };
}

function validate(source: Source, ignoreIds: boolean): Row[] {
  const where = (path: PropertyKey[]) =>
    source.kind === "sheet" ? columnFor(String(path[0] ?? "question")) : path.join(".") || "question";
  return source.items.map((item, index) => {
    const raw = { ...item.raw };
    const readErrors = { ...item.errors };
    if (ignoreIds) {
      delete raw.id;
      delete readErrors.id;
    }
    const parsed = questionInputSchema.safeParse(raw);
    const issues = parsed.success
      ? []
      : parsed.error.issues
          // A cell that couldn't be read already explains itself.
          .filter((i) => !(String(i.path[0]) in readErrors))
          .map((i) => `${where(i.path)}: ${i.message}`);
    return {
      index,
      label: item.label,
      raw,
      errors: [...Object.entries(readErrors).map(([field, msg]) => `${columnFor(field)}: ${msg}`), ...issues],
    };
  });
}

function downloadJsonTemplate() {
  const blob = new Blob([JSON.stringify(EXAMPLE_QUESTIONS, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "sql-rush-questions-template.json" });
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkUpload() {
  const { push } = useToasts();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState<Source | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [ignoreIds, setIgnoreIds] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const source = useMemo<Source | null>(() => sheet ?? (text.trim() ? parseJson(text) : null), [sheet, text]);
  const tooMany = (source?.items.length ?? 0) > MAX_QUESTIONS;
  const error =
    source?.error ?? (tooMany ? `At most ${MAX_QUESTIONS.toLocaleString()} questions per upload.` : undefined);
  const rows = useMemo(() => (source && !error ? validate(source, ignoreIds) : []), [source, error, ignoreIds]);
  const invalid = rows.filter((r) => r.errors.length);
  const canImport = rows.length > 0 && invalid.length === 0 && !pending;

  const readFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      push({ kind: "error", title: "File too large", description: "Upload at most 5 MB at a time." });
      return;
    }
    const name = file.name.toLowerCase();
    const isSheet = /\.xlsx?$/.test(name) || file.type.includes("spreadsheetml");
    const isJson = name.endsWith(".json") || file.type === "application/json";
    if (!isSheet && !isJson) {
      push({
        kind: "error",
        title: "Unsupported file",
        description: "Upload an Excel workbook (.xlsx) or a .json file. Save CSV files as .xlsx first.",
      });
      return;
    }
    setFileName(file.name);
    setResult(null);
    if (isJson) {
      setSheet(null);
      setText(await file.text());
      return;
    }
    setReading(true);
    try {
      setSheet(await parseWorkbook(file));
    } catch (e) {
      setSheet({ kind: "sheet", items: [], error: `Couldn't read that spreadsheet: ${(e as Error).message}` });
    } finally {
      setText("");
      setReading(false);
    }
  };

  const runImport = () =>
    startTransition(async () => {
      const all = rows.map((r) => r.raw);
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
                .map(([k, v]) => `${rows[Number(k) + i]?.label ?? `#${Number(k) + i + 1}`}: ${v[0]}`)
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
        {reading ? (
          <LoaderCircle className="size-10 animate-spin text-sky-300" aria-label="Reading the file" />
        ) : (
          <FileSpreadsheet className="size-10 text-sky-300" aria-hidden />
        )}
        <p className="mt-3 font-semibold text-white">{fileName ?? "Drop an Excel (.xlsx) or JSON file here"}</p>
        <p className="mt-1 text-sm text-slate-400">
          One question per row, in the template&apos;s columns. Up to {MAX_QUESTIONS.toLocaleString()} questions.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()} disabled={reading}>
            <Upload aria-hidden /> Choose file
          </Button>
          <Button size="sm" asChild>
            <a href={TEMPLATE_PATH} download>
              <Download aria-hidden /> Excel template
            </a>
          </Button>
          <Button size="sm" variant="ghost" onClick={downloadJsonTemplate}>
            <Download aria-hidden /> JSON template
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json,application/json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <details className="glass rounded-2xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-200">Excel column guide</summary>
        <p className="mt-3 text-sm text-slate-400">
          The first row holds the column names; their order doesn&apos;t matter and unknown columns are ignored. To put
          several lines in one cell, press Alt+Enter (Control+Option+Return in Excel for Mac). The template has an
          example of every question type.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Column</th>
                <th className="py-2 pr-4 font-medium">Used by</th>
                <th className="py-2 font-medium">What to enter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 align-top">
              {SHEET_FIELDS.map((f) => (
                <tr key={f.name}>
                  <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-sky-200">{fieldLabel(f)}</td>
                  <td className="py-2 pr-4 text-xs text-slate-400">{f.usedBy}</td>
                  <td className="py-2 text-xs text-slate-300">{f.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="glass rounded-2xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-200">…or paste JSON</summary>
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSheet(null);
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

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100" role="alert">
          {error}
        </p>
      )}
      {source?.notice && !error && <p className="text-xs text-slate-400">{source.notice}</p>}

      {rows.length > 0 && (
        <section className="glass rounded-2xl" aria-label="Preview">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">{rows.length}</span> questions ·{" "}
              <span className="text-emerald-300">{rows.length - invalid.length} valid</span>
              {invalid.length > 0 && <span className="text-rose-300"> · {invalid.length} with problems</span>}
            </p>
            <Button variant="primary" onClick={runImport} disabled={!canImport}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
              Import {rows.length} question{rows.length === 1 ? "" : "s"}
            </Button>
          </div>
          {progress !== null && <ProgressBar value={progress} className="rounded-none" label="Import progress" />}
          <ul className="max-h-[28rem] divide-y divide-white/5 overflow-y-auto">
            {rows.map((r) => {
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
                        {r.label}
                        {r.raw.id ? ` · id ${String(r.raw.id)}` : ""}
                      </span>
                      {String(r.raw.question || "(no question text)")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {DIFFICULTY_CONFIG[d]?.label ?? String(r.raw.difficulty || "?")} ·{" "}
                      {QUESTION_TYPE_LABELS[t]?.label ?? String(r.raw.type || "?")}
                      {r.raw.isActive === false && " · hidden"}
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
