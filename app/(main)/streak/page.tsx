import Image from "next/image";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { Promo } from "@/components/promo";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import { auth } from "@/lib/session";
import { getCoupleStatus, getStreak } from "@/lib/streak";

import { CoupleCard } from "./couple-card";
import { WeekCalendar } from "./week";

const StreakPage = async () => {
  const { userId } = await auth.protect().then((s) => ({ userId: s.user.id }));
  const [userProgress, userSubscription, mine, couple] = await Promise.all([
    getUserProgress(),
    getUserSubscription(),
    getStreak(userId),
    getCoupleStatus(userId),
  ]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");
  const isPro = !!userSubscription?.isActive;

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
        <div className="flex w-full flex-col items-center">
          <Image
            src="/quests.svg"
            alt="출석"
            height={72}
            width={72}
            className="h-16 w-16 sm:h-20 sm:w-20"
          />
          <h1 className="mt-2 text-xl font-black tracking-tight text-neutral-800 lg:text-2xl">
            출석
          </h1>
          <p className="mb-4 mt-1 text-center text-xs text-muted-foreground lg:text-sm">
            하루에 레슨 하나만 끝내면 출석이에요. 히라가나 세션도 인정됩니다.
          </p>

          <WeekCalendar userId={userId} />

          <div className="mb-4 grid w-full grid-cols-2 gap-3 sm:gap-4">
            <div
              className={`rounded-2xl border-2 p-3.5 text-center shadow-[0_2px_0_0_rgba(0,0,0,0.03)] sm:p-5 ${
                mine.todayDone
                  ? "border-orange-400 bg-orange-50/60"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="text-3xl">🔥</div>
              <div className="mt-1 text-3xl font-black text-orange-500 sm:text-4xl">
                {mine.current}
                <span className="ml-1 text-sm font-bold text-neutral-500">
                  일
                </span>
              </div>
              <div className="mt-0.5 text-xs font-bold text-neutral-700 sm:text-sm">
                내 연속 출석
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {mine.todayDone ? "오늘 출석 완료" : "오늘 아직이에요"} · 최고{" "}
                {mine.longest}일
              </div>
            </div>
            <div
              className={`rounded-2xl border-2 p-3.5 text-center shadow-[0_2px_0_0_rgba(0,0,0,0.03)] sm:p-5 ${
                couple?.partner
                  ? couple.streak.todayDone
                    ? "border-rose-400 bg-rose-50/60"
                    : "border-slate-200 bg-white"
                  : "border-dashed border-slate-300 bg-slate-50/40"
              }`}
            >
              <div className="text-3xl">💞</div>
              <div className="mt-1 text-3xl font-black text-rose-500 sm:text-4xl">
                {couple?.partner ? couple.streak.current : "–"}
                <span className="ml-1 text-sm font-bold text-neutral-500">
                  일
                </span>
              </div>
              <div className="mt-0.5 text-xs font-bold text-neutral-700 sm:text-sm">
                커플 연속 출석
              </div>
              <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                {couple?.partner
                  ? `${
                      couple.streak.todayDone
                        ? "오늘 둘 다 출석"
                        : couple.partnerTodayDone
                          ? "상대는 완료, 내 차례"
                          : mine.todayDone
                            ? "상대 기다리는 중"
                            : "둘 다 아직"
                    } · 최고 ${couple.streak.longest}일`
                  : "아직 연결 안 됨"}
              </div>
            </div>
          </div>

          <CoupleCard couple={couple} />
        </div>
      </FeedWrapper>
    </div>
  );
};

export default StreakPage;
