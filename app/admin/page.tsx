import { Activity, FileUp, Gamepad2, ListChecks, Plus, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DIFFICULTY_CONFIG, MODE_CONFIG, QUESTION_TYPE_LABELS } from "@/lib/config";
import { timeAgo } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getOverview, listScores } from "@/services/admin";
import { DIFFICULTIES, QUESTION_TYPES } from "@/types/question";

export const metadata = { title: "Overview" };

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  chip = "bg-violet-100 text-violet-600",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
  /** Pastel icon chip colours (styling only). */
  chip?: string;
}) {
  return (
    <div className="clay rounded-3xl p-4">
      <span className={cn("grid size-10 place-items-center rounded-2xl shadow-clay-sm", chip)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-3 font-mono text-2xl font-bold text-ink-900">{value.toLocaleString()}</p>
      <p className="text-xs font-semibold text-ink-500">{label}</p>
      {sub && <p className="mt-1 text-[11px] font-semibold text-ink-500">{sub}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const [o, recent] = await Promise.all([getOverview(supabase), listScores(supabase, { page: 1 })]);
  const maxByDifficulty = Math.max(1, ...DIFFICULTIES.map((d) => o.questionsByDifficulty[d] ?? 0));
  const maxByType = Math.max(1, ...QUESTION_TYPES.map((t) => o.questionsByType[t] ?? 0));

  return (
    <>
      <PageHeader
        title="Overview"
        description="Players, the question bank and game activity at a glance. Days are UTC."
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
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          icon={Users}
          label="Players"
          value={o.users}
          sub={`+${o.newUsersToday} today`}
          chip="bg-sky-100 text-sky-600"
        />
        <Stat icon={ShieldCheck} label="Admins" value={o.admins} chip="bg-violet-100 text-violet-600" />
        <Stat
          icon={ListChecks}
          label="Questions"
          value={o.questions}
          sub={`${o.activeQuestions} active`}
          chip="bg-amber-100 text-amber-600"
        />
        <Stat
          icon={Gamepad2}
          label="Games played"
          value={o.games}
          sub={`${o.gamesToday} today`}
          chip="bg-emerald-100 text-emerald-600"
        />
        <Stat icon={Activity} label="Answers today" value={o.answersToday} chip="bg-pink-100 text-pink-600" />
        <Stat
          icon={Activity}
          label="Runs in progress"
          value={o.activeRuns}
          sub="active in the last 15 min"
          chip="bg-orange-100 text-orange-600"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="clay rounded-3xl p-5" aria-labelledby="bank-difficulty">
          <h2 id="bank-difficulty" className="mb-3 font-extrabold text-ink-900">
            Question bank by difficulty
          </h2>
          <div className="space-y-3">
            {DIFFICULTIES.map((d) => (
              <div key={d}>
                <div className="mb-1 flex justify-between text-sm">
                  <Link
                    href={`/admin/questions?difficulty=${d}`}
                    className={`font-bold ${DIFFICULTY_CONFIG[d].text} hover:underline`}
                  >
                    {DIFFICULTY_CONFIG[d].label}
                  </Link>
                  <span className="font-mono text-xs font-semibold text-ink-500">
                    {o.questionsByDifficulty[d] ?? 0}
                  </span>
                </div>
                <ProgressBar
                  value={(o.questionsByDifficulty[d] ?? 0) / maxByDifficulty}
                  color={DIFFICULTY_CONFIG[d].hex}
                />
              </div>
            ))}
          </div>
        </section>
        <section className="clay rounded-3xl p-5" aria-labelledby="bank-type">
          <h2 id="bank-type" className="mb-3 font-extrabold text-ink-900">
            Question bank by type
          </h2>
          <div className="space-y-3">
            {QUESTION_TYPES.map((t) => (
              <div key={t}>
                <div className="mb-1 flex justify-between text-sm">
                  <Link href={`/admin/questions?type=${t}`} className="font-bold text-ink-800 hover:underline">
                    {QUESTION_TYPE_LABELS[t].label}
                  </Link>
                  <span className="font-mono text-xs font-semibold text-ink-500">{o.questionsByType[t] ?? 0}</span>
                </div>
                <ProgressBar value={(o.questionsByType[t] ?? 0) / maxByType} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6" aria-labelledby="recent-games">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="recent-games" className="text-lg font-extrabold text-ink-900">
            Latest games
          </h2>
          <Link href="/admin/scores" className="text-sm font-bold text-violet-700 hover:text-violet-900">
            Full history →
          </Link>
        </div>
        <ul
          className={cn(
            "divide-y divide-ink-100 overflow-hidden rounded-3xl",
            recent.rows.length ? "clay" : "clay-inset",
          )}
        >
          {recent.rows.slice(0, 8).map((s) => {
            const name = s.profiles?.display_name ?? s.profiles?.username ?? "Deleted user";
            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/70">
                <PlayerAvatar name={name} src={s.profiles?.avatar_url} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{name}</p>
                  <p className="text-xs text-ink-500">
                    {MODE_CONFIG[s.mode].label}
                    {s.difficulty && ` · ${DIFFICULTY_CONFIG[s.difficulty].label}`} · {s.correct}/{s.answered} ·{" "}
                    {timeAgo(s.created_at)}
                  </p>
                </div>
                <p className="font-mono text-sm font-bold tabular-nums text-ink-900">{s.score.toLocaleString()}</p>
              </li>
            );
          })}
          {recent.rows.length === 0 && (
            <li className="p-8 text-center text-sm font-semibold text-ink-500">No games yet.</li>
          )}
        </ul>
      </section>
    </>
  );
}
