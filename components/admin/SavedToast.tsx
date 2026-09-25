"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useToasts } from "@/components/providers/ToastProvider";

/** Shows a toast for `?saved=<id>` after a redirect, then removes the param. */
export function SavedToast({ label }: { label: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { push } = useToasts();
  const saved = params.get("saved");

  useEffect(() => {
    if (!saved) return;
    push({ kind: "success", title: `${label} #${saved} saved` });
    const next = new URLSearchParams(params);
    next.delete("saved");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [saved, label, params, pathname, push, router]);

  return null;
}
