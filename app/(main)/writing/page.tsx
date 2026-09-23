import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ChevronRight } from "lucide-react";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import db from "@/db/drizzle";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import { writingSubmissions } from "@/db/schema";
import { auth } from "@/lib/session";
import { cn } from "@/lib/utils";
import { listTasks } from "@/lib/writing";

// 쓰기 과제 목록: 활성 코스의 과제를 작성자가 정한 순서대로, 과제마다 가장 최근 답안의 상태와 함께.
const WritingPage = async () => {
  const userId = (await auth.protect()).user.id;
  const [userProgress, userSubscription] = await Promise.all([getUserProgress(), getUserSubscription()]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  const course = userProgress.activeCourse.slug;
  const tasks = listTasks(course);
  const rows = course
    ? await db.select().from(writingSubmissions)
        .where(and(eq(writingSubmissions.userId, userId), eq(writingSubmissions.course, course)))
        .orderBy(desc(writingSubmissions.createdAt))
    : [];
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(r.promptId)) latest.set(r.promptId, r);

  return (
    <div className="flex flex-row-reverse gap-[48px] px-4 sm:px-6">
      <StickyWrapper>
        <UserProgress activeCourse={userProgress.activeCourse} hearts={userProgress.hearts} points={userProgress.points} gems={userProgress.gems} hasActiveSubscription={!!userSubscription?.isActive} />
      </StickyWrapper>
      <FeedWrapper>
        <div className="mb-4 flex w-full flex-col items-center text-center lg:mb-6">
          <h1 className="text-xl font-black tracking-tight text-neutral-800 lg:text-2xl">쓰기 과제</h1>
          <p className="mt-1 text-xs text-muted-foreground lg:text-sm">답안을 내면 채점과 첨삭이 여기로 돌아와요.</p>
        </div>

        {tasks.length === 0 ? (
          <p className="rounded-2xl border-2 border-slate-200 p-6 text-center text-sm text-muted-foreground">이 코스에는 쓰기 과제가 없어요.</p>
        ) : (
          <ul className="flex w-full flex-col gap-2">
            {tasks.map((t) => {
              const s = latest.get(t.id);
              const graded = s?.score !== null && s?.score !== undefined;
              const fresh = graded && !s?.seenAt;
              return (
                <li key={t.id}>
                  <Link href={`/writing/${t.id}`} prefetch className="group flex min-h-[60px] items-center gap-3 rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-3.5 py-2.5 transition-colors hover:bg-slate-50 active:translate-y-[2px] active:border-b-2">
                    {t.number !== undefined && <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-violet-100 text-sm font-black text-violet-600">{t.number}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-neutral-800">{t.title}</span>
                      <span className={cn("block text-xs font-semibold", !s ? "text-neutral-400" : graded ? "text-green-600" : "text-amber-600")}>
                        {!s ? `새 과제 · ${t.maxScore}점` : graded ? `${s.score} / ${s.maxScore}점` : "채점 대기 중"}
                      </span>
                    </span>
                    {fresh && <span className="flex-none rounded-full bg-green-500 px-2 py-0.5 text-[11px] font-black text-white">첨삭 도착</span>}
                    <ChevronRight className="h-4 w-4 flex-none text-neutral-300 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </FeedWrapper>
    </div>
  );
};

export default WritingPage;
