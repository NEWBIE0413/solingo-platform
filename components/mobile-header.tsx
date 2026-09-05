import { Flame, Gem } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getUserProgress } from "@/db/queries";
import { auth } from "@/lib/session";
import { getStreak } from "@/lib/streak";
import { cn } from "@/lib/utils";

import { MobileSidebar } from "./mobile-sidebar";

// 폰 상단 지표: 코스 아이콘 · 🔥연속 · 💎젬을 항상 눈에 띄게 (듀오링고식).
// 데이터는 서버에서 읽는다 — 지표가 헤더이므로 매 페이지 로드마다 최신값이 나온다.
export const MobileHeader = async () => {
  const { userId } = await auth();
  const [progress, streak] = userId
    ? await Promise.all([getUserProgress(), getStreak(userId)])
    : [null, null];
  const course = progress?.activeCourse;
  const days = streak?.current ?? 0;

  return (
    <nav className="fixed top-0 z-50 flex h-[50px] w-full items-center justify-between border-b bg-green-500 px-4 lg:hidden">
      <MobileSidebar />
      <div className="flex items-center gap-5">
        {course && (
          <Link href="/courses" prefetch aria-label="코스 바꾸기" className="flex h-11 items-center">
            <Image src={course.imageSrc} alt={course.title} className="rounded-md border-2" height={28} width={28} />
          </Link>
        )}
        <span className="flex h-11 items-center gap-0.5 font-extrabold text-white" title={`연속 출석 ${days}일`}>
          <Flame
            className={cn("h-6 w-6", days > 0 ? "fill-orange-400 text-orange-400" : "fill-white/40 text-white/40")}
            strokeWidth={2.5}
          />
          {days}
        </span>
        <span className="flex h-11 items-center gap-0.5 font-extrabold text-white" title={`젬 ${progress?.gems ?? 0}`}>
          <Gem className="h-6 w-6 fill-sky-200 text-sky-200" strokeWidth={2.5} />
          {progress?.gems ?? 0}
        </span>
      </div>
    </nav>
  );
};
