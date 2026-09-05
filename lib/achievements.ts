import { count, eq, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { dailyActivity, questClaims, userAchievements, userItems, userProgress } from "@/db/schema";
import { ACHIEVEMENT_DEFS, type AchievementGroup, type AchievementView } from "@/lib/achievements-defs";
import { getCoupleStatus, getStreak } from "@/lib/streak";

/** 업적이 파생되는 수치. 출석·커플은 '최고' 기록을 쓴다 — 한 번 이룬 업적은 스트릭이 끊겨도 남아야 하니까.
 * 학습 횟수는 레슨·약점 복습·히라가나 세션을 합친다(출석 기준과 같은 셈법). */
async function metrics(userId: string): Promise<Record<AchievementGroup, number>> {
  const [streak, couple, sessions, quests, shop, prog] = await Promise.all([
    getStreak(userId),
    getCoupleStatus(userId),
    db.select({ n: sql<number>`coalesce(sum(${dailyActivity.lessons} + ${dailyActivity.practice} + ${dailyActivity.kana}), 0)::int` }).from(dailyActivity).where(eq(dailyActivity.userId, userId)),
    db.select({ n: count() }).from(questClaims).where(eq(questClaims.userId, userId)),
    db.select({ n: count() }).from(userItems).where(eq(userItems.userId, userId)),
    db.query.userProgress.findFirst({ where: eq(userProgress.userId, userId), columns: { points: true } }),
  ]);
  return { streak: streak.longest, couple: couple?.streak.longest ?? 0, lessons: sessions[0]?.n ?? 0, quests: quests[0]?.n ?? 0, shop: shop[0]?.n ?? 0, xp: prog?.points ?? 0 };
}

/** 모든 업적의 현재 상태 — 달성 여부는 수치에서 파생된다. 읽기 전용(프로필). */
export async function getAchievements(userId: string): Promise<AchievementView[]> {
  const m = await metrics(userId);
  return ACHIEVEMENT_DEFS.map((d) => ({ ...d, progress: Math.min(m[d.group], d.goal), unlocked: m[d.group] >= d.goal }));
}

/** 레슨 끝에서 호출: 달성했지만 아직 축하하지 않은 업적을 대장에 적고 돌려준다.
 * 두 세션이 동시에 끝나도 PK가 중복 기록을 막는다(축하가 두 번 뜨는 정도는 감수). */
export async function syncAchievements(userId: string) {
  const [all, rows] = await Promise.all([
    getAchievements(userId),
    db.select({ key: userAchievements.key }).from(userAchievements).where(eq(userAchievements.userId, userId)),
  ]);
  const seen = new Set(rows.map((r) => r.key));
  const fresh = all.filter((a) => a.unlocked && !seen.has(a.key));
  if (fresh.length) await db.insert(userAchievements).values(fresh.map((a) => ({ userId, key: a.key }))).onConflictDoNothing();
  return { all, fresh };
}
