import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { couples, dailyActivity, questClaims, userItems, userProgress } from "@/db/schema";
import { weekBounds } from "@/lib/leaderboard";
import { dayKey } from "@/lib/streak";
import { COUPLE_WEEK, QUEST_DEFS, SHOP_ITEMS, shopItem, type QuestView } from "@/lib/economy-defs";

export { QUEST_DEFS, SHOP_ITEMS, shopItem } from "@/lib/economy-defs";
export type { QuestDef, QuestView, ShopItem } from "@/lib/economy-defs";

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

/** Pay a quest once: the quest_claims insert wins or loses, gems only follow a win. */
const payClaim = (userId: string, questKey: string, day: string, gems: number) =>
  db.transaction(async (tx) => {
    const inserted = await tx.insert(questClaims).values({ userId, questKey, day }).onConflictDoNothing().returning();
    if (!inserted.length) return { ok: false, error: "already-claimed" };
    await tx.update(userProgress).set({ gems: sql`${userProgress.gems} + ${gems}` }).where(eq(userProgress.userId, userId));
    return { ok: true, gems };
  }).catch((e) => ({ ok: false, error: (e as Error).message }));

async function partnerOf(userId: string): Promise<string | null> {
  const c = await db.query.couples.findFirst({ where: sql`${couples.userA} = ${userId} or ${couples.userB} = ${userId}` });
  if (!c?.userB) return null;
  return c.userA === userId ? c.userB : c.userA;
}

/** This week's shared couple quest (COUPLE_WEEK), or null without a linked partner. The claim is keyed by the week's Monday. */
export async function coupleWeek(userId: string) {
  const partnerId = await partnerOf(userId);
  if (!partnerId) return null;
  const { start, end } = weekBounds();
  const pair = [userId, partnerId];
  const [sessions, people, claim] = await Promise.all([
    db
      .select({ userId: dailyActivity.userId, n: sql<number>`coalesce(sum(${dailyActivity.lessons} + ${dailyActivity.practice} + ${dailyActivity.kana}), 0)::int` })
      .from(dailyActivity)
      .where(and(inArray(dailyActivity.userId, pair), gte(dailyActivity.day, start), lte(dailyActivity.day, end)))
      .groupBy(dailyActivity.userId),
    db.select({ userId: userProgress.userId, name: userProgress.userName, goal: userProgress.dailyGoal }).from(userProgress).where(inArray(userProgress.userId, pair)),
    db.query.questClaims.findFirst({ where: and(eq(questClaims.userId, userId), eq(questClaims.questKey, COUPLE_WEEK.key), eq(questClaims.day, start)) }),
  ]);
  const of = (id: string) => sessions.find((r) => r.userId === id)?.n ?? 0;
  const goalOf = (id: string) => people.find((p) => p.userId === id)?.goal ?? 1;
  return {
    start,
    mine: of(userId),
    theirs: of(partnerId),
    partnerName: people.find((p) => p.userId === partnerId)?.name ?? "상대",
    target: (goalOf(userId) + goalOf(partnerId)) * COUPLE_WEEK.days,
    claimed: !!claim,
  };
}

/** Who a gift would go to, and how many freezes they already hold (the shop shows the gift only to a couple). */
export async function giftTarget(userId: string): Promise<{ name: string; freezes: number } | null> {
  const partnerId = await partnerOf(userId);
  if (!partnerId) return null;
  const [person, freeze] = await Promise.all([
    db.query.userProgress.findFirst({ where: eq(userProgress.userId, partnerId), columns: { userName: true } }),
    db.query.userItems.findFirst({ where: and(eq(userItems.userId, partnerId), eq(userItems.itemKey, "freeze")) }),
  ]);
  return { name: person?.userName ?? "상대", freezes: freeze?.qty ?? 0 };
}

/** Claim one quest; the gems follow only a claim that wins its quest_claims row. */
export async function claimQuest(userId: string, questKey: string): Promise<{ ok: boolean; gems?: number; error?: string }> {
  if (questKey === COUPLE_WEEK.key) {
    const week = await coupleWeek(userId);
    if (!week) return { ok: false, error: "no-partner" };
    if (week.mine + week.theirs < week.target) return { ok: false, error: "not-done" };
    return payClaim(userId, questKey, week.start, COUPLE_WEEK.gems);
  }
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
  return payClaim(userId, questKey, day, def.gems);
}

/** The quests page: defs + today's numbers + claim state in one round trip. Quests come back as plain
 * data (a definition carries a progress function, which can't cross to the client). */
