import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getQuestBoard } from "@/lib/economy";
import {
  getCourseProgress,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";
import { auth } from "@/lib/session";

import { QuestList } from "./quest-list";

const QuestsPage = async () => {
  const { userId } = await auth.protect().then((s) => ({ userId: s.user.id }));

  const [userProgress, userSubscription] = await Promise.all([
    getUserProgress(),
    getUserSubscription(),
  ]);

  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  // 가나 훈련 퀘스트는 일본어 코스(가나·JLPT) 사용자에게만 노출된다.
  const courseTitle = userProgress.activeCourse.title;
  const onlyCourseKana =
    courseTitle.includes("가나") || courseTitle.includes("JLPT");

  const board = await getQuestBoard(userId, onlyCourseKana);

  return (
    <div className="flex flex-row-reverse gap-[48px] px-4 sm:px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          gems={userProgress.gems}
          hasActiveSubscription={!!userSubscription?.isActive}
        />
      </StickyWrapper>

      <FeedWrapper>
        <div className="flex w-full flex-col items-center">
          <div className="mb-4 flex w-full flex-col items-center text-center lg:mb-6">
            <h1 className="text-xl font-black tracking-tight text-neutral-800 lg:text-2xl">
              퀘스트
            </h1>
            <p className="mt-1 text-xs text-muted-foreground lg:text-sm">
              매일 새로고침돼요. 달성하면 젬을 받아가세요.
            </p>
          </div>

          <QuestList
            quests={board.quests}
            initialGems={userProgress.gems}
          />
        </div>
      </FeedWrapper>
    </div>
  );
};

export default QuestsPage;
