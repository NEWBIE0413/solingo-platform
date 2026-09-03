"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/session";
import { createCouple, joinCouple, leaveCouple, recordActivity } from "@/lib/streak";

/** Called once when a lesson (or a 히라가나 session) is completed. */
export const recordLessonComplete = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");
  await recordActivity(userId);
  revalidatePath("/streak");
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
