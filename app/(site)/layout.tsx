import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </>
  );
}
