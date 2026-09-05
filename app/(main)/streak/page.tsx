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

const StreakPage = async () => {
  const { userId } = await auth.protect().then((s) => ({ userId: s.user.id }));
  const [userProgress, userSubscription, mine, couple] = await Promise.all([getUserProgress(), getUserSubscription(), getStreak(userId), getCoupleStatus(userId)]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");
  const isPro = !!userSubscription?.isActive;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress activeCourse={userProgress.activeCourse} hearts={userProgress.hearts} points={userProgress.points} gems={userProgress.gems} hasActiveSubscription={isPro} />
        {!isPro && <Promo />}
      </StickyWrapper>

      <FeedWrapper>
        <div className="flex w-full flex-col items-center">
          <Image src="/quests.svg" alt="출석" height={90} width={90} />
          <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">출석</h1>
          <p className="mb-6 text-center text-lg text-muted-foreground">하루에 레슨 하나만 끝내면 출석이에요. 히라가나 세션도 인정됩니다.</p>

          <div className="mb-6 grid w-full grid-cols-2 gap-4">
            <div className={`rounded-2xl border-2 p-5 text-center ${mine.todayDone ? "border-orange-400 bg-orange-50" : "border-slate-200"}`}>
              <div className="text-4xl">🔥</div>
              <div className="mt-1 text-3xl font-extrabold text-orange-500">{mine.current}<span className="ml-1 text-base font-bold text-neutral-500">일</span></div>
              <div className="text-sm font-bold text-neutral-600">내 연속 출석</div>
              <div className="mt-1 text-xs text-muted-foreground">{mine.todayDone ? "오늘 출석 완료" : "오늘 아직이에요"} · 최고 {mine.longest}일</div>
            </div>
            <div className={`rounded-2xl border-2 p-5 text-center ${couple?.partner ? (couple.streak.todayDone ? "border-rose-400 bg-rose-50" : "border-slate-200") : "border-dashed border-slate-300"}`}>
              <div className="text-4xl">💞</div>
              <div className="mt-1 text-3xl font-extrabold text-rose-500">{couple?.partner ? couple.streak.current : "–"}<span className="ml-1 text-base font-bold text-neutral-500">일</span></div>
              <div className="text-sm font-bold text-neutral-600">커플 연속 출석</div>
              <div className="mt-1 text-xs text-muted-foreground">{couple?.partner ? `${couple.streak.todayDone ? "오늘 둘 다 출석" : couple.partnerTodayDone ? "상대는 했어요, 내 차례" : mine.todayDone ? "상대를 기다리는 중" : "둘 다 아직"} · 최고 ${couple.streak.longest}일` : "아직 연결 안 됨"}</div>
            </div>
          </div>

          <CoupleCard couple={couple} />
        </div>
      </FeedWrapper>
    </div>
  );
};

export default StreakPage;
