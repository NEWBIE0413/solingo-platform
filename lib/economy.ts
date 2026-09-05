import { and, eq, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { couples, dailyActivity, questClaims, userItems, userProgress } from "@/db/schema";
import { dayKey } from "@/lib/streak";

/*
 젬 경제: 퀘스트 → 젬 → 상품. Two invariants the whole file protects:
 1. 지급은 quest_claims PK 뒤 트랜잭션 — 이중 지급이 여기서 막힌다.
 2. 소비는 트랜잭션 안의 재확인(qty·gems)으로 막힌다.
*/

export type QuestDef = {
  key: string;
  name: string;
  hint: string;
  gems: number;
  oneOff?: boolean; // streak7/30/100: day 없이 한 번만
  goal: number;
  progress: (d: { lessons: number; xp: number; practice: number; kana: number; coupleBoth: boolean; streak: number }) => number;
  onlyCourse?: "kana"; // 일본어 코스 사용자에게만 노출
};

export const QUEST_DEFS: QuestDef[] = [
  { key: "lesson1", name: "오늘의 레슨", hint: "레슨 1개 완료", gems: 5, goal: 1, progress: (d) => d.lessons },
  { key: "lesson3", name: "성실한 하루", hint: "레슨 3개 완료", gems: 10, goal: 3, progress: (d) => d.lessons },
  { key: "xp50", name: "오늘 XP 50", hint: "하루 XP 50 모으기", gems: 10, goal: 50, progress: (d) => d.xp },
  { key: "practice1", name: "약점 복습", hint: "약점 복습 1회 완료", gems: 10, goal: 1, progress: (d) => d.practice },
  { key: "kana1", name: "가나 훈련", hint: "히라가나 세션 1회 완료", gems: 5, goal: 1, progress: (d) => d.kana, onlyCourse: "kana" },
  { key: "couple", name: "커플 출석", hint: "오늘 둘 다 출석", gems: 15, goal: 1, progress: (d) => (d.coupleBoth ? 1 : 0) },
  { key: "streak7", name: "연속 7일", hint: "연속 출석 7일 도달", gems: 50, goal: 7, oneOff: true, progress: (d) => d.streak },
  { key: "streak30", name: "연속 30일", hint: "연속 출석 30일 도달", gems: 200, goal: 30, oneOff: true, progress: (d) => d.streak },
  { key: "streak100", name: "연속 100일", hint: "연속 출석 100일 도달", gems: 500, goal: 100, oneOff: true, progress: (d) => d.streak },
];

export const SHOP_ITEMS = [
  { key: "freeze", kind: "consumable", name: "연속 출석 보호", desc: "하루 빠져도 연속 출석이 끊기지 않아요 (최대 2개 보유)", gems: 50, maxQty: 2, icon: "/shop-freeze.svg" },
  { key: "frame_sky", kind: "frame", name: "맑은 하늘 테두리", gems: 30, icon: "/frame-sky.svg", color: "#38bdf8" },
  { key: "frame_rose", kind: "frame", name: "장미 테두리", gems: 60, icon: "/frame-rose.svg", color: "#fb7185" },
  { key: "frame_gold", kind: "frame", name: "황금 테두리", gems: 100, icon: "/frame-gold.svg", color: "#f59e0b" },
  { key: "title_early", kind: "title", name: "새벽형 학습자", gems: 20 },
  { key: "title_kana", kind: "title", name: "가나 정복자", gems: 40 },
  { key: "title_couple", kind: "title", name: "커플 파워", gems: 40 },
  { key: "title_month", kind: "title", name: "한 달 여행자", gems: 60 },
  { key: "title_master", kind: "title", name: "한국어 탐험가", gems: 80 },
  { key: "mascot_spring", kind: "mascot", name: "마스코트: 봄", gems: 80, icon: "/mascot-spring.svg" },
  { key: "mascot_ocean", kind: "mascot", name: "마스코트: 바다", gems: 80, icon: "/mascot-ocean.svg" },
  { key: "mascot_sunset", kind: "mascot", name: "마스코트: 노을", gems: 80, icon: "/mascot-sunset.svg" },
] as const;

export type ShopItem = (typeof SHOP_ITEMS)[number];
export const shopItem = (key: string) => SHOP_ITEMS.find((i) => i.key === key) as ShopItem | undefined;

type QuestData = { lessons: number; xp: number; practice: number; kana: number; coupleBoth: boolean; streak: number };

/** Today's per-user counters (lessons/xp/practice/kana) from daily_activity. */
export async function todayActivity(userId: string) {
  const day = dayKey();
  const row = await db.query.dailyActivity.findFirst({ where: and(eq(dailyActivity.userId, userId), eq(dailyActivity.day, day)) });
  return { lessons: row?.lessons ?? 0, xp: row?.xp ?? 0, practice: row?.practice ?? 0, kana: row?.kana ?? 0 };
}

async function dailyActivityRow(userId: string, day: string) {
  const row = await db.query.dailyActivity.findFirst({ where: and(eq(dailyActivity.userId, userId), eq(dailyActivity.day, day)) });
  return { lessons: row?.lessons ?? 0, xp: row?.xp ?? 0, practice: row?.practice ?? 0, kana: row?.kana ?? 0 };
}

/** Did both partners record activity on `day`? */
export async function coupleBothDone(userId: string, day = dayKey()): Promise<boolean> {
  const c = await db.query.couples.findFirst({ where: sql`${couples.userA} = ${userId} or ${couples.userB} = ${userId}` });
  if (!c?.userB) return false;
  const partnerId = c.userA === userId ? c.userB : c.userA;
  const rows = await db.select({ userId: dailyActivity.userId }).from(dailyActivity).where(eq(dailyActivity.day, day));
  return rows.some((r) => r.userId === userId) && rows.some((r) => r.userId === partnerId);
}

/** Claim one quest: insert into quest_claims wins or loses, gems only follow a win. */
export async function claimQuest(userId: string, questKey: string): Promise<{ ok: boolean; gems?: number; error?: string }> {
  const def = QUEST_DEFS.find((q) => q.key === questKey);
  if (!def) return { ok: false, error: "unknown-quest" };
  const day = def.oneOff ? "" : dayKey();

  const [streakRow, activity] = await Promise.all([
    import("@/lib/streak").then((m) => m.getStreak(userId)),
    dailyActivityRow(userId, day || dayKey()),
  ]);
  const coupleBoth = await coupleBothDone(userId, day || dayKey());
  const have = def.progress({ ...activity, coupleBoth, streak: streakRow.current });
  if (have < def.goal) return { ok: false, error: "not-done" };

  return db.transaction(async (tx) => {
    const inserted = await tx.insert(questClaims).values({ userId, questKey, day }).onConflictDoNothing().returning();
    if (!inserted.length) return { ok: false, error: "already-claimed" };
    await tx.update(userProgress).set({ gems: sql`${userProgress.gems} + ${def.gems}` }).where(eq(userProgress.userId, userId));
    return { ok: true, gems: def.gems };
  }).catch((e) => ({ ok: false, error: (e as Error).message }));
}

/** The quests page: defs + today's numbers + claim state in one round trip. */
export async function getQuestBoard(userId: string, onlyCourseKana: boolean) {
  const day = dayKey();
  const [activity, streak, dayClaims, coupleBoth] = await Promise.all([
    todayActivity(userId),
    import("@/lib/streak").then((m) => m.getStreak(userId)),
    db.select({ questKey: questClaims.questKey }).from(questClaims).where(and(eq(questClaims.userId, userId), eq(questClaims.day, day))),
    coupleBothDone(userId, day),
  ]);
  const oneOffs = await db.select({ questKey: questClaims.questKey }).from(questClaims).where(and(eq(questClaims.userId, userId), eq(questClaims.day, "")));
  const claimedSet = new Set([...dayClaims, ...oneOffs].map((c) => c.questKey));

  return {
    activity,
    streak,
    coupleBoth,
    hasPartner: !!(await db.query.couples.findFirst({ where: sql`${couples.userA} = ${userId} or ${couples.userB} = ${userId}` }))?.userB,
    quests: QUEST_DEFS.filter((q) => !q.onlyCourse || onlyCourseKana).map((def) => {
      const have = def.progress({ ...activity, coupleBoth, streak: streak.current });
      return { ...def, have, claimed: claimedSet.has(def.key), done: have >= def.goal };
    }),
  };
}

/** Shop purchase. Race-safe: the balance check and deduction are one conditional
 * UPDATE (`where gems >= X returning`), so two concurrent buys can't both pass. */
export async function buyItem(userId: string, itemKey: string): Promise<{ ok: boolean; error?: string; gems?: number; qty?: number }> {
  const def = shopItem(itemKey);
  if (!def) return { ok: false, error: "unknown-item" };

  return db.transaction(async (tx) => {
    // Deduct first with a guard; zero rows returned means the balance was short.
    const paid = await tx.update(userProgress)
      .set({ gems: sql`${userProgress.gems} - ${def.gems}` })
      .where(and(eq(userProgress.userId, userId), sql`${userProgress.gems} >= ${def.gems}`))
      .returning({ gems: userProgress.gems });
    if (!paid.length) return { ok: false, error: "not-enough-gems" };

    if (def.kind === "consumable") {
      const spent = await tx.update(userItems)
        .set({ qty: sql`${userItems.qty} + 1`, acquiredAt: new Date() })
        .where(and(eq(userItems.userId, userId), eq(userItems.itemKey, itemKey), sql`${userItems.qty} < ${def.maxQty}`))
        .returning({ qty: userItems.qty });
      if (!spent.length) {
        const inserted = await tx.insert(userItems).values({ userId, itemKey, qty: 1 }).onConflictDoUpdate({
          target: [userItems.userId, userItems.itemKey],
          set: { qty: sql`${userItems.qty} + 1` },
        }).returning({ qty: userItems.qty });
        if (inserted[0].qty > def.maxQty) throw new Error("max-qty");
        await refund(tx, userId, def.gems);
        return { ok: false, error: "max-qty" };
      }
      return { ok: true, gems: paid[0].gems, qty: spent[0].qty };
    }

    const inserted = await tx.insert(userItems).values({ userId, itemKey, qty: 1 }).onConflictDoNothing().returning();
    if (!inserted.length) {
      await refund(tx, userId, def.gems);
      return { ok: false, error: "already-owned" };
    }
    return { ok: true, gems: paid[0].gems, qty: 1 };
  }).catch((e) => ({ ok: false, error: (e as Error).message }));
}

async function refund(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string, gems: number) {
  await tx.update(userProgress).set({ gems: sql`${userProgress.gems} + ${gems}` }).where(eq(userProgress.userId, userId));
}
