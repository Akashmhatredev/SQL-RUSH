"use client";

import { BarChart3, Cloud, LogIn } from "lucide-react";
import Link from "next/link";
import { useLearn } from "@/components/learn/LearnProvider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ContinueLearningCard } from "./ContinueLearningCard";
import { LearnerSummary } from "./LearnerSummary";
import { Roadmap } from "./Roadmap";

/** /learn: the Beginner Mode home: resume card, the learner's stats and the full roadmap. */
export function LearnHome() {
  const learn = useLearn();
  const { profile, configured } = useAuth();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12">
      <section className="grid items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-clay-sm">
            <span className="size-2 rounded-full bg-emerald-500" /> Beginner Mode · no experience needed
          </p>
          <h1 className="text-4xl font-black leading-[1] tracking-tight text-ink-900 sm:text-6xl">
            See it first.
            <br />
            <span className="text-gradient animate-gradient">Then write the SQL.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-600 sm:text-lg">
            Go from &ldquo;what&apos;s a database?&rdquo; to joins and window functions. Every idea starts as a story
            you can touch, an animation you can step through, and only then becomes a query.
          </p>
          <ContinueLearningCard className="mt-6" />
          {learn.error && (
            <p
              className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-200"
              role="alert"
            >
              {learn.error}{" "}
              <button type="button" className="font-bold underline" onClick={() => void learn.refresh()}>
                Try again
              </button>
            </p>
          )}
        </div>
        <div className="space-y-3">
          <LearnerSummary />
          {learn.mode === "local" ? (
            <div className="clay flex items-start gap-3 rounded-3xl p-4">
              <Cloud className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
              <div className="text-sm text-ink-700">
                <p className="font-bold text-ink-900">Learning as a guest</p>
                <p>
                  Your progress is saved in this browser.
                  {configured && " Sign in and it moves to your account, on every device."}
                </p>
                {configured && !profile && (
                  <Button size="sm" variant="primary" className="mt-2" asChild>
                    <Link href="/login?next=%2Flearn">
                      <LogIn aria-hidden /> Sign in to save progress
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : null}
          <Button variant="secondary" className="w-full" asChild>
            <Link href="/learn/progress">
              <BarChart3 aria-hidden /> Your progress dashboard
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-14" aria-labelledby="roadmap-title">
        <h2 id="roadmap-title" className="mb-2 text-center text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
          Your learning roadmap
        </h2>
        <p className="mb-8 text-center text-sm font-semibold text-ink-500">
          6 modules · 28 lessons · each lesson unlocks the next
        </p>
        <Roadmap state={learn.state} />
      </section>
    </div>
  );
}
