import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserAchievements } from "@/components/admin/UserAchievements";
import { UserDangerZone } from "@/components/admin/UserDangerZone";
import { UserEditForm } from "@/components/admin/UserEditForm";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { DIFFICULTY_CONFIG, MODE_CONFIG } from "@/lib/config";
import { liveDayStreak, timeAgo } from "@/lib/date";
import { levelForXp } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getUserDetail, listAchievements, listScores } from "@/services/admin";

export const metadata = { title: "User" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [viewer, supabase] = await Promise.all([requireAdmin(), createClient()]);
  const [user, achievements, games] = await Promise.all([
    getUserDetail(supabase, id),
    listAchievements(supabase),
    listScores(supabase, { userId: id, page: 1 }),
  ]);
  if (!user) notFound();

  const p = user.profile;
  const name = p.display_name ?? p.username;
  const isSelf = p.id === viewer.userId;
  const level = levelForXp(p.xp);
  const accuracy = p.questions_answered ? Math.round((p.questions_correct / p.questions_answered) * 100) : null;
  const stats: { label: string; value: string }[] = [
    { label: "Level", value: `${level.emoji} ${level.name}` },
    { label: "XP", value: p.xp.toLocaleString() },
    { label: "Games played", value: p.games_played.toLocaleString() },
    {
      label: "Accuracy",
      value: accuracy === null ? "—" : `${accuracy}% (${p.questions_correct}/${p.questions_answered})`,
    },
    { label: "High score", value: p.high_score.toLocaleString() },
    { label: "Total score", value: Number(p.total_score).toLocaleString() },
    { label: "Best combo streak", value: p.best_streak.toLocaleString() },
    { label: "Expert correct", value: p.expert_correct.toLocaleString() },
    { label: "Perfect runs", value: p.perfect_runs.toLocaleString() },
    { label: "Dailies completed", value: p.daily_completed.toLocaleString() },
    {
      label: "Day streak (best)",
      value: `${liveDayStreak(p.day_streak, p.last_played_on)} (${p.best_day_streak})`,
    },
    {
      label: "Fastest answer",
      value: p.fastest_answer_ms === null ? "—" : `${(p.fastest_answer_ms / 1000).toFixed(1)}s`,
    },
  ];

  return (
    <>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-600 transition-colors hover:text-violet-700"
      >
        <ArrowLeft className="size-4" aria-hidden /> All users
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <PlayerAvatar name={name} src={p.avatar_url} className="size-16" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-black tracking-tight text-ink-900">
            <span className="truncate">{name}</span>
            {p.role === "admin" && (
              <Badge className="bg-violet-100 font-bold text-violet-800 shadow-clay-sm">Admin</Badge>
            )}
            {isSelf && <Badge className="bg-sky-100 font-bold text-sky-800 shadow-clay-sm">You</Badge>}
          </h1>
          <p className="mt-1 truncate text-sm text-ink-600">
            @{p.username} · {user.email ?? "no email"} · {user.provider}
          </p>
          <p className="text-xs text-ink-500">
            Joined {new Date(p.created_at).toLocaleDateString()} · Last sign-in{" "}
            {user.lastSignInAt ? timeAgo(user.lastSignInAt) : "never"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <UserEditForm
          // Remount after a save so the inputs show what the server stored.
          key={p.updated_at}
          isSelf={isSelf}
          user={{
            id: p.id,
            username: p.username,
            displayName: p.display_name,
            avatarUrl: p.avatar_url,
            role: p.role,
            xp: p.xp,
          }}
        />
        <section className="clay rounded-3xl p-4 sm:p-5" aria-labelledby="stats">
          <h2 id="stats" className="font-extrabold text-ink-900">
            Progress
          </h2>
          <p className="mt-1 text-xs text-ink-500">Written by the game. Use the XP field or a reset to change it.</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{s.label}</dt>
                <dd className="truncate font-mono text-sm font-semibold text-ink-900">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="mt-8" aria-labelledby="badges">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="badges" className="text-lg font-extrabold text-ink-900">
            Achievements
          </h2>
          <p className="text-sm font-semibold text-ink-500">
            {Object.keys(user.unlocked).length} of {achievements.length} unlocked
          </p>
        </div>
        <UserAchievements userId={p.id} achievements={achievements} unlocked={user.unlocked} />
      </section>

      <section className="mt-8" aria-labelledby="games">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="games" className="text-lg font-extrabold text-ink-900">
            Recent games
          </h2>
          {games.count > 0 && (
            <Link
              href={`/admin/scores?player=${p.username}`}
              className="text-sm font-bold text-violet-700 hover:text-violet-900"
            >
              All {games.count.toLocaleString()} games →
            </Link>
          )}
        </div>
        <ul
          className={cn(
            "divide-y divide-ink-100 overflow-hidden rounded-3xl",
            games.rows.length ? "clay" : "clay-inset",
          )}
        >
          {games.rows.slice(0, 10).map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/70">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">
                  {MODE_CONFIG[s.mode].label}
                  {s.difficulty && (
                    <span className={`ml-1.5 text-xs font-bold ${DIFFICULTY_CONFIG[s.difficulty].text}`}>
                      {DIFFICULTY_CONFIG[s.difficulty].label}
                    </span>
                  )}
                  {!s.ranked && <span className="ml-1.5 text-xs font-semibold text-ink-500">unranked</span>}
                </p>
                <p className="text-xs text-ink-500">
                  {s.correct}/{s.answered} correct · +{s.xp_earned} XP · {timeAgo(s.created_at)}
                </p>
              </div>
              <p className="font-mono text-sm font-bold tabular-nums text-ink-900">{s.score.toLocaleString()}</p>
            </li>
          ))}
          {games.rows.length === 0 && (
            <li className="p-8 text-center text-sm font-semibold text-ink-500">No games yet.</li>
          )}
        </ul>
      </section>

      <div className="mt-8">
        <UserDangerZone userId={p.id} username={p.username} isSelf={isSelf} isAdmin={p.role === "admin"} />
      </div>
    </>
  );
}
