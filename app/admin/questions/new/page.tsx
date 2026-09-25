import { PageHeader } from "@/components/admin/PageHeader";
import { QuestionForm } from "@/components/admin/QuestionForm";

export const metadata = { title: "New question" };

export default function NewQuestionPage() {
  return (
    <>
      <PageHeader title="New question" description="Questions are written against the practice schema shown in game." />
      <QuestionForm />
    </>
  );
}
