"use client";

import { ArrowDown, ArrowUp, CircleCheck, Circle, LoaderCircle, Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveQuestionAction } from "@/app/admin/actions";
import { DataTable } from "@/components/game/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTY_CONFIG, QUESTION_TYPE_LABELS } from "@/lib/config";
import type { FormState } from "@/lib/schemas/errors";
import { fieldErrors } from "@/lib/schemas/errors";
import { questionInputSchema } from "@/lib/schemas/question";
import { cn } from "@/lib/utils";
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  type Difficulty,
  type Question,
  type QuestionType,
  type SampleTable,
} from "@/types/question";

type Initial = Partial<Question> & { isActive?: boolean };

const TYPE_HELP: Record<QuestionType, string> = {
  "write-sql":
    "Players type the query. Answers are compared after normalising case, spacing, quotes and optional keywords.",
  "multiple-choice": "Four options is the norm (2–6 allowed). Mark the correct one.",
  "fix-query": "Players get the broken query pre-filled and must repair it.",
  "predict-output":
    'Players read a query and sample tables, then pick the result. One row per line, columns separated by " | ", empty result as "(no rows)".',
  "drag-drop": "Players arrange the pieces in order. Decoy pieces are mixed in.",
};

const SAMPLE_TABLES_EXAMPLE = `[
  {
    "name": "employees",
    "columns": ["id", "name", "salary"],
    "rows": [[1, "Ada", 5000], [2, "Linus", 4200]]
  }
]`;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="text-xs text-rose-300">
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-slate-200">
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      <FieldError id={id} message={error} />
    </div>
  );
}

