"use client";

import { Lightbulb } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { DIFFICULTY_CONFIG, QUESTION_TYPE_LABELS } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { AnswerRecord, PreparedQuestion } from "@/types/game";
import { ChoiceList } from "./ChoiceList";
import { DataTable } from "./DataTable";
import { SqlCode } from "./SqlCode";
import { SqlEditor, type SqlEditorHandle } from "./SqlEditor";

export interface Draft {
  text: string;
  choice: string | null;
  order: string[];
}

export function emptyDraft(q: PreparedQuestion): Draft {
  return { text: q.type === "fix-query" ? (q.query ?? "") : "", choice: null, order: [] };
}

// The builder is the heaviest question UI; only load it when a drag-drop question appears.
const DragDropBuilder = dynamic(() => import("./DragDropBuilder").then((m) => m.DragDropBuilder), {
  loading: () => <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />,
});

const PROMPTS: Record<PreparedQuestion["type"], string> = {
  "write-sql": "Write the query",
  "multiple-choice": "Pick the right answer",
  "fix-query": "Fix the broken query",
  "predict-output": "What does this query return?",
  "drag-drop": "Build the query in the right order",
};

export function QuestionMeta({ question }: { question: PreparedQuestion }) {
  const d = DIFFICULTY_CONFIG[question.difficulty];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", d.border, d.bg, d.text)}>
        {d.label}
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300">
        {QUESTION_TYPE_LABELS[question.type].label}
      </span>
      <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-400">
        {question.topic}
      </span>
    </div>
  );
}

export function QuestionView({
  question,
  draft,
  onDraft,
  onSubmit,
  result,
  busy = false,
  showHint,
}: {
  question: PreparedQuestion;
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onSubmit: (draftOverride?: Draft) => void;
  /** Set once the question has been answered. */
  result: AnswerRecord | null;
  /** The answer is being checked by the server. */
  busy?: boolean;
  showHint: boolean;
}) {
  const editorRef = useRef<SqlEditorHandle>(null);
  const locked = result !== null || busy;
  const editorState = !result ? "idle" : result.correct ? "correct" : "wrong";

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {PROMPTS[question.type]}
        </p>
        <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">{question.question}</h2>
        {showHint && question.hint && !locked && (
          <p className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm text-amber-100">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
            {question.hint}
          </p>
        )}
      </div>

      {question.type === "predict-output" && (
        <div className="space-y-3">
          {question.query && <SqlCode code={question.query} />}
          <div className="grid gap-3 sm:grid-cols-2">
            {question.sampleTables?.map((t) => (
              <DataTable key={t.name} table={t} />
            ))}
          </div>
        </div>
      )}

      {question.type === "multiple-choice" && question.query && <SqlCode code={question.query} />}

      {question.type === "fix-query" && question.query && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-rose-300/80">Broken query</p>
          <SqlCode code={question.query} className="border-rose-400/20 bg-rose-500/[0.04]" />
        </div>
      )}

      {(question.type === "write-sql" || question.type === "fix-query") && (
        <div>
          <SqlEditor
            ref={editorRef}
            value={draft.text}
            onChange={(text) => onDraft({ ...draft, text })}
            onSubmit={() => onSubmit()}
            disabled={locked}
            autoFocus
            label={question.type === "fix-query" ? "Edit the query to fix it" : "Your SQL query"}
            placeholder={question.type === "write-sql" ? "SELECT ..." : undefined}
            state={editorState}
          />
          <p className="mt-1.5 hidden text-right text-[11px] text-slate-500 sm:block">
            Case, spacing, line breaks and semicolons don&apos;t matter · Ctrl/⌘ + Enter to submit
          </p>
        </div>
      )}

      {(question.type === "multiple-choice" || question.type === "predict-output") && (
        <ChoiceList
          options={question.options}
          selected={result ? (result.answer.kind === "choice" ? result.answer.value : null) : draft.choice}
          correctAnswer={result ? result.solution.answer : null}
          locked={locked}
          variant={question.type === "predict-output" ? "output" : "text"}
          onPick={(choice) => {
            const next = { ...draft, choice };
            onDraft(next);
            onSubmit(next);
          }}
        />
      )}

      {question.type === "drag-drop" && (
        <DragDropBuilder
          pool={question.tokenPool}
          placed={draft.order}
          onChange={(order) => onDraft({ ...draft, order })}
          locked={locked}
          expected={result ? (result.solution.tokens ?? []) : null}
        />
      )}
    </div>
  );
}
