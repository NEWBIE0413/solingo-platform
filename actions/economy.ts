"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/session";
import { buyItem, claimQuest } from "@/lib/economy";
import { and, eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { userItems, userProgress } from "@/db/schema";
import { getUserProgress } from "@/db/queries";
import { shopItem } from "@/lib/economy";

export const claimQuestAction = async (questKey: string) => {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "unauthorized" };
  const r = await claimQuest(userId, questKey);
  if (r.ok) {
    revalidatePath("/quests");
    revalidatePath("/shop");
    revalidatePath("/learn");
    revalidatePath("/profile");
  }
  const progress = await getUserProgress();
  return { ...r, gems: progress?.gems ?? r.gems };
};

export const buyItemAction = async (itemKey: string) => {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "unauthorized" };
  const r = await buyItem(userId, itemKey);
  if (r.ok) {
    revalidatePath("/shop");
    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    revalidatePath("/learn");
  }
  const progress = await getUserProgress();
  return { ...r, gems: progress?.gems ?? r.gems };
};

/** Equip/unequip a cosmetic into its slot. Server re-validates ownership. */
export const equipItemAction = async (slot: "frame" | "title" | "mascot", itemKey: string | null) => {
  const { userId } = await auth();
  if (!userId) return { ok: false };
  if (itemKey === null) {
    const [row] = await db.select().from(userProgress).where(eq(userProgress.userId, userId));
    if (!row) return { ok: false };
    const next = { ...(row.equipped ?? {}) }; delete next[slot];
    await db.update(userProgress).set({ equipped: next }).where(eq(userProgress.userId, userId));
    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    return { ok: true };
  }
  const def = shopItem(itemKey);
  if (!def || (slot === "frame" && def.kind !== "frame") || (slot === "title" && def.kind !== "title") || (slot === "mascot" && def.kind !== "mascot")) return { ok: false };
  const owned = await db.select().from(userItems).where(and(eq(userItems.userId, userId), eq(userItems.itemKey, itemKey)));
  if (!owned.length) return { ok: false };
  const [row] = await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  await db.update(userProgress).set({ equipped: { ...(row?.equipped ?? {}), [slot]: itemKey } }).where(eq(userProgress.userId, userId));
  revalidatePath("/profile");
  revalidatePath("/leaderboard");
  return { ok: true };
};

export const updateUserNameAction = async (name: string) => {
  const { userId } = await auth();
  if (!userId) return { ok: false };
  const trimmed = name.trim().slice(0, 24);
  if (!trimmed) return { ok: false };
  await db.update(userProgress).set({ userName: trimmed }).where(eq(userProgress.userId, userId));
  revalidatePath("/profile");
  revalidatePath("/leaderboard");
  return { ok: true };
};
