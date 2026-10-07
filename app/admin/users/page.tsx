import { Pencil } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { UserRoleSelect } from "@/components/admin/UserRoleSelect";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { listUsers } from "@/services/admin";

export const metadata = { title: "Users" };

/** Table header cell text (styling only). */
const TH = "text-[11px] font-bold uppercase tracking-wider text-ink-500";

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
      <PageHeader
        title="Users"
        description="Everyone who has signed in. Open a player to edit their profile, XP and badges, or to reset or delete them. Emails are only visible to admins."
      />
      <Suspense>
        <FilterBar searchPlaceholder="Search username, name or email" />
      </Suspense>
      <div className="clay overflow-hidden rounded-3xl">
        <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
          <TableHeader>
            <TableRow className="border-ink-100 bg-ink-50/80 hover:bg-ink-50/80">
              <TableHead className={TH}>Player</TableHead>
              <TableHead className={cn(TH, "hidden text-right md:table-cell")}>Level · XP</TableHead>
              <TableHead className={cn(TH, "hidden text-right lg:table-cell")}>Games</TableHead>
              <TableHead className={cn(TH, "hidden text-right lg:table-cell")}>Accuracy</TableHead>
              <TableHead className={cn(TH, "hidden xl:table-cell")}>Last sign-in</TableHead>
              <TableHead className={TH}>Role</TableHead>
              <TableHead className={cn(TH, "w-12")}>
                <span className="sr-only">Edit</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((u) => {
              const name = u.displayName ?? u.username;
              const accuracy = u.questionsAnswered
                ? Math.round((u.questionsCorrect / u.questionsAnswered) * 100)
                : null;
              return (
                <TableRow key={u.id} className="border-ink-100 hover:bg-white/70">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PlayerAvatar name={name} src={u.avatarUrl} className="size-8" />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="block truncate text-sm font-bold text-ink-900 hover:underline"
                        >
                          {name} <span className="font-semibold text-ink-500">@{u.username}</span>
                        </Link>
                        <p className="truncate text-xs text-ink-500">
                          {u.email} · {u.provider} · joined {new Date(u.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-ink-800 md:table-cell">
                    {u.level} · {u.xp.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-ink-800 lg:table-cell">
                    <Link
                      href={`/admin/scores?player=${u.username}`}
                      className="font-semibold hover:text-violet-700 hover:underline"
                    >
                      {u.gamesPlayed.toLocaleString()}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm text-ink-800 lg:table-cell">
                    {accuracy === null ? "—" : `${accuracy}%`}
                  </TableCell>
                  <TableCell className="hidden text-sm text-ink-600 xl:table-cell">
                    {u.lastSignInAt ? timeAgo(u.lastSignInAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <UserRoleSelect userId={u.id} role={u.role} name={name} isSelf={u.id === viewer.userId} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/admin/users/${u.id}`} aria-label={`Edit ${name}`}>
                        <Pencil />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {result.rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-3">
                  <div className="clay-inset rounded-3xl py-10 text-center text-sm font-semibold text-ink-500">
                    No users match.
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
        basePath="/admin/users"
        params={{ q: params.q }}
      />
    </>
  );
}
