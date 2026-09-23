"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/session";
import { getQuestBoard } from "@/lib/economy";
import { createCouple, getStreak, joinCouple, leaveCouple, recordActivity, todayGoal } from "@/lib/streak";
import { DAILY_GOAL_OPTIONS } from "@/constants";
import db from "@/db/drizzle";
import { userProgress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncAchievements } from "@/lib/achievements";

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
  const [streak, board, ach, goal] = await Promise.all([getStreak(userId), getQuestBoard(userId, true), syncAchievements(userId), todayGoal(userId)]);
  revalidatePath("/streak");
  revalidatePath("/learn");
  revalidatePath("/quests");
  revalidatePath("/leaderboard");
  revalidatePath("/shop");
  revalidatePath("/profile");
  // the end screen celebrates with these: first lesson of the day → streak moment; done-but-unclaimed quests → nudge;
  // achievements crossed by this session → badge moment
  return {
    streak: streak.current,
    firstToday,
    claimable: board.quests.filter((q) => q.done && !q.claimed).length,
    achievements: ach.fresh.map(({ key, name, desc, emoji }) => ({ key, name, desc, emoji })),
    goal, // { done, goal } after this session — the end screen says how many are left, or that it's met
  };
};

export const setDailyGoalAction = async (goal: number) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");
  if (!(DAILY_GOAL_OPTIONS as readonly number[]).includes(goal)) return { error: "고를 수 없는 목표예요." };
  await db.update(userProgress).set({ dailyGoal: goal }).where(eq(userProgress.userId, userId));
  revalidatePath("/streak");
  return { ok: true };
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
