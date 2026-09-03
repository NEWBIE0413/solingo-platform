"use server";

import db from "@/db/drizzle";
import { challengeAttempts } from "@/db/schema";
import { auth } from "@/lib/session";

/** Log one answer. Fire-and-forget from the lesson runner; never blocks the UI. */
export const recordAttempt = async (challengeId: number, correct: boolean) => {
  const { userId } = await auth();
  if (!userId) return;
  await db.insert(challengeAttempts).values({ userId, challengeId, correct });
};
