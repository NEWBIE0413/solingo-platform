import { auth } from "@/lib/session";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { Promo } from "@/components/promo";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import {
  getCourseProgress,
  getLessonPercentage,
  getUnits,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";

import { KANA_TRAINER_TITLE } from "@/constants";

import { Header } from "./header";
import { KanaHome } from "./kana-home";
import { LearnExtras } from "./learn-extras";
import { Unit } from "./unit";

const LearnPage = async ({ searchParams }: { searchParams: Promise<{ done?: string }> }) => {
  await auth.protect();
  const { done } = await searchParams;

  const userProgressData = getUserProgress();
  const courseProgressData = getCourseProgress();
  const lessonPercentageData = getLessonPercentage();
  const unitsData = getUnits();
  const userSubscriptionData = getUserSubscription();

  const [
    userProgress,
    units,
    courseProgress,
    lessonPercentage,
    userSubscription,
  ] = await Promise.all([
    userProgressData,
    unitsData,
    courseProgressData,
    lessonPercentageData,
    userSubscriptionData,
  ]);

  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  const isPro = !!userSubscription?.isActive;

  // 히라가나 훈련 has no units: it runs full-screen at /trainer, like a lesson does.
  // 히라가나 훈련 has no units: the kana engine's own home takes the path's place (see kana-home.tsx)
  if (userProgress.activeCourse.title === KANA_TRAINER_TITLE) return <KanaHome />;

  if (!courseProgress) redirect("/courses");

  // Back from a first completion (/learn?done=<lesson>): that node fills and, if the next lesson in
  // path order is now the active one, it opens (lesson-button.tsx).
  const path = units.flatMap((u) => u.lessons);
  const at = path.findIndex((l) => l.id === Number(done));
  const justDone = at >= 0 ? path[at].id : undefined;
  const opened = at >= 0 && path[at + 1]?.id === courseProgress.activeLesson?.id ? path[at + 1].id : undefined;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-4 sm:px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          gems={userProgress.gems}
          hasActiveSubscription={isPro}
        />

        {!isPro && <Promo />}
      </StickyWrapper>
      <FeedWrapper>
        <div className="hidden lg:block">
          <Header title={userProgress.activeCourse.title} />
        </div>
        <LearnExtras />
        {units.map((unit) => (
          <div key={unit.id} className="mb-8 lg:mb-10">
            <Unit
              id={unit.id}
              order={unit.order}
              description={unit.description}
              title={unit.title}
              lessons={unit.lessons}
              activeLesson={courseProgress.activeLesson}
              activeLessonPercentage={lessonPercentage}
              justDone={justDone}
              opened={opened}
            />
          </div>
        ))}
      </FeedWrapper>
    </div>
  );
};

export default LearnPage;
