import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { FeedWrapper } from "@/components/feed-wrapper";
import { Markdown } from "@/components/markdown";
import db from "@/db/drizzle";
import { getUserProgress } from "@/db/queries";
import { writingSubmissions } from "@/db/schema";
import { auth } from "@/lib/session";
import { getTask } from "@/lib/writing";
import { blanksOf, countChars } from "@/lib/writing-shared";

import { WritingEditor } from "./writing-editor";

const fmt = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });

// 과제 하나: 지시문, 편집기, 지금까지 낸 답안(최신순)과 각각의 점수·첨삭.
const WritingTaskPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const userId = (await auth.protect()).user.id;
  const [{ id }, userProgress] = await Promise.all([params, getUserProgress()]);
  if (!userProgress?.activeCourse) redirect("/courses");
  const course = userProgress.activeCourse.slug;
  const task = getTask(course, id);
  if (!course || !task) notFound();

  const mine = and(eq(writingSubmissions.userId, userId), eq(writingSubmissions.course, course), eq(writingSubmissions.promptId, id));
  const history = await db.select().from(writingSubmissions).where(mine).orderBy(desc(writingSubmissions.createdAt));
  // opening the task is reading its feedback: clear the "첨삭 도착" badge
  if (history.some((h) => h.score !== null && !h.seenAt)) {
    await db.update(writingSubmissions).set({ seenAt: new Date() }).where(and(mine, isNotNull(writingSubmissions.score), isNull(writingSubmissions.seenAt)));
  }
  const range = task.minChars || task.maxChars ? `${task.minChars ?? 0}~${task.maxChars ?? ""}자 (띄어쓰기 포함)` : null;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-4 sm:px-6">
      <FeedWrapper>
        <div className="mb-4 flex items-center gap-2">
          <Link href="/writing" prefetch aria-label="쓰기 과제 목록" className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-400 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {task.number !== undefined && <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-black text-violet-600">{task.number}번</span>}
          <h1 className="min-w-0 truncate text-lg font-black tracking-tight text-neutral-800">{task.title}</h1>
        </div>

        <section className="rounded-2xl border-2 border-slate-200 bg-white p-4">
          <Markdown>{task.prompt}</Markdown>
          <p className="mt-3 text-xs font-semibold text-neutral-400">{task.maxScore}점{range ? ` · ${range}` : ""}</p>
        </section>

        <WritingEditor course={course} taskId={task.id} blanks={blanksOf(task)} minChars={task.minChars ?? null} maxChars={task.maxChars ?? null} />

        {history.length > 0 && (
          <section className="mt-6 mb-10">
            <h2 className="mb-2 text-sm font-bold text-neutral-500">내 답안</h2>
            <ul className="flex flex-col gap-3">
              {history.map((h) => (
                <li key={h.id} className="rounded-2xl border-2 border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-neutral-400">
                    <span>{fmt.format(h.createdAt)} · {countChars(h.text)}자</span>
                    {h.score !== null ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-black text-green-700">{h.score} / {h.maxScore}</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">채점 대기</span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-800 [word-break:keep-all]">{h.text}</p>
                  {h.feedback && (
                    <div className="mt-3 rounded-xl bg-green-50 p-3">
                      <p className="mb-1 text-xs font-black text-green-700">첨삭</p>
                      <Markdown className="text-sm">{h.feedback}</Markdown>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </FeedWrapper>
    </div>
  );
};

export default WritingTaskPage;
