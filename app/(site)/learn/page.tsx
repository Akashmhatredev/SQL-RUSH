import type { Metadata } from "next";
import { LearnHome } from "@/components/learn/roadmap/LearnHome";

export const metadata: Metadata = {
  title: "Learn SQL from zero",
  description:
    "Beginner Mode: learn databases and SQL visually, from what a table is to joins and window functions, with interactive animations, XP, streaks and badges.",
};

export default function LearnPage() {
  return <LearnHome />;
}
