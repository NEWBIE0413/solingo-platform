"use server";

import { and, eq, inArray, sql } from "drizzle-orm";

import { MAX_HEARTS } from "@/constants";
import db from "@/db/drizzle";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import { challengeAttempts, challengeProgress, challenges, userProgress } from "@/db/schema";
import { auth } from "@/lib/session";
import { recordActivity } from "@/lib/streak";
import { answerXp } from "@/lib/xp";

/*
 One round trip per answer: log the attempt and persist progress/hearts together.
 The client already knows whether the answer was right and shows the verdict immediately,
 so this runs in the background — it must never be awaited before painting.

 No revalidatePath here on purpose. Revalidating /learn, /quests and /leaderboard on every
 single answer re-rendered the whole lesson route mid-lesson (~650ms of dead time per item).
 The lesson-completion action revalidates those paths once instead.

 XP follows lib/xp.ts. `recovered` (missed earlier in this run) comes from the client, which is
 the only side that knows the run; trusted, like the rest of a two-learner instance — if that
 ever matters, derive it from this run's attempts instead.
*/
const credit = async (userId: string, xp: number) => {
  await db.update(userProgress).set({ points: sql`${userProgress.points} + ${xp}` }).where(eq(userProgress.userId, userId));
  await recordActivity(userId, "xp", xp);
};

export const submitAnswer = async (
  challengeId: number,
  correct: boolean,
  practice = false,
  recovered = false
): Promise<{ error?: "hearts" }> => {
  const { userId } = await auth();
  if (!userId) return {};

  await db.insert(challengeAttempts).values({ userId, challengeId, correct });
  if (practice) {
    // review pays: it used to log the attempt and credit nothing while the summary showed XP
    if (correct) await credit(userId, answerXp({ practice: true, recovered, replay: false }));
    return {};
  }

  const [progress, subscription] = await Promise.all([getUserProgress(), getUserSubscription()]);
  if (!progress) return {};

  const existing = await db.query.challengeProgress.findFirst({
    where: and(eq(challengeProgress.userId, userId), eq(challengeProgress.challengeId, challengeId)),
  });
  const isRetry = !!existing;

  if (correct) {
    if (progress.hearts === 0 && !isRetry && !subscription?.isActive) return { error: "hearts" };

    if (isRetry) {
      await db.update(challengeProgress).set({ completed: true }).where(eq(challengeProgress.id, existing.id));
      await db
        .update(userProgress)
        .set({ hearts: Math.min(progress.hearts + 1, MAX_HEARTS) })
        .where(eq(userProgress.userId, userId));
      await credit(userId, answerXp({ practice: false, recovered, replay: true }));
      return {};
    }

    await db.insert(challengeProgress).values({ challengeId, userId, completed: true });
    await credit(userId, answerXp({ practice: false, recovered, replay: false }));
    return {};
  }

  // wrong: retries and pro accounts keep their hearts
  if (isRetry || subscription?.isActive) return {};
  if (progress.hearts === 0) return { error: "hearts" };
  await db
    .update(userProgress)
    .set({ hearts: Math.max(progress.hearts - 1, 0) })
    .where(eq(userProgress.userId, userId));
  return {};
};

/*
 Reaching the end of a lesson completes it. Items answered wrong three times still count
 as seen — the learner went through everything, and the attempts log already feeds those
 items into 약점 복습. Without this the path kept saying "0/6" after a finished lesson.
*/
export const completeLesson = async (lessonId: number) => {
  const { userId } = await auth();
  if (!userId) return;
  const rows = await db.query.challenges.findMany({
    where: eq(challenges.lessonId, lessonId),
    columns: { id: true },
    with: { challengeProgress: { where: eq(challengeProgress.userId, userId), columns: { id: true, completed: true } } },
  });
  const missing = rows.filter((c) => !c.challengeProgress.length).map((c) => ({ userId, challengeId: c.id, completed: true }));
  const stale = rows.flatMap((c) => c.challengeProgress.filter((p) => !p.completed).map((p) => p.id));
  if (missing.length) await db.insert(challengeProgress).values(missing);
  if (stale.length) await db.update(challengeProgress).set({ completed: true }).where(inArray(challengeProgress.id, stale));
};

