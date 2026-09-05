import { and, eq, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { couples, dailyActivity, questClaims, userItems, userProgress } from "@/db/schema";
import { dayKey } from "@/lib/streak";
import { QUEST_DEFS, SHOP_ITEMS, shopItem } from "@/lib/economy-defs";

export { QUEST_DEFS, SHOP_ITEMS, shopItem } from "@/lib/economy-defs";
export type { QuestDef, ShopItem } from "@/lib/economy-defs";

/*
 젬 경제: 퀘스트 → 젬 → 상품. Two invariants the whole file protects:
 1. 지급은 quest_claims PK 뒤 트랜잭션 — 이중 지급이 여기서 막힌다.
 2. 소비는 트랜잭션 안의 재확인(qty·gems)으로 막힌다.
*/

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
        .set({ qty: sql`${userItems.qty} + 1` }) // keep acquiredAt: a top-up must not re-date the stock
        .where(and(eq(userItems.userId, userId), eq(userItems.itemKey, itemKey), sql`${userItems.qty} < ${def.maxQty}`))
        .returning({ qty: userItems.qty });
      if (!spent.length) {
        const inserted = await tx.insert(userItems).values({ userId, itemKey, qty: 1 }).onConflictDoUpdate({
          target: [userItems.userId, userItems.itemKey],
          set: { qty: sql`${userItems.qty} + 1` },
        }).returning({ qty: userItems.qty });
        // first purchase (or the row was at the cap): a fresh row is a success; beyond the cap, refund
        if (inserted[0].qty > def.maxQty) {
          await tx.update(userItems).set({ qty: def.maxQty }).where(and(eq(userItems.userId, userId), eq(userItems.itemKey, itemKey)));
          await refund(tx, userId, def.gems);
          return { ok: false, error: "max-qty" };
        }
        return { ok: true, gems: paid[0].gems, qty: inserted[0].qty };
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
