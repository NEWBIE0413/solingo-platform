import { auth } from "@/lib/session";
import Image from "next/image";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { Promo } from "@/components/promo";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { UserProgress } from "@/components/user-progress";
import { cn } from "@/lib/utils";
import {
  getTopTenUsers,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";
import { shopItem } from "@/lib/economy";
import { getWeeklyTop } from "@/lib/leaderboard";
import Link from "next/link";

const equippedRing = (frame?: string) => {
  const color = frame?.split("_")[1] ?? "";
  const map: Record<string, string> = {
    sky: "ring-2 ring-sky-400",
    rose: "ring-2 ring-rose-400",
    gold: "ring-2 ring-amber-400",
  };
  return map[color] ?? "";
};

const medal = (i: number) =>
  i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
const md = (day: string) =>
  `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

const LeaderboardPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) => {
  const session = await auth.protect();
  const { range } = await searchParams;
  const weekly = range !== "all";

  const [userProgress, userSubscription, allTime, week] = await Promise.all([
    getUserProgress(),
    getUserSubscription(),
    getTopTenUsers(),
    getWeeklyTop(),
  ]);

  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  const isPro = !!userSubscription?.isActive;
  const leaderboard = weekly
    ? week.rows
    : allTime.map((u) => ({ ...u, weekXp: 0 }));

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
            src="/leaderboard.svg"
            alt="Leaderboard"
            height={72}
            width={72}
            className="h-16 w-16 sm:h-20 sm:w-20"
          />

          <h1 className="mt-2 text-xl font-black tracking-tight text-neutral-800 lg:text-2xl">
            리더보드
          </h1>
          <p className="mb-3.5 mt-1 text-center text-xs text-muted-foreground lg:text-sm">
            {weekly
              ? `이번 주 (${md(week.start)} ~ ${md(week.end)}) · 매주 월요일 초기화`
              : "지금까지 모은 누적 XP 순위예요."}
          </p>

          <div className="mb-4 inline-flex rounded-2xl border-2 border-slate-200 bg-slate-100 p-1 shadow-inner">
            <Link
              href="/leaderboard"
              prefetch
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-black transition-all duration-150 active:scale-95",
                weekly
                  ? "border border-slate-200 bg-white text-neutral-800 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              이번 주
            </Link>
            <Link
              href="/leaderboard?range=all"
              prefetch
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-black transition-all duration-150 active:scale-95",
                !weekly
                  ? "border border-slate-200 bg-white text-neutral-800 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              전체
            </Link>
          </div>

          <div className="w-full space-y-2 pb-8">
            {leaderboard.map((userProgress, i) => {
              const isMe = userProgress.userId === session.user.id;
              const xp = weekly ? userProgress.weekXp : userProgress.points;
              return (
                <div
                  key={userProgress.userId}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 p-3 shadow-[0_2px_0_0_rgba(0,0,0,0.03)] transition-all sm:px-4",
                    isMe
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-200 bg-white hover:bg-slate-50/80"
                  )}
                >
                  <p className="w-7 flex-none text-center text-sm font-black text-neutral-600 sm:text-base">
                    {medal(i)}
                  </p>

                  <Avatar
                    className={cn(
                      "h-10 w-10 flex-none rounded-full border border-slate-200 bg-slate-100 shadow-inner",
                      equippedRing(
                        (userProgress.equipped as { frame?: string } | null)
                          ?.frame
                      )
                    )}
                  >
                    <AvatarImage
                      src={userProgress.userImageSrc}
                      className="object-cover"
                    />
                  </Avatar>

                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <p className="truncate text-sm font-bold tracking-tight text-neutral-800 sm:text-base">
                      {userProgress.userName}
                    </p>
                    {userProgress.equipped?.title && (
                      <span className="flex-none rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
                        {shopItem(userProgress.equipped.title)?.name}
                      </span>
                    )}
                  </div>
                  <span className="flex-none rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-black tabular-nums text-emerald-700">
                    {xp} XP
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </FeedWrapper>
    </div>
  );
};

export default LeaderboardPage;
