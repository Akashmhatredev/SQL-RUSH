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
import { cn } from "@/lib/utils";
import { findUserId, listScores, type Page, type ScoreWithPlayer } from "@/services/admin";
import { GAME_MODES, type GameMode } from "@/types/game";

export const metadata = { title: "Score history" };

const END_LABEL = { lives: "Out of lives", complete: "Completed", quit: "Ended early" } as const;

/** Table header cell text (styling only). */
const TH = "text-[11px] font-bold uppercase tracking-wider text-ink-500";

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
      {player && !userId && (
        <p className="mb-4 rounded-2xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-clay-sm">
          No player with the username “{player}”.
        </p>
      )}
      <div className="clay overflow-hidden rounded-3xl">
        <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
          <TableHeader>
            <TableRow className="border-ink-100 bg-ink-50/80 hover:bg-ink-50/80">
              <TableHead className={TH}>Player</TableHead>
              <TableHead className={TH}>Game</TableHead>
              <TableHead className={cn(TH, "text-right")}>Score</TableHead>
              <TableHead className={cn(TH, "hidden text-right md:table-cell")}>Correct</TableHead>
              <TableHead className={cn(TH, "hidden text-right lg:table-cell")}>XP</TableHead>
              <TableHead className={cn(TH, "hidden lg:table-cell")}>Result</TableHead>
              <TableHead className={cn(TH, "hidden sm:table-cell")}>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((s) => {
              const name = s.profiles?.display_name ?? s.profiles?.username ?? "Deleted user";
              return (
                <TableRow key={s.id} className="border-ink-100 hover:bg-white/70">
                  <TableCell>
                    <Link
                      href={s.profiles ? `/admin/scores?player=${s.profiles.username}` : "/admin/scores"}
                      className="flex items-center gap-2.5 hover:underline"
                    >
                      <PlayerAvatar name={name} src={s.profiles?.avatar_url} className="size-7" />
                      <span className="truncate text-sm font-bold text-ink-900">{name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-ink-800">
                    {MODE_CONFIG[s.mode].label}
                    {s.difficulty && (
                      <span className={`ml-1.5 text-xs font-bold ${DIFFICULTY_CONFIG[s.difficulty].text}`}>
                        {DIFFICULTY_CONFIG[s.difficulty].label}
                      </span>
                    )}
                    {!s.ranked && <Badge className="ml-2 bg-ink-100 font-bold text-ink-600">Unranked</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-ink-900">
                    {s.score.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-ink-800 md:table-cell">
                    {s.correct}/{s.answered} <span className="text-ink-500">({Math.round(s.accuracy)}%)</span>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-ink-800 lg:table-cell">
                    +{s.xp_earned}
                  </TableCell>
                  <TableCell className="hidden text-sm text-ink-600 lg:table-cell">
                    {END_LABEL[s.end_reason]} · {formatDuration(s.duration_seconds)}
                  </TableCell>
                  <TableCell className="hidden text-sm text-ink-600 sm:table-cell">
                    {new Date(s.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                </TableRow>
              );
            })}
            {result.rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-3">
                  <div className="clay-inset rounded-3xl py-10 text-center text-sm font-semibold text-ink-500">
                    No games found.
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
        basePath="/admin/scores"
        params={{ q: params.q, player: params.player, mode }}
      />
    </>
  );
}
