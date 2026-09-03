import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getUsersWithProgress, getUserProgress, getUserSubscription } from "@/db/queries";
import { getIsAdmin } from "@/lib/admin";
import { levelReport } from "@/lib/level";
import { auth } from "@/lib/session";

import { LevelView } from "./level-view";

const LevelPage = async ({ searchParams }: { searchParams: Promise<{ user?: string }> }) => {
  const s = await auth.protect();
  const [userProgress, userSubscription, isAdmin, sp] = await Promise.all([
    getUserProgress(),
    getUserSubscription(),
    getIsAdmin(),
    searchParams,
  ]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  // 관리자만 다른 학습자의 결과를 열람한다. 그 외에는 파라미터를 무시.
  const users = isAdmin ? await getUsersWithProgress() : [];
  const requested = isAdmin && sp.user && users.some((u) => u.userId === sp.user) ? sp.user : s.user.id;
  const report = await levelReport(requested);
  const targetName = users.find((u) => u.userId === requested)?.userName ?? userProgress.userName;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress activeCourse={userProgress.activeCourse} hearts={userProgress.hearts} points={userProgress.points} hasActiveSubscription={!!userSubscription?.isActive} />
      </StickyWrapper>
      <FeedWrapper>
        <LevelView report={report} users={users} targetUserId={requested} targetName={targetName} isAdmin={isAdmin} />
      </FeedWrapper>
    </div>
  );
};

export default LevelPage;
