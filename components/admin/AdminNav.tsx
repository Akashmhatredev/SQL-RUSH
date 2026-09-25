"use client";

import { Award, ClipboardList, FileUp, LayoutDashboard, ListChecks, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/questions", label: "Questions", icon: ListChecks, exact: true },
  { href: "/admin/questions/upload", label: "Bulk upload", icon: FileUp },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/scores", label: "Score history", icon: ClipboardList },
  { href: "/admin/achievements", label: "Achievements", icon: Award },
];

export function AdminNav() {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) =>
    exact
      ? pathname === href || (href === "/admin/questions" && /^\/admin\/questions\/(new|\d+)/.test(pathname))
      : pathname.startsWith(href);
  return (
    <nav
      aria-label="Admin"
      className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
    >
      {ITEMS.map(({ href, label, icon: Icon, exact }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href, exact) ? "page" : undefined}
          className={cn(
            "flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors",
            active(href, exact) ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
          )}
        >
          <Icon className="size-4" aria-hidden /> {label}
        </Link>
      ))}
    </nav>
  );
}
