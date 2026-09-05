import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { dailyActivity, userProgress } from "@/db/schema";
import { dayKey } from "@/lib/streak";

/*
 Weekly XP board. With a handful of learners an all-time board freezes into a fixed order
 within days and stops meaning anything; a Monday reset (Duolingo's league week) gives
 everyone a fresh race every seven days. Weekly XP is the sum of daily_activity.xp, which
 submitAnswer and the kana engine credit per answer.
*/
export function weekBounds(today = dayKey()) {
  const d = new Date(today + "T00:00:00Z");
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  const start = new Date(d); start.setUTCDate(d.getUTCDate() - sinceMonday);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export async function getWeeklyTop(limit = 10) {
  const { start, end } = weekBounds();
  const weekXp = sql<number>`coalesce(sum(${dailyActivity.xp}), 0)::int`;
  const rows = await db
    .select({
      userId: userProgress.userId,
      userName: userProgress.userName,
      userImageSrc: userProgress.userImageSrc,
      equipped: userProgress.equipped,
      points: userProgress.points,
      weekXp,
    })
    .from(userProgress)
    .leftJoin(dailyActivity, and(eq(dailyActivity.userId, userProgress.userId), gte(dailyActivity.day, start), lte(dailyActivity.day, end)))
    .groupBy(userProgress.userId)
    .orderBy(desc(weekXp), desc(userProgress.points))
    .limit(limit);
  return { rows, start, end };
}
