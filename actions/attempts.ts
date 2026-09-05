"use server";

import { and, eq } from "drizzle-orm";

import { MAX_HEARTS } from "@/constants";
import db from "@/db/drizzle";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import { challengeAttempts, challengeProgress, userProgress } from "@/db/schema";
import { auth } from "@/lib/session";
import { recordActivity } from "@/lib/streak";

/*
 One round trip per answer: log the attempt and persist progress/hearts together.
 The client already knows whether the answer was right and shows the verdict immediately,
 so this runs in the background — it must never be awaited before painting.

 No revalidatePath here on purpose. Revalidating /learn, /quests and /leaderboard on every
 single answer re-rendered the whole lesson route mid-lesson (~650ms of dead time per item).
 The lesson-completion action revalidates those paths once instead.
*/
export const submitAnswer = async (
  challengeId: number,
  correct: boolean,
  practice = false
): Promise<{ error?: "hearts" }> => {
  const { userId } = await auth();
  if (!userId) return {};

  await db.insert(challengeAttempts).values({ userId, challengeId, correct });
  if (practice) return {};

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
        .set({ hearts: Math.min(progress.hearts + 1, MAX_HEARTS), points: progress.points + 10 })
        .where(eq(userProgress.userId, userId));
      await recordActivity(userId, "xp", 10);
      return {};
    }

    await db.insert(challengeProgress).values({ challengeId, userId, completed: true });
    await db.update(userProgress).set({ points: progress.points + 10 }).where(eq(userProgress.userId, userId));
    await recordActivity(userId, "xp", 10);
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
