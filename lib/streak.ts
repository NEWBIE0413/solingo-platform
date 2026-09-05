import { and, eq, or, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { couples, dailyActivity, userItems, userProgress } from "@/db/schema";

const TZ = "Asia/Seoul";
export const dayKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const shift = (day: string, n: number) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export type ActivityKind = "lesson" | "practice" | "kana" | "xp";

/** Mark today as active for a user. kind bumps that counter; every kind counts as attendance.
 * "xp" is the counter-neutral kind: it only adds xpDelta (per-answer XP credit). */
export async function recordActivity(userId: string, kind: ActivityKind = "lesson", xpDelta = 0): Promise<{ firstToday: boolean }> {
  const day = dayKey();
  // "first today" = no completed lesson/practice/kana session yet (per-answer xp rows don't count)
  const prev = await db.query.dailyActivity.findFirst({ where: and(eq(dailyActivity.userId, userId), eq(dailyActivity.day, day)) });
  const firstToday = !prev || prev.lessons + prev.practice + prev.kana === 0;
  await db.insert(dailyActivity).values({ userId, day, lessons: kind === "lesson" ? 1 : 0, xp: Math.max(0, Math.round(xpDelta)), practice: kind === "practice" ? 1 : 0, kana: kind === "kana" ? 1 : 0 })
    .onConflictDoUpdate({
      target: [dailyActivity.userId, dailyActivity.day],
      set: {
        lessons: sql`${dailyActivity.lessons} + ${kind === "lesson" ? 1 : 0}`,
        xp: sql`${dailyActivity.xp} + ${Math.max(0, Math.round(xpDelta))}`,
        practice: sql`${dailyActivity.practice} + ${kind === "practice" ? 1 : 0}`,
        kana: sql`${dailyActivity.kana} + ${kind === "kana" ? 1 : 0}`,
      },
    });
  return { firstToday };
}

/** Active days for streak purposes = real activity + days a freeze filled in (frozen=true). */
export async function activeDays(userId: string): Promise<Set<string>> {
  const rows = await db.select({ day: dailyActivity.day }).from(dailyActivity).where(eq(dailyActivity.userId, userId));
  return new Set(rows.map((r) => r.day));
}

/*
 Streak reading with freeze (연속 출석 보호). Walking backwards, an empty day is
 bridged by consuming one freeze from stock and writing a frozen=true row; the
 write makes it idempotent — the next read finds the row and consumes nothing.
 Two consecutive gaps consume two freezes. Frozen days count as attendance for
 the couple streak too (the day exists for that user).
*/
export async function streakFrom(days: Set<string>, userId?: string, today = dayKey()) {
  const todayDone = days.has(today);
  let cursor = todayDone ? today : shift(today, -1);
  let current = 0;
  while (days.has(cursor)) { current++; cursor = shift(cursor, -1); }
  if (userId) {
    // The bridge: cursor now points at the first missing day of the current run.
    for (let gap = 0; gap < 2; gap++) {
      if (days.has(cursor)) break;
      const ok = await consumeFreeze(userId, cursor);
      if (!ok) break;
      days = new Set([...days, cursor]);
      current++;
      cursor = shift(cursor, -1);
      while (days.has(cursor)) { current++; cursor = shift(cursor, -1); }
    }
  }
  // longest run anywhere in history (frozen rows are in the set already)
  let longest = 0;
  for (const d of days) { if (days.has(shift(d, -1))) continue; let n = 0, c = d; while (days.has(c)) { n++; c = shift(c, 1); } longest = Math.max(longest, n); }
  return { current, longest, todayDone };
}

/** Spend one freeze to fill `day`. Race-safe conditional decrement (`where qty >= 1`);
 * idempotent: a second call finds the daily row and consumes nothing. */
export async function consumeFreeze(userId: string, day: string): Promise<boolean> {
  const existing = await db.select().from(dailyActivity).where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.day, day)));
  if (existing.length) return true; // already active or already frozen — nothing to consume
  return db.transaction(async (tx) => {
    // A freeze protects days missed *after* it was bought. Without this guard the walk back
    // through history spent a freeze on an old gap (seen: bought 9/5, consumed for 9/2).
    const spent = await tx.update(userItems)
      .set({ qty: sql`${userItems.qty} - 1` })
      .where(and(
        eq(userItems.userId, userId), eq(userItems.itemKey, "freeze"), sql`${userItems.qty} >= 1`,
        sql`to_char(${userItems.acquiredAt} at time zone 'Asia/Seoul', 'YYYY-MM-DD') <= ${day}`,
      ))
      .returning({ qty: userItems.qty });
    if (!spent.length) return false;
    await tx.insert(dailyActivity).values({ userId, day, lessons: 0, frozen: true }).onConflictDoNothing();
    return true;
  }).catch(() => false);
}

export async function getStreak(userId: string) {
  return streakFrom(await activeDays(userId), userId);
}

export async function getCouple(userId: string) {
  return db.query.couples.findFirst({ where: or(eq(couples.userA, userId), eq(couples.userB, userId)) });
}

export async function getCoupleStatus(userId: string) {
  const c = await getCouple(userId);
  if (!c) return null;
  const partnerId = c.userA === userId ? c.userB : c.userA;
  if (!partnerId) return { code: c.code, partner: null, streak: { current: 0, longest: 0, todayDone: false }, partnerTodayDone: false, mine: await getStreak(userId) };
  // 각자 자기 freeze로 자기 결석을 먼저 메우고(부수 효과는 각자의 재고만), 그 후의
  // activeDays 교집합으로 커플 연속을 계산한다 — bridging 없이(userId 미전달).
  // 그렇지 않으면 내 행이 있는 날엔 상대의 결석까지 내 출석처럼 계산된다.
  const [mine, theirs] = await Promise.all([getStreak(userId), getStreak(partnerId)]);
  const [mineDays, theirDays] = await Promise.all([activeDays(userId), activeDays(partnerId)]);
  const both = new Set([...mineDays].filter((d) => theirDays.has(d)));
  const partner = await db.query.userProgress.findFirst({ where: eq(userProgress.userId, partnerId), columns: { userName: true, userImageSrc: true } });
  const today = dayKey();
  return { code: c.code, partner: { id: partnerId, name: partner?.userName ?? "학습자", image: partner?.userImageSrc ?? "/mascot.svg" }, streak: await streakFrom(both), partnerTodayDone: theirDays.has(today), mine };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");

export async function createCouple(userId: string) {
  const existing = await getCouple(userId);
  if (existing) return existing;
  const [c] = await db.insert(couples).values({ code: newCode(), userA: userId }).returning();
  return c;
}

export async function joinCouple(userId: string, code: string) {
  const c = await db.query.couples.findFirst({ where: eq(couples.code, code.trim().toUpperCase()) });
  if (!c) throw new Error("초대 코드를 찾을 수 없어요.");
  if (c.userA === userId) throw new Error("내 코드예요. 상대에게 이 코드를 알려주세요.");
  if (c.userB && c.userB !== userId) throw new Error("이미 다른 사람과 연결된 코드예요.");
  if (await getCouple(userId)) throw new Error("이미 커플이 연결돼 있어요. 먼저 연결을 끊어주세요.");
  await db.update(couples).set({ userB: userId }).where(and(eq(couples.id, c.id)));
  return c;
}

export async function leaveCouple(userId: string) {
  const c = await getCouple(userId);
  if (!c) return;
  await db.delete(couples).where(eq(couples.id, c.id));
}
