import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { fromQuestionRow } from "@/lib/schemas/question";
import { createClient } from "@/lib/supabase/server";
import { getQuestion } from "@/services/admin";

export const metadata = { title: "Edit question" };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const questionId = Number(id);
  if (!Number.isInteger(questionId) || questionId <= 0) notFound();
  const supabase = await createClient();
  const row = await getQuestion(supabase, questionId);
  if (!row) notFound();

  const { count: answered } = await supabase
    .from("game_answers")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);
  const { count: correct } = await supabase
    .from("game_answers")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId)
    .eq("is_correct", true);

  return (
    <>
      <PageHeader
        title={`Edit question #${row.id}`}
        description={
          answered
            ? `Answered ${answered.toLocaleString()} times · ${Math.round(((correct ?? 0) / answered) * 100)}% correct`
            : "Not answered by anyone yet."
        }
      />
      <QuestionForm initial={fromQuestionRow(row)} />
    </>
  );
}
