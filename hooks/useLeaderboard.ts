"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getLeaderboard, getPlayerRank, type Board, type LeaderboardEntry } from "@/services/leaderboard";

export interface BoardData {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  fetchedAt: number;
}

export type LiveStatus = "connecting" | "live" | "offline";

/** How long to wait after a new score before refetching, so bursts cause one request. */
const DEBOUNCE_MS = 1200;
/** Fallback polling when the realtime socket isn't connected. */
const POLL_MS = 30_000;

/**
 * Leaderboard data with live updates: every finished game inserts a row into
 * `scores`, which Supabase Realtime broadcasts; the current board refetches.
 */
export function useLeaderboard({
  board,
  initial,
  limit = 50,
}: {
  board: Board;
  initial?: { board: Board; data: BoardData };
  limit?: number;
}) {
  const { supabase, userId } = useAuth();
  const [cache, setCache] = useState<Partial<Record<Board, BoardData>>>(() =>
    initial ? { [initial.board]: initial.data } : {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveStatus>(supabase ? "connecting" : "offline");
  const [pulse, setPulse] = useState(0);
  const boardRef = useRef(board);
  boardRef.current = board;

  const load = useCallback(
    async (b: Board) => {
      if (!supabase) return;
      setLoading(true);
      try {
        const [entries, me] = await Promise.all([
          getLeaderboard(supabase, b, limit),
          userId ? getPlayerRank(supabase, b, userId) : Promise.resolve(null),
        ]);
        setCache((c) => ({ ...c, [b]: { entries, me, fetchedAt: Date.now() } }));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load the leaderboard.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, limit],
  );

  const cached = cache[board];
  useEffect(() => {
    if (!cached) void load(board);
  }, [board, cached, load]);

  useEffect(() => {
    if (!supabase) return;
    let timer: number | undefined;
    const channel = supabase
      .channel("leaderboard-scores")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scores" }, () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          // Every board may have changed: drop the others, refetch the one on screen.
          setCache((c) => ({ [boardRef.current]: c[boardRef.current] }) as Partial<Record<Board, BoardData>>);
          setPulse((p) => p + 1);
          void load(boardRef.current);
        }, DEBOUNCE_MS);
      })
      .subscribe((status) => {
        setLive(
          status === "SUBSCRIBED"
            ? "live"
            : status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "offline"
              : "connecting",
        );
      });
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  useEffect(() => {
    if (live === "live" || !supabase) return;
    const id = window.setInterval(() => void load(boardRef.current), POLL_MS);
    return () => window.clearInterval(id);
  }, [live, supabase, load]);

  return { data: cached ?? null, loading, error, live, pulse, refresh: () => load(board) };
}
