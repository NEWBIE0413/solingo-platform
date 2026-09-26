import { Flame, Gem, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CountUp } from "@/components/count-up";
import { getUserProgress } from "@/db/queries";
import { auth } from "@/lib/session";
import { getStreak } from "@/lib/streak";
import { cn } from "@/lib/utils";

// 폰 상단 지표(듀오링고식 흰 줄): 코스 아이콘 · 🔥연속 · 💎젬 · ⚡XP. 메뉴는 하단 탭이 맡으므로 햄버거는 없다.
// 데이터는 서버에서 읽는다 — 지표가 헤더이므로 매 페이지 로드마다 최신값이 나온다.
export const MobileHeader = async () => {
  const { userId } = await auth();
  const [progress, streak] = userId
    ? await Promise.all([getUserProgress(), getStreak(userId)])
    : [null, null];
  const course = progress?.activeCourse;
  const days = streak?.current ?? 0;

  return (
    <nav className="fixed top-0 z-50 flex h-[50px] w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md lg:hidden">
      {course ? (
        <Link
          href="/courses"
          prefetch
          aria-label="코스 바꾸기"
          className="flex h-11 items-center transition-transform active:scale-95 motion-reduce:active:scale-100"
        >
          <Image
            src={course.imageSrc}
            alt={course.title}
            className="rounded-lg border border-slate-200 shadow-sm"
            height={28}
            width={28}
          />
        </Link>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        <Link
          href="/streak"
          prefetch
          className={cn(
            "flex h-11 items-center gap-1.5 text-sm font-extrabold transition-transform active:scale-95 motion-reduce:active:scale-100",
            days > 0 ? "text-orange-500" : "text-neutral-400"
          )}
          title={`연속 출석 ${days}일`}
        >
          <Flame
            className={cn(
              "h-5 w-5",
              days > 0
                ? "fill-orange-400 text-orange-500"
                : "fill-neutral-300 text-neutral-300"
            )}
            strokeWidth={2.5}
          />
          <CountUp value={days} storageKey="hdr-streak" />
        </Link>
        <Link
          href="/shop"
          prefetch
          className="flex h-11 items-center gap-1.5 text-sm font-extrabold text-sky-500 transition-transform active:scale-95 motion-reduce:active:scale-100"
          title={`젬 ${progress?.gems ?? 0}`}
        >
          <Gem
            className="h-5 w-5 fill-sky-300 text-sky-500"
            strokeWidth={2.5}
          />
          <CountUp value={progress?.gems ?? 0} storageKey="hdr-gems" />
        </Link>
        <Link
          href="/leaderboard"
          prefetch
          className="flex h-11 items-center gap-1.5 text-sm font-extrabold text-amber-500 transition-transform active:scale-95 motion-reduce:active:scale-100"
          title={`XP ${progress?.points ?? 0}`}
        >
          <Zap
            className="h-5 w-5 fill-amber-300 text-amber-500"
            strokeWidth={2.5}
          />
          <CountUp value={progress?.points ?? 0} storageKey="hdr-xp" />
        </Link>
      </div>
    </nav>
  );
};
