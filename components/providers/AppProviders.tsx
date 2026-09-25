"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, type InitialViewer } from "./AuthProvider";
import { SettingsProvider } from "./SettingsProvider";
import { ToastProvider } from "./ToastProvider";

const loadFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

export function AppProviders({ viewer, children }: { viewer: InitialViewer | null; children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <AuthProvider initialViewer={viewer}>
          <SettingsProvider>
            <TooltipProvider delayDuration={200}>
              <ToastProvider>{children}</ToastProvider>
            </TooltipProvider>
          </SettingsProvider>
        </AuthProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
