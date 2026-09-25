import { AchievementManager } from "@/components/admin/AchievementManager";
import { PageHeader } from "@/components/admin/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { listAchievements } from "@/services/admin";

export const metadata = { title: "Achievements" };

export default async function AdminAchievementsPage() {
  const supabase = await createClient();
  const achievements = await listAchievements(supabase);
  return (
    <>
      <PageHeader
        title="Achievements"
        description="Badges players unlock automatically. Inactive achievements stop unlocking and are hidden from collections."
      />
      <AchievementManager achievements={achievements} />
    </>
  );
}
