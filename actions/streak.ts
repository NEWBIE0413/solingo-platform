"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/session";
import { getQuestBoard } from "@/lib/economy";
import { createCouple, getStreak, joinCouple, leaveCouple, recordActivity } from "@/lib/streak";

/*
 Called once when a lesson, a practice round, or a 히라가나 session is completed. This is also
 where those writes become visible elsewhere: per-answer actions skip revalidation to keep
 answering instant, so the paths that show points/hearts/streak are refreshed here.
 The kind routes the daily_activity counter — "lesson" fills lessons, "practice"/"kana"
 fill their own quest counters. XP was already credited per-answer in submitAnswer.
*/
export const recordLessonComplete = async (kind: "lesson" | "practice" | "kana" = "lesson") => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");
  const { firstToday } = await recordActivity(userId, kind);
  const [streak, board] = await Promise.all([getStreak(userId), getQuestBoard(userId, true)]);
  revalidatePath("/streak");
  revalidatePath("/learn");
  revalidatePath("/quests");
  revalidatePath("/leaderboard");
  revalidatePath("/shop");
  // the end screen celebrates with these: first lesson of the day → streak moment; done-but-unclaimed quests → nudge
  return { streak: streak.current, firstToday, claimable: board.quests.filter((q) => q.done && !q.claimed).length };
};

export const createCoupleAction = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");
  const c = await createCouple(userId);
  revalidatePath("/streak");
  return { code: c.code };
};

export const joinCoupleAction = async (code: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");
  try { await joinCouple(userId, code); } catch (e) { return { error: (e as Error).message }; }
  revalidatePath("/streak");
  return { ok: true };
};

export const leaveCoupleAction = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");
  await leaveCouple(userId);
  revalidatePath("/streak");
};
