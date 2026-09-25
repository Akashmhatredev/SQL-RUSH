import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { ConfigNotice } from "@/components/layout/ConfigNotice";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · SQL Rush" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <ConfigNotice className="mt-24" />;
  // The middleware already blocks non-admins; this guards direct renders too.
  await requireAdmin();
  return (
    <>
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:block">
            Admin
          </p>
          <AdminNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}
