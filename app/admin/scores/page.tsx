import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DIFFICULTY_CONFIG, MODE_CONFIG } from "@/lib/config";
import { formatDuration } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { findUserId, listScores, type Page, type ScoreWithPlayer } from "@/services/admin";
import { GAME_MODES, type GameMode } from "@/types/game";

export const metadata = { title: "Score history" };

const END_LABEL = { lives: "Out of lives", complete: "Completed", quit: "Ended early" } as const;

export default async function AdminScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; player?: string; mode?: string; page?: string }>;
}) {
  const params = await searchParams;
  const mode = GAME_MODES.includes(params.mode as GameMode) ? (params.mode as GameMode) : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const player = (params.q ?? params.player)?.replace(/^@/, "").trim() || undefined;

  const supabase = await createClient();
  const userId = player ? await findUserId(supabase, player) : undefined;
  const result: Page<ScoreWithPlayer> =
    player && !userId
      ? { rows: [], count: 0, page: 1, pageCount: 1 }
      : await listScores(supabase, { mode, userId: userId ?? undefined, page });

  return (
    <>
      <PageHeader title="Score history" description="Every finished run, newest first. Practice runs are unranked." />
      <Suspense>
        <FilterBar
          searchPlaceholder="Filter by exact username"
          selects={[
            {
              name: "mode",
              label: "Modes",
              options: GAME_MODES.map((m) => ({ value: m, label: MODE_CONFIG[m].label })),
            },
          ]}
        />
      </Suspense>
      {player && !userId && <p className="mb-4 text-sm text-amber-200">No player with the username “{player}”.</p>}
      <div className="glass overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400">Player</TableHead>
              <TableHead className="text-slate-400">Game</TableHead>
              <TableHead className="text-right text-slate-400">Score</TableHead>
              <TableHead className="hidden text-right text-slate-400 md:table-cell">Correct</TableHead>
              <TableHead className="hidden text-right text-slate-400 lg:table-cell">XP</TableHead>
              <TableHead className="hidden text-slate-400 lg:table-cell">Result</TableHead>
              <TableHead className="hidden text-slate-400 sm:table-cell">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((s) => {
              const name = s.profiles?.display_name ?? s.profiles?.username ?? "Deleted user";
              return (
                <TableRow key={s.id} className="border-white/5 hover:bg-white/[0.03]">
                  <TableCell>
                    <Link
                      href={s.profiles ? `/admin/scores?player=${s.profiles.username}` : "/admin/scores"}
                      className="flex items-center gap-2.5 hover:underline"
                    >
                      <PlayerAvatar name={name} src={s.profiles?.avatar_url} className="size-7" />
                      <span className="truncate text-sm text-white">{name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-300">
                    {MODE_CONFIG[s.mode].label}
                    {s.difficulty && (
                      <span className={`ml-1.5 text-xs ${DIFFICULTY_CONFIG[s.difficulty].text}`}>
                        {DIFFICULTY_CONFIG[s.difficulty].label}
                      </span>
                    )}
                    {!s.ranked && <Badge className="ml-2 border-white/10 bg-white/5 text-slate-400">Unranked</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-white">
                    {s.score.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-slate-300 md:table-cell">
                    {s.correct}/{s.answered} <span className="text-slate-500">({Math.round(s.accuracy)}%)</span>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-slate-300 lg:table-cell">
                    +{s.xp_earned}
                  </TableCell>
                  <TableCell className="hidden text-sm text-slate-400 lg:table-cell">
                    {END_LABEL[s.end_reason]} · {formatDuration(s.duration_seconds)}
                  </TableCell>
                  <TableCell className="hidden text-sm text-slate-400 sm:table-cell">
                    {new Date(s.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                </TableRow>
              );
            })}
            {result.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                  No games found.
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
        basePath="/admin/scores"
        params={{ q: params.q, player: params.player, mode }}
      />
    </>
  );
}
