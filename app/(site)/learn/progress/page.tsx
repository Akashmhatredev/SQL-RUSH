import type { Metadata } from "next";
import { ProgressDashboard } from "@/components/learn/roadmap/ProgressDashboard";

export const metadata: Metadata = {
  title: "Learning progress",
  description: "Your Beginner Mode progress: lessons, modules, XP, level, streaks, daily goals and badges.",
};

export default function LearnProgressPage() {
  return <ProgressDashboard />;
}
