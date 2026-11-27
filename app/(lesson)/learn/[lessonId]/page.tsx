import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/learn/lesson/LessonPlayer";
import { LESSONS, lessonOutline, moduleOutline } from "@/lib/learn/curriculum";
import { getLesson } from "@/lib/learn/lessons";

// Rendered per request (not prerendered) like the rest of the app: the root layout reads the
// session cookie, and a static page would treat a signed-in learner as a guest.

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  const outline = lessonOutline(lessonId);
  const lesson = getLesson(lessonId);
  if (!outline || !lesson) return {};
  return { title: `${outline.title} · Learn SQL`, description: lesson.summary };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const outline = lessonOutline(lessonId);
  const lesson = getLesson(lessonId);
  if (!outline || !lesson) notFound();
  const mod = moduleOutline(outline.moduleId)!;
  const next = LESSONS[outline.position] ?? null;
  const prev = LESSONS[outline.position - 2] ?? null;
  // Only this lesson's content is sent to the browser.
  return <LessonPlayer lesson={lesson} outline={outline} module={mod} next={next} prev={prev} />;
}
