import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getUserProgress, getUserSubscription, getUsersWithProgress } from "@/db/queries";
import { getIsAdmin } from "@/lib/admin";
import { levelReport } from "@/lib/level";
import { auth } from "@/lib/session";

import { LevelView } from "./level-view";

// 레벨 테스트 결과. 프로필의 "시험 결과" 버튼으로 들어온다; 관리자는 ?user= 로 다른 학습자를 본다.
export default async function LevelPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const s = await auth.protect();
  const userId = s.user.id;
  const [userProgress, userSubscription, isAdmin, sp] = await Promise.all([getUserProgress(), getUserSubscription(), getIsAdmin(), searchParams]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");
  const users = isAdmin ? await getUsersWithProgress() : [];
  const requested = isAdmin && sp.user && users.some((u) => u.userId === sp.user) ? sp.user : userId;
  const report = await levelReport(requested);
  const targetName = users.find((u) => u.userId === requested)?.userName ?? userProgress.userName;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress activeCourse={userProgress.activeCourse} hearts={userProgress.hearts} points={userProgress.points} gems={userProgress.gems} hasActiveSubscription={!!userSubscription?.isActive} />
      </StickyWrapper>
      <FeedWrapper>
        <div className="mb-4 text-center">
          <h1 className="text-xl font-extrabold text-neutral-800">
            레벨 테스트 결과
            {isAdmin && requested !== userId ? <span className="block text-sm font-semibold text-neutral-500">— {targetName}</span> : null}
          </h1>
        </div>
        <LevelView report={report} users={users.map((u) => ({ userId: u.userId, userName: u.userName, points: u.points }))} targetUserId={requested} targetName={targetName} isAdmin={isAdmin} />
      </FeedWrapper>
    </div>
  );
}