export async function getQuestBoard(userId: string, onlyCourseKana: boolean) {
  const day = dayKey();
  const [activity, streak, dayClaims, coupleBoth, week] = await Promise.all([
    todayActivity(userId),
    import("@/lib/streak").then((m) => m.getStreak(userId)),
    db.select({ questKey: questClaims.questKey }).from(questClaims).where(and(eq(questClaims.userId, userId), eq(questClaims.day, day))),
    coupleBothDone(userId, day),
    coupleWeek(userId),
  ]);
  const oneOffs = await db.select({ questKey: questClaims.questKey }).from(questClaims).where(and(eq(questClaims.userId, userId), eq(questClaims.day, "")));
  const claimedSet = new Set([...dayClaims, ...oneOffs].map((c) => c.questKey));

  const quests: QuestView[] = [];
  for (const def of QUEST_DEFS.filter((q) => !q.onlyCourse || onlyCourseKana)) {
    const have = def.progress({ ...activity, coupleBoth, streak: streak.current });
    const { key, name, hint, gems, oneOff, goal, onlyCourse } = def;
    quests.push({ key, name, hint, gems, oneOff, goal, onlyCourse, have, claimed: claimedSet.has(key), done: have >= goal });
    if (key === "couple" && week) {
      const have = week.mine + week.theirs;
      quests.push({
        key: COUPLE_WEEK.key,
        name: COUPLE_WEEK.name,
        hint: `둘이 합쳐 이번 주 ${week.target}번 · 나 ${week.mine} · ${week.partnerName} ${week.theirs}`,
        gems: COUPLE_WEEK.gems,
        goal: week.target,
        weekly: true,
        have,
        claimed: week.claimed,
        done: have >= week.target,
      });
    }
  }
  return { activity, streak, coupleBoth, hasPartner: !!week, quests };
}

/** How far each quest was when a lesson began — the lesson-end quest step fills bars from here. */
export async function questSnapshot(userId: string): Promise<Record<string, number>> {
  const board = await getQuestBoard(userId, true);
  return Object.fromEntries(board.quests.map((q) => [q.key, q.have]));
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
      const qty = await stock(tx, userId, itemKey, def.maxQty);
      if (qty === null) {
        await refund(tx, userId, def.gems);
        return { ok: false, error: "max-qty" };
      }
      return { ok: true, gems: paid[0].gems, qty };
    }

    if (def.kind === "gift") {
      // a freeze for the partner; the buyer keeps nothing
      const freeze = shopItem("freeze");
      const partnerId = await partnerOf(userId);
      const qty = partnerId && freeze?.kind === "consumable" ? await stock(tx, partnerId, freeze.key, freeze.maxQty) : null;
      if (qty === null) {
        await refund(tx, userId, def.gems);
        return { ok: false, error: partnerId ? "partner-max" : "no-partner" };
      }
      return { ok: true, gems: paid[0].gems, qty };
    }

    const inserted = await tx.insert(userItems).values({ userId, itemKey, qty: 1 }).onConflictDoNothing().returning();
    if (!inserted.length) {
      await refund(tx, userId, def.gems);
      return { ok: false, error: "already-owned" };
    }
    return { ok: true, gems: paid[0].gems, qty: 1 };
  }).catch((e) => ({ ok: false, error: (e as Error).message }));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** One more of a consumable into `ownerId`'s stock, up to `maxQty`. Returns the new count, or null at the cap
 * (the row is left at the cap). A top-up keeps acquiredAt: a freeze only covers days after it was acquired. */
async function stock(tx: Tx, ownerId: string, itemKey: string, maxQty: number): Promise<number | null> {
  const topped = await tx.update(userItems)
    .set({ qty: sql`${userItems.qty} + 1` })
    .where(and(eq(userItems.userId, ownerId), eq(userItems.itemKey, itemKey), sql`${userItems.qty} < ${maxQty}`))
    .returning({ qty: userItems.qty });
  if (topped.length) return topped[0].qty;
  const inserted = await tx.insert(userItems).values({ userId: ownerId, itemKey, qty: 1 }).onConflictDoUpdate({
    target: [userItems.userId, userItems.itemKey],
    set: { qty: sql`${userItems.qty} + 1` },
  }).returning({ qty: userItems.qty });
  // first one (a fresh row) is a success; a row that was already at the cap went past it — put it back
  if (inserted[0].qty > maxQty) {
    await tx.update(userItems).set({ qty: maxQty }).where(and(eq(userItems.userId, ownerId), eq(userItems.itemKey, itemKey)));
    return null;
  }
  return inserted[0].qty;
}

async function refund(tx: Tx, userId: string, gems: number) {
  await tx.update(userProgress).set({ gems: sql`${userProgress.gems} + ${gems}` }).where(eq(userProgress.userId, userId));
}
