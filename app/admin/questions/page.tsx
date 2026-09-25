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
        description="Create, edit, hide and delete questions. Hidden questions are never served to players."
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

      <div className="glass overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-16 text-slate-400">ID</TableHead>
              <TableHead className="text-slate-400">Question</TableHead>
              <TableHead className="hidden text-slate-400 md:table-cell">Difficulty</TableHead>
              <TableHead className="hidden text-slate-400 lg:table-cell">Type</TableHead>
              <TableHead className="hidden text-slate-400 sm:table-cell">Status</TableHead>
              <TableHead className="w-32 text-right text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((q) => (
              <TableRow key={q.id} className="border-white/5 hover:bg-white/[0.03]">
                <TableCell className="font-mono text-xs text-slate-500">{q.id}</TableCell>
                <TableCell className="max-w-md whitespace-normal">
                  <Link
                    href={`/admin/questions/${q.id}`}
                    className="line-clamp-2 text-sm text-slate-100 hover:text-white"
                  >
                    {q.question}
                  </Link>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                    {q.topic}
                    <span className="md:hidden"> · {DIFFICULTY_CONFIG[q.difficulty].label}</span>
                    <span className="lg:hidden"> · {QUESTION_TYPE_LABELS[q.type].short}</span>
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      DIFFICULTY_CONFIG[q.difficulty].border,
                      DIFFICULTY_CONFIG[q.difficulty].bg,
                      DIFFICULTY_CONFIG[q.difficulty].text,
                    )}
                  >
                    {DIFFICULTY_CONFIG[q.difficulty].label}
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm text-slate-300 lg:table-cell">
                  {QUESTION_TYPE_LABELS[q.type].label}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {q.is_active ? (
                    <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">Active</Badge>
                  ) : (
                    <Badge className="border-white/10 bg-white/5 text-slate-400">Hidden</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <QuestionRowActions id={q.id} isActive={q.is_active} preview={q.question} />
                </TableCell>
              </TableRow>
            ))}
            {result.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                  No questions match these filters.
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
