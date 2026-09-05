import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getQuestBoard } from "@/lib/economy";
import { getCourseProgress, getUserProgress, getUserSubscription } from "@/db/queries";
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
  const onlyCourseKana = courseTitle.includes("가나") || courseTitle.includes("JLPT");

  const board = await getQuestBoard(userId, onlyCourseKana);

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
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
          <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">
            퀘스트
          </h1>
          <p className="mb-6 text-center text-lg text-muted-foreground">
            매일 새로고침돼요. 달성하면 젬을 받아가세요.
          </p>

          {/* plain data only: QuestDef carries a progress() function, which a client component cannot receive */}
          <QuestList
            quests={board.quests.map(({ key, name, hint, gems, oneOff, goal, have, claimed, done }) => ({ key, name, hint, gems, oneOff, goal, have, claimed, done }))}
            initialGems={userProgress.gems}
          />
        </div>
      </FeedWrapper>
    </div>
  );
};

export default QuestsPage;
