import { and, eq, or, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { couples, dailyActivity, userProgress } from "@/db/schema";

const TZ = "Asia/Seoul";
export const dayKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const shift = (day: string, n: number) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Mark today as active for a user (idempotent; counts lessons). */
export async function recordActivity(userId: string) {
  const day = dayKey();
  await db.insert(dailyActivity).values({ userId, day, lessons: 1 })
    .onConflictDoUpdate({ target: [dailyActivity.userId, dailyActivity.day], set: { lessons: sql`${dailyActivity.lessons} + 1` } });
}

export async function activeDays(userId: string): Promise<Set<string>> {
  const rows = await db.select({ day: dailyActivity.day }).from(dailyActivity).where(eq(dailyActivity.userId, userId));
  return new Set(rows.map((r) => r.day));
}

/** Current streak: consecutive active days ending today, or yesterday if today isn't done yet. */
export function streakFrom(days: Set<string>, today = dayKey()) {
  const todayDone = days.has(today);
  let cursor = todayDone ? today : shift(today, -1);
  let current = 0;
  while (days.has(cursor)) { current++; cursor = shift(cursor, -1); }
  // longest run anywhere in history
  let longest = 0;
  for (const d of days) { if (days.has(shift(d, -1))) continue; let n = 0, c = d; while (days.has(c)) { n++; c = shift(c, 1); } longest = Math.max(longest, n); }
  return { current, longest, todayDone };
}

export async function getStreak(userId: string) {
  return streakFrom(await activeDays(userId));
}

export async function getCouple(userId: string) {
  return db.query.couples.findFirst({ where: or(eq(couples.userA, userId), eq(couples.userB, userId)) });
}

export async function getCoupleStatus(userId: string) {
  const c = await getCouple(userId);
  if (!c) return null;
  const partnerId = c.userA === userId ? c.userB : c.userA;
  if (!partnerId) return { code: c.code, partner: null, streak: { current: 0, longest: 0, todayDone: false }, partnerTodayDone: false, mine: await getStreak(userId) };
  const [mine, theirs] = await Promise.all([activeDays(userId), activeDays(partnerId)]);
  const both = new Set([...mine].filter((d) => theirs.has(d)));
  const partner = await db.query.userProgress.findFirst({ where: eq(userProgress.userId, partnerId), columns: { userName: true, userImageSrc: true } });
  const today = dayKey();
  return { code: c.code, partner: { id: partnerId, name: partner?.userName ?? "학습자", image: partner?.userImageSrc ?? "/mascot.svg" }, streak: streakFrom(both), partnerTodayDone: theirs.has(today), mine: streakFrom(mine) };
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
