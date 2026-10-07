import { FileUp, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { QuestionRowActions } from "@/components/admin/QuestionRowActions";
import { SavedToast } from "@/components/admin/SavedToast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DIFFICULTY_CONFIG, QUESTION_TYPE_LABELS } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { listQuestions } from "@/services/admin";
import { DIFFICULTIES, QUESTION_TYPES, type Difficulty, type QuestionType } from "@/types/question";

export const metadata = { title: "Questions" };

type Params = { q?: string; difficulty?: string; type?: string; status?: string; page?: string };

/** Table header cell text (styling only). */
const TH = "text-[11px] font-bold uppercase tracking-wider text-ink-500";

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const difficulty = DIFFICULTIES.includes(params.difficulty as Difficulty)
    ? (params.difficulty as Difficulty)
    : undefined;
  const type = QUESTION_TYPES.includes(params.type as QuestionType) ? (params.type as QuestionType) : undefined;
  const status = params.status === "active" || params.status === "inactive" ? params.status : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();
  const result = await listQuestions(supabase, { search: params.q, difficulty, type, status, page });

  return (
    <>
      <Suspense>
        <SavedToast label="Question" />
      </Suspense>
      <PageHeader
        title="Questions"
        description="Every question with its answer. Create, edit, hide and delete them; hidden questions are never served to players."
        actions={
          <>
            <Button size="sm" asChild>
              <Link href="/admin/questions/upload">
                <FileUp aria-hidden /> Bulk upload
              </Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href="/admin/questions/new">
                <Plus aria-hidden /> New question
              </Link>
            </Button>
          </>
        }
      />
      <Suspense>
        <FilterBar
          searchPlaceholder="Search text, topic or answer — or type an id"
          selects={[
            {
              name: "difficulty",
              label: "Difficulties",
              options: DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_CONFIG[d].label })),
            },
            {
              name: "type",
              label: "Types",
              options: QUESTION_TYPES.map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t].label })),
            },
            {
              name: "status",
              label: "Statuses",
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Hidden" },
              ],
            },
          ]}
        />
      </Suspense>

      <div className="clay overflow-hidden rounded-3xl">
        <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
          <TableHeader>
            <TableRow className="border-ink-100 bg-ink-50/80 hover:bg-ink-50/80">
              <TableHead className={cn(TH, "w-16")}>ID</TableHead>
              <TableHead className={TH}>Question</TableHead>
              <TableHead className={cn(TH, "hidden md:table-cell")}>Difficulty</TableHead>
              <TableHead className={cn(TH, "hidden lg:table-cell")}>Type</TableHead>
              <TableHead className={cn(TH, "hidden sm:table-cell")}>Status</TableHead>
              <TableHead className={cn(TH, "w-32 text-right")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((q) => (
              <TableRow key={q.id} className="border-ink-100 hover:bg-white/70">
                <TableCell className="font-mono text-xs font-semibold text-ink-500">{q.id}</TableCell>
                <TableCell className="max-w-md whitespace-normal">
                  <Link
                    href={`/admin/questions/${q.id}`}
                    className="line-clamp-2 text-sm font-semibold text-ink-800 hover:text-violet-700"
                  >
                    {q.question}
                  </Link>
                  <p className="mt-1 line-clamp-1 font-mono text-[11px] text-emerald-700" title={q.answer}>
                    <span className="text-ink-500">Answer: </span>
                    {q.answer.replace(/\s*\n\s*/g, " ⏎ ")}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-500">
                    {q.topic}
                    <span className="md:hidden"> · {DIFFICULTY_CONFIG[q.difficulty].label}</span>
                    <span className="lg:hidden"> · {QUESTION_TYPE_LABELS[q.type].short}</span>
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold shadow-clay-sm",
                      DIFFICULTY_CONFIG[q.difficulty].bg,
                      DIFFICULTY_CONFIG[q.difficulty].text,
                    )}
                  >
                    {DIFFICULTY_CONFIG[q.difficulty].label}
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm text-ink-700 lg:table-cell">
                  {QUESTION_TYPE_LABELS[q.type].label}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {q.is_active ? (
                    <Badge className="bg-emerald-100 font-bold text-emerald-800 shadow-clay-sm">Active</Badge>
                  ) : (
                    <Badge className="bg-ink-100 font-bold text-ink-600">Hidden</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <QuestionRowActions id={q.id} isActive={q.is_active} preview={q.question} />
                </TableCell>
              </TableRow>
            ))}
            {result.rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-3">
                  <div className="clay-inset rounded-3xl py-10 text-center text-sm font-semibold text-ink-500">
                    No questions match these filters.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        count={result.count}
        basePath="/admin/questions"
        params={{ q: params.q, difficulty, type, status }}
      />
    </>
  );
}
