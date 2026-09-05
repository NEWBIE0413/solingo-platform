import { redirect } from "next/navigation";

import { eq } from "drizzle-orm";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getUsersWithProgress, getUserProgress, getUserSubscription } from "@/db/queries";
import db from "@/db/drizzle";
import { challengeProgress, userItems, user } from "@/db/schema";
import { getIsAdmin } from "@/lib/admin";
import { levelReport } from "@/lib/level";
import { auth } from "@/lib/session";
import { getCoupleStatus, getStreak } from "@/lib/streak";

import { ProfileView } from "./profile-view";

const ProfilePage = async ({ searchParams }: { searchParams: Promise<{ user?: string }> }) => {
  const s = await auth.protect();
  const userId = s.user.id;

  const [userProgress, userSubscription, isAdmin, sp] = await Promise.all([
    getUserProgress(),
    getUserSubscription(),
    getIsAdmin(),
    searchParams,
  ]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  // 관리자만 다른 학습자의 프로필(레벨 결과 포함)을 열람한다.
  const users = isAdmin ? await getUsersWithProgress() : [];
  const requested = isAdmin && sp.user && users.some((u) => u.userId === sp.user) ? sp.user : userId;
  const viewingOther = requested !== userId;

  const [ownedRows, streak, couple, report, completedRows] = await Promise.all([
    db.select().from(userItems).where(eq(userItems.userId, requested)),
    getStreak(requested),
    viewingOther ? Promise.resolve(null) : getCoupleStatus(userId),
    levelReport(requested),
    db.select({ id: challengeProgress.id }).from(challengeProgress).where(eq(challengeProgress.userId, requested)),
  ]);
  const owned = Object.fromEntries(ownedRows.map((r) => [r.itemKey, r.qty]));
  const userRow = await db.query.user.findFirst({ where: eq(user.id, requested), columns: { createdAt: true } });
  const createdLabel = userRow?.createdAt ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(userRow.createdAt) : "—";

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress activeCourse={userProgress.activeCourse} hearts={userProgress.hearts} points={userProgress.points} gems={userProgress.gems} hasActiveSubscription={!!userSubscription?.isActive} />
      </StickyWrapper>
      <FeedWrapper>
        <ProfileView
          selfUserId={userId}
          targetUserId={requested}
          targetName={users.find((u) => u.userId === requested)?.userName ?? userProgress.userName}
          imageSrc={userProgress.userImageSrc}
          points={userProgress.points}
          gems={userProgress.gems}
          equipped={userProgress.equipped ?? {}}
          owned={owned}
          streak={streak}
          couple={couple}
          isAdmin={isAdmin}
          report={report}
          users={users.map((u) => ({ userId: u.userId, userName: u.userName, points: u.points }))}
          createdLabel={createdLabel}
          completedLessons={completedRows.length}
        />
      </FeedWrapper>
    </div>
  );
};

export default ProfilePage;
