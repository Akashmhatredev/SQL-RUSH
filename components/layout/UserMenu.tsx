"use client";

import { LayoutDashboard, LogOut, Shield, Trophy } from "lucide-react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { levelForXp } from "@/lib/levels";

export function UserMenu() {
  const { profile, email, isAdmin, signOut } = useAuth();
  if (!profile) return null;
  const name = profile.display_name ?? profile.username;
  const level = levelForXp(profile.xp);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        aria-label="Account menu"
      >
        <PlayerAvatar name={name} src={profile.avatar_url} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-60 rounded-2xl p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <p className="truncate text-xs font-normal text-slate-400">
            @{profile.username}
            {email ? ` · ${email}` : ""}
          </p>
          <p className="mt-1 text-xs font-normal text-slate-400">
            {level.emoji} {level.name} · {profile.xp.toLocaleString()} XP
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard aria-hidden /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/leaderboard">
            <Trophy aria-hidden /> Leaderboards
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield aria-hidden /> Admin panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()} className="text-rose-200 focus:text-rose-100">
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
