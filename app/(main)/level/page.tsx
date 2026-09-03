import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import { levelReport } from "@/lib/level";
import { auth } from "@/lib/session";

const Bar = ({ pct }: { pct: number | null }) => (
  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
    <div className={`h-full ${pct === null ? "bg-slate-200" : pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-orange-400" : "bg-rose-500"}`} style={{ width: `${pct ?? 0}%` }} />
  </div>
);

const LevelPage = async () => {
  const s = await auth.protect();
  const [userProgress, userSubscription, report] = await Promise.all([getUserProgress(), getUserSubscription(), levelReport(s.user.id)]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress activeCourse={userProgress.activeCourse} hearts={userProgress.hearts} points={userProgress.points} hasActiveSubscription={!!userSubscription?.isActive} />
      </StickyWrapper>
      <FeedWrapper>
        <div className="flex w-full flex-col items-center">
          <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">레벨 테스트 결과</h1>
          {!report ? (
            <p className="text-center text-muted-foreground">한국어 TOPIK 코스의 레벨 테스트가 아직 없어요.</p>
          ) : (
            <>
              <p className="mb-6 text-center text-lg text-muted-foreground">
                {report.answered} / {report.total} 문항 응답 · 첫 시도 기준
                {report.answered < report.total && <span className="block text-sm">코스에서 "레벨 테스트" 유닛을 끝까지 풀면 결과가 채워져요.</span>}
              </p>
              <div className="w-full rounded-2xl border-2 border-slate-200 p-5">
                <h2 className="mb-3 text-lg font-bold text-neutral-700">급수별</h2>
                <div className="flex flex-col gap-3">
                  {report.byLevel.map((g) => (
                    <div key={String(g.key)}>
                      <div className="mb-1 flex justify-between text-sm font-bold text-neutral-600"><span>{g.key}급</span><span>{g.pct === null ? "–" : `${g.pct}%`} <span className="font-normal text-muted-foreground">({g.ok}/{g.answered})</span></span></div>
                      <Bar pct={g.pct} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 w-full rounded-2xl border-2 border-slate-200 p-5">
                <h2 className="mb-3 text-lg font-bold text-neutral-700">영역별</h2>
                <div className="flex flex-col gap-3">
                  {report.byTag.map((g) => (
                    <div key={String(g.key)}>
                      <div className="mb-1 flex justify-between text-sm font-bold text-neutral-600"><span>{g.key}</span><span>{g.pct === null ? "–" : `${g.pct}%`} <span className="font-normal text-muted-foreground">({g.ok}/{g.answered})</span></span></div>
                      <Bar pct={g.pct} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </FeedWrapper>
    </div>
  );
};

export default LevelPage;
