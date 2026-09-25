import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { UserRoleSelect } from "@/components/admin/UserRoleSelect";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { listUsers } from "@/services/admin";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [viewer, supabase] = await Promise.all([requireAdmin(), createClient()]);
  const result = await listUsers(supabase, { search: params.q, page });

  return (
    <>
      <PageHeader title="Users" description="Everyone who has signed in. Emails are only visible to admins." />
      <Suspense>
        <FilterBar searchPlaceholder="Search username, name or email" />
      </Suspense>
      <div className="glass overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400">Player</TableHead>
              <TableHead className="hidden text-right text-slate-400 md:table-cell">Level · XP</TableHead>
              <TableHead className="hidden text-right text-slate-400 lg:table-cell">Games</TableHead>
              <TableHead className="hidden text-right text-slate-400 lg:table-cell">Accuracy</TableHead>
              <TableHead className="hidden text-slate-400 xl:table-cell">Last sign-in</TableHead>
              <TableHead className="text-slate-400">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((u) => {
              const name = u.displayName ?? u.username;
              const accuracy = u.questionsAnswered
                ? Math.round((u.questionsCorrect / u.questionsAnswered) * 100)
                : null;
              return (
                <TableRow key={u.id} className="border-white/5 hover:bg-white/[0.03]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PlayerAvatar name={name} src={u.avatarUrl} className="size-8" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {name} <span className="font-normal text-slate-500">@{u.username}</span>
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {u.email} · {u.provider} · joined {new Date(u.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-slate-300 md:table-cell">
                    {u.level} · {u.xp.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-slate-300 lg:table-cell">
                    <Link href={`/admin/scores?player=${u.username}`} className="hover:text-white hover:underline">
                      {u.gamesPlayed.toLocaleString()}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-slate-300 lg:table-cell">
                    {accuracy === null ? "—" : `${accuracy}%`}
                  </TableCell>
                  <TableCell className="hidden text-sm text-slate-400 xl:table-cell">
                    {u.lastSignInAt ? timeAgo(u.lastSignInAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <UserRoleSelect userId={u.id} role={u.role} name={name} isSelf={u.id === viewer.userId} />
                  </TableCell>
                </TableRow>
              );
            })}
            {result.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                  No users match.
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
        basePath="/admin/users"
        params={{ q: params.q }}
      />
    </>
  );
}
