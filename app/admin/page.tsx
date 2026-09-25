import { Activity, FileUp, Gamepad2, ListChecks, Plus, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DIFFICULTY_CONFIG, MODE_CONFIG, QUESTION_TYPE_LABELS } from "@/lib/config";
import { timeAgo } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { getOverview, listScores } from "@/services/admin";
import { DIFFICULTIES, QUESTION_TYPES } from "@/types/question";

export const metadata = { title: "Overview" };

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: number; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <Icon className="size-5 text-sky-300" aria-hidden />
      <p className="mt-3 font-mono text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
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
        <Stat icon={Users} label="Players" value={o.users} sub={`+${o.newUsersToday} today`} />
        <Stat icon={ShieldCheck} label="Admins" value={o.admins} />
        <Stat icon={ListChecks} label="Questions" value={o.questions} sub={`${o.activeQuestions} active`} />
        <Stat icon={Gamepad2} label="Games played" value={o.games} sub={`${o.gamesToday} today`} />
        <Stat icon={Activity} label="Answers today" value={o.answersToday} />
        <Stat icon={Activity} label="Runs in progress" value={o.activeRuns} sub="active in the last 15 min" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-2xl p-4" aria-labelledby="bank-difficulty">
          <h2 id="bank-difficulty" className="mb-3 font-semibold text-white">
            Question bank by difficulty
          </h2>
          <div className="space-y-3">
            {DIFFICULTIES.map((d) => (
              <div key={d}>
                <div className="mb-1 flex justify-between text-sm">
                  <Link
                    href={`/admin/questions?difficulty=${d}`}
                    className={`font-medium ${DIFFICULTY_CONFIG[d].text} hover:underline`}
                  >
                    {DIFFICULTY_CONFIG[d].label}
                  </Link>
                  <span className="font-mono text-xs text-slate-400">{o.questionsByDifficulty[d] ?? 0}</span>
                </div>
                <ProgressBar
                  value={(o.questionsByDifficulty[d] ?? 0) / maxByDifficulty}
                  color={DIFFICULTY_CONFIG[d].hex}
                />
              </div>
            ))}
          </div>
        </section>
        <section className="glass rounded-2xl p-4" aria-labelledby="bank-type">
          <h2 id="bank-type" className="mb-3 font-semibold text-white">
            Question bank by type
          </h2>
          <div className="space-y-3">
            {QUESTION_TYPES.map((t) => (
              <div key={t}>
                <div className="mb-1 flex justify-between text-sm">
                  <Link href={`/admin/questions?type=${t}`} className="font-medium text-slate-200 hover:underline">
                    {QUESTION_TYPE_LABELS[t].label}
                  </Link>
                  <span className="font-mono text-xs text-slate-400">{o.questionsByType[t] ?? 0}</span>
                </div>
                <ProgressBar value={(o.questionsByType[t] ?? 0) / maxByType} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6" aria-labelledby="recent-games">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="recent-games" className="font-semibold text-white">
            Latest games
          </h2>
          <Link href="/admin/scores" className="text-sm font-medium text-sky-300 hover:text-sky-200">
            Full history →
          </Link>
        </div>
        <ul className="glass divide-y divide-white/5 rounded-2xl">
          {recent.rows.slice(0, 8).map((s) => {
            const name = s.profiles?.display_name ?? s.profiles?.username ?? "Deleted user";
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <PlayerAvatar name={name} src={s.profiles?.avatar_url} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{name}</p>
                  <p className="text-xs text-slate-500">
                    {MODE_CONFIG[s.mode].label}
                    {s.difficulty && ` · ${DIFFICULTY_CONFIG[s.difficulty].label}`} · {s.correct}/{s.answered} ·{" "}
                    {timeAgo(s.created_at)}
                  </p>
                </div>
                <p className="font-mono text-sm font-bold text-white">{s.score.toLocaleString()}</p>
              </li>
            );
          })}
          {recent.rows.length === 0 && <li className="p-6 text-center text-sm text-slate-500">No games yet.</li>}
        </ul>
      </section>
    </>
  );
}