/** An ordered list of strings with add / remove / reorder. */
function ListField({
  id,
  items,
  onChange,
  placeholder,
  multiline = false,
  mono = false,
  ordered = false,
  max = 20,
  addLabel = "Add",
  marker,
}: {
  id: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
  mono?: boolean;
  ordered?: boolean;
  max?: number;
  addLabel?: string;
  /** Optional control rendered before each item (e.g. "correct answer" radio). */
  marker?: (index: number) => React.ReactNode;
}) {
  const set = (i: number, value: string) => onChange(items.map((v, j) => (j === i ? value : v)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  return (
    <div className="grid gap-2" id={id}>
      {items.map((value, i) => (
        <div key={i} className="flex items-start gap-2">
          {marker?.(i)}
          {ordered && <span className="mt-2.5 w-5 shrink-0 text-right font-mono text-xs text-slate-500">{i + 1}</span>}
          {multiline ? (
            <Textarea
              value={value}
              onChange={(e) => set(i, e.target.value)}
              placeholder={placeholder}
              rows={Math.min(6, Math.max(2, value.split("\n").length))}
              className={cn("min-h-0 flex-1", mono && "font-mono text-[13px]")}
              aria-label={`${placeholder ?? "Item"} ${i + 1}`}
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => set(i, e.target.value)}
              placeholder={placeholder}
              className={cn("flex-1", mono && "font-mono text-[13px]")}
              aria-label={`${placeholder ?? "Item"} ${i + 1}`}
            />
          )}
          <div className="flex shrink-0 gap-0.5">
            {ordered && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Remove"
              className="text-slate-500 hover:text-rose-300"
            >
              <X />
            </Button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => onChange([...items, ""])}>
          <Plus aria-hidden /> {addLabel}
        </Button>
      )}
    </div>
  );
}

const INITIAL_STATE: FormState = { ok: false };

export function QuestionForm({ initial }: { initial?: Initial }) {
  const editing = !!initial?.id;
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "easy");
  const [type, setType] = useState<QuestionType>(initial?.type ?? "write-sql");
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [hint, setHint] = useState(initial?.hint ?? "");
  const [query, setQuery] = useState(initial?.query ?? "");
  const [alternatives, setAlternatives] = useState<string[]>(initial?.alternatives ?? []);
  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", "", "", ""]);
  const [correct, setCorrect] = useState(() => Math.max(0, (initial?.options ?? []).indexOf(initial?.answer ?? "")));
  const [tokens, setTokens] = useState<string[]>(initial?.tokens ?? ["", ""]);
  const [distractors, setDistractors] = useState<string[]>(initial?.distractors ?? []);
  const [tablesText, setTablesText] = useState(
    initial?.sampleTables ? JSON.stringify(initial.sampleTables, null, 2) : SAMPLE_TABLES_EXAMPLE,
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(saveQuestionAction, INITIAL_STATE);

  const choice = type === "multiple-choice" || type === "predict-output";
  const sql = type === "write-sql" || type === "fix-query";

  const tables = useMemo<{ value: SampleTable[] | null; error?: string }>(() => {
    if (type !== "predict-output") return { value: null };
    try {
      const parsed = JSON.parse(tablesText);
      return Array.isArray(parsed) ? { value: parsed } : { value: null, error: "Sample tables must be a JSON array." };
    } catch (e) {
      return { value: null, error: `Invalid JSON: ${(e as Error).message}` };
    }
  }, [tablesText, type]);

  const payload = {
    ...(initial?.id ? { id: initial.id } : {}),
    difficulty,
    type,
    topic,
    question,
    answer: choice ? (options[correct] ?? "") : type === "drag-drop" ? tokens.map((t) => t.trim()).join(" ") : answer,
    explanation,
    hint: hint || null,
    alternatives: sql ? alternatives : [],
    options: choice ? options : [],
    query: sql || choice ? query || null : null,
    sampleTables: type === "predict-output" ? tables.value : null,
    tokens: type === "drag-drop" ? tokens : [],
    distractors: type === "drag-drop" ? distractors : [],
    isActive,
  };

  const errors = { ...state.errors, ...clientErrors };
  if (tables.error) errors.sampleTables = tables.error;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const parsed = questionInputSchema.safeParse(payload);
    if (!parsed.success || tables.error) {
      e.preventDefault();
      setClientErrors(parsed.success ? {} : fieldErrors(parsed.error));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setClientErrors({});
  };

  const errorProps = (key: string) => ({
    "aria-invalid": !!errors[key] || undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-6" noValidate>
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {(state.message || Object.keys(clientErrors).length > 0) && !state.ok && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100" role="alert">
          {state.message ?? "Fix the highlighted fields."}
        </p>
      )}

      <section className="glass grid gap-4 rounded-2xl p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="difficulty" label="Difficulty" error={errors.difficulty}>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger id="difficulty" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DIFFICULTY_CONFIG[d].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="type" label="Question type" error={errors.type}>
            <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="topic" label="Topic" error={errors.topic}>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. GROUP BY"
              maxLength={60}
              {...errorProps("topic")}
            />
          </Field>
        </div>
        <p className="text-xs text-slate-500">{TYPE_HELP[type]}</p>
        <Field id="question" label="Question" error={errors.question}>
          <Textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="Show the name and salary of every employee in Engineering."
            {...errorProps("question")}
          />
        </Field>
      </section>

      <section className="glass grid gap-4 rounded-2xl p-4 sm:p-5" aria-label="Answer">
        {(type === "fix-query" || type === "predict-output" || type === "multiple-choice") && (
          <Field
            id="query"
            label={
              type === "fix-query"
                ? "Broken query"
                : type === "predict-output"
                  ? "Query to evaluate"
                  : "Query shown with the question (optional)"
            }
            error={errors.query}
          >
            <Textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              className="font-mono text-[13px]"
              spellCheck={false}
              {...errorProps("query")}
            />
          </Field>
        )}

        {sql && (
          <>
            <Field
              id="answer"
              label={type === "fix-query" ? "Fixed query (answer)" : "Answer SQL"}
              error={errors.answer}
            >
              <Textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                className="font-mono text-[13px]"
                spellCheck={false}
                placeholder="SELECT name, salary FROM employees WHERE department = 'Engineering';"
                {...errorProps("answer")}
              />
            </Field>
            <Field
              id="alternatives"
              label="Also accept"
              hint="Other correct queries, e.g. with the columns joined differently."
              error={errors.alternatives}
            >
              <ListField
                id="alternatives"
                items={alternatives}
                onChange={setAlternatives}
                placeholder="Alternative SQL"
                multiline
                mono
                addLabel="Add alternative"
              />
            </Field>
          </>
        )}

        {type === "predict-output" && (
          <Field id="sampleTables" label="Sample tables (JSON)" error={errors.sampleTables}>
            <Textarea
              id="sampleTables"
              value={tablesText}
              onChange={(e) => setTablesText(e.target.value)}
              rows={8}
              className="font-mono text-[12px]"
              spellCheck={false}
              {...errorProps("sampleTables")}
            />
            {tables.value && tables.value.length > 0 && !tables.error && (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {tables.value.map((t, i) =>
                  t && Array.isArray(t.columns) && Array.isArray(t.rows) ? <DataTable key={i} table={t} /> : null,
                )}
              </div>
            )}
          </Field>
        )}

        {choice && (
          <Field
            id="options"
            label="Options"
            hint="Click the circle to mark the correct option."
            error={errors.options ?? errors.answer}
          >
            <ListField
              id="options"
              items={options}
              onChange={(next) => {
                setOptions(next);
                if (correct >= next.length) setCorrect(Math.max(0, next.length - 1));
              }}
              placeholder={type === "predict-output" ? "Result rows" : "Option"}
              multiline={type === "predict-output"}
              mono={type === "predict-output"}
              max={6}
              addLabel="Add option"
              marker={(i) => (
                <button
                  type="button"
                  onClick={() => setCorrect(i)}
                  className={cn(
                    "mt-2 shrink-0",
                    i === correct ? "text-emerald-400" : "text-slate-600 hover:text-slate-300",
                  )}
                  aria-label={`Mark option ${i + 1} as correct`}
                  aria-pressed={i === correct}
                >
                  {i === correct ? <CircleCheck className="size-5" /> : <Circle className="size-5" />}
                </button>
              )}
            />
          </Field>
        )}

        {type === "drag-drop" && (
          <>
            <Field id="tokens" label="Pieces, in the correct order" error={errors.tokens ?? errors.answer}>
              <ListField
                id="tokens"
                items={tokens}
                onChange={setTokens}
                placeholder="Piece"
                mono
                ordered
                addLabel="Add piece"
              />
            </Field>
            <Field
              id="distractors"
              label="Decoy pieces"
              hint="Pieces that don't belong in the answer (optional)."
              error={errors.distractors}
            >
              <ListField
                id="distractors"
                items={distractors}
                onChange={setDistractors}
                placeholder="Decoy"
                mono
                addLabel="Add decoy"
              />
            </Field>
            <p className="rounded-xl border border-white/10 bg-ink-950/60 p-3 font-mono text-xs text-slate-300">
              <span className="text-slate-500">Answer: </span>
              {payload.answer || "—"}
            </p>
          </>
        )}
      </section>

      <section className="glass grid gap-4 rounded-2xl p-4 sm:p-5">
        <Field
          id="explanation"
          label="Explanation"
          hint="Shown after every answer. Explain why, not just what."
          error={errors.explanation}
        >
          <Textarea
            id="explanation"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            {...errorProps("explanation")}
          />
        </Field>
        <Field id="hint" label="Hint (practice mode)" error={errors.hint}>
          <Input id="hint" value={hint} onChange={(e) => setHint(e.target.value)} maxLength={500} />
        </Field>
        <div className="flex items-center gap-3">
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="isActive" className="text-slate-200">
            Active: served to players
          </Label>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          <Link href="/admin/questions">Cancel</Link>
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {editing ? "Save changes" : "Create question"}
        </Button>
      </div>
    </form>
  );
}
