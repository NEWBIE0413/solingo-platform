"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/session";
import { getQuestBoard, questViews } from "@/lib/economy";
import { createCouple, getStreak, joinCouple, leaveCouple, recordActivity, todayGoal, weekDays } from "@/lib/streak";
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
  const [streak, board, ach, goal, week] = await Promise.all([getStreak(userId), getQuestBoard(userId, true), syncAchievements(userId), todayGoal(userId), weekDays(userId)]);
  revalidatePath("/streak");
  revalidatePath("/learn");
  revalidatePath("/quests");
  revalidatePath("/leaderboard");
  revalidatePath("/shop");
  revalidatePath("/profile");
  // The lesson-end steps (app/lesson/reward-steps.tsx) are built from these: first session of the day → streak step
  // with this week's calendar; quests that moved since the lesson began (questSnapshot) → quest step, claimable in
  // place; achievements crossed by this session → badge step.
  return {
    streak: streak.current,
    firstToday,
    week,
    quests: questViews(board.quests),
    achievements: ach.fresh.map(({ key, name, desc, emoji }) => ({ key, name, desc, emoji })),
    goal, // { done, goal } after this session
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
