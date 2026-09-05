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
  const map: Record<string, string> = { sky: "ring-2 ring-sky-400", rose: "ring-2 ring-rose-400", gold: "ring-2 ring-amber-400" };
  return map[color] ?? "";
};

const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1));
const md = (day: string) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

const LeaderboardPage = async ({ searchParams }: { searchParams: Promise<{ range?: string }> }) => {
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
  const leaderboard = weekly ? week.rows : allTime.map((u) => ({ ...u, weekXp: 0 }));

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
        <div className="flex w-full flex-col items-center">
          <Image
            src="/leaderboard.svg"
            alt="Leaderboard"
            height={90}
            width={90}
          />

          <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">
            리더보드
          </h1>
          <p className="mb-4 text-center text-lg text-muted-foreground">
            {weekly ? `이번 주 (${md(week.start)} ~ ${md(week.end)}) · 월요일마다 새로 시작해요` : "지금까지 모은 XP 순위예요."}
          </p>

          <div className="mb-5 inline-flex rounded-xl border-2 border-slate-200 p-1">
            <Link href="/leaderboard" prefetch className={cn("rounded-lg px-4 py-1.5 text-sm font-bold", weekly ? "bg-green-500 text-white" : "text-neutral-500")}>이번 주</Link>
            <Link href="/leaderboard?range=all" prefetch className={cn("rounded-lg px-4 py-1.5 text-sm font-bold", !weekly ? "bg-green-500 text-white" : "text-neutral-500")}>전체</Link>
          </div>

          <Separator className="mb-4 h-0.5 rounded-full" />
          {leaderboard.map((userProgress, i) => (
            <div
              key={userProgress.userId}
              className={cn("flex w-full items-center rounded-xl p-2 px-4 hover:bg-gray-200/50", userProgress.userId === session.user.id && "bg-green-50 ring-1 ring-green-200")}
            >
              <p className="mr-4 w-7 text-center text-lg font-bold text-lime-700">{medal(i)}</p>

              <Avatar className={cn("ml-3 mr-6 h-12 w-12 border bg-green-500", equippedRing((userProgress.equipped as { frame?: string } | null)?.frame))}>
                <AvatarImage
                  src={userProgress.userImageSrc}
                  className="object-cover"
                />
              </Avatar>

              <p className="flex-1 font-bold text-neutral-800">
                {userProgress.userName}
                {userProgress.equipped?.title && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {shopItem(userProgress.equipped.title)?.name}
                  </span>
                )}
              </p>
              <p className="font-semibold tabular-nums text-muted-foreground">{weekly ? userProgress.weekXp : userProgress.points} XP</p>
            </div>
          ))}
        </div>
      </FeedWrapper>
    </div>
  );
};

export default LeaderboardPage;
