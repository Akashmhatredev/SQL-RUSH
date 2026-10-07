"use client";

import {
  Gamepad2,
  LayoutDashboard,
  LogIn,
  Menu,
  Shield,
  Trophy,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useSound } from "@/hooks/useSound";
import { levelForXp } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  show: "always" | "user" | "admin";
}

const NAV: NavItem[] = [
  { href: "/", label: "Play", icon: Gamepad2, show: "always" },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, show: "always" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: "user" },
  { href: "/admin", label: "Admin", icon: Shield, show: "admin" },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function SiteHeader() {
  const pathname = usePathname();
  const { profile, isAdmin } = useAuth();
  const { muted, toggleMute } = useSound();
  const [open, setOpen] = useState(false);
  const items = NAV.filter(
    (n) => n.show === "always" || (n.show === "user" && profile) || (n.show === "admin" && isAdmin),
  );
  const level = profile ? levelForXp(profile.xp) : null;
  const loginHref = `/login?next=${encodeURIComponent(pathname === "/login" ? "/dashboard" : pathname)}`;

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
      <div className="clay mx-auto flex h-16 w-full max-w-6xl items-center gap-3 rounded-[1.75rem] px-3 sm:px-4">
        <Link href="/" className="shrink-0 rounded-xl" aria-label="SQL Rush home">
          <Wordmark />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-2xl px-3.5 text-sm font-bold transition-all",
                isActive(pathname, href)
                  ? "bg-violet-100 text-violet-800 shadow-clay-pressed"
                  : "text-ink-600 hover:-translate-y-px hover:bg-white hover:text-ink-900 hover:shadow-clay-sm",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {profile && level && (
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs text-ink-700 shadow-clay-sm transition-transform hover:-translate-y-px sm:flex"
              title={`${level.name} · ${profile.xp.toLocaleString()} XP`}
            >
              <span aria-hidden>{level.emoji}</span>
              <span className="font-extrabold text-ink-900">Lv {level.index + 1}</span>
              <span className="font-mono text-ink-600">{profile.xp.toLocaleString()} XP</span>
            </Link>
          )}
          <button
            type="button"
            onClick={toggleMute}
            className="grid size-10 place-items-center rounded-2xl text-ink-500 transition-all hover:bg-white hover:text-ink-900 hover:shadow-clay-sm active:shadow-clay-pressed"
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            aria-pressed={muted}
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          {profile ? (
            <UserMenu />
          ) : (
            <Button variant="primary" size="sm" asChild>
              <Link href={loginHref}>
                <LogIn aria-hidden /> Sign in
              </Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="border-b border-ink-100 p-4">
                <SheetTitle>
                  <Wordmark />
                </SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav className="grid gap-1 p-3" aria-label="Mobile">
                {items.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(pathname, href) ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold",
                      isActive(pathname, href)
                        ? "bg-violet-100 text-violet-800 shadow-clay-pressed"
                        : "text-ink-700 hover:bg-white hover:shadow-clay-sm",
                    )}
                  >
                    <Icon className="size-4" aria-hidden /> {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
