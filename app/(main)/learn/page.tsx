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
import { LearnExtras } from "./learn-extras";
import { Unit } from "./unit";

const LearnPage = async () => {
  await auth.protect();

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

  // 히라가나 훈련 is a course without units: 학습 becomes the Solingo kana engine.
  if (userProgress.activeCourse.title === KANA_TRAINER_TITLE) {
    return (
      // The engine owns the whole area between the header and the bottom tabs: one fixed box, so
      // nothing overlaps and the only scrolling happens inside the engine. embed=1 hides its own
      // stat row — the platform header already shows streak/gems, and two stat bars looked like a bug.
      <div className="fixed inset-x-0 top-[50px] bottom-[calc(58px+env(safe-area-inset-bottom))] bg-white lg:left-[256px] lg:top-0 lg:bottom-0">
        <iframe src="/kana/index.html?course=ja-kana&embed=1" title="히라가나 훈련" className="h-full w-full border-0" allow="microphone; autoplay" />
      </div>
    );
  }

  if (!courseProgress) redirect("/courses");

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
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
        <Header title={userProgress.activeCourse.title} />
        <LearnExtras />
        {units.map((unit) => (
          <div key={unit.id} className="mb-10">
            <Unit
              id={unit.id}
              order={unit.order}
              description={unit.description}
              title={unit.title}
              lessons={unit.lessons}
              activeLesson={courseProgress.activeLesson}
              activeLessonPercentage={lessonPercentage}
            />
          </div>
        ))}
      </FeedWrapper>
    </div>
  );
};

export default LearnPage;
