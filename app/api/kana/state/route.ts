import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/drizzle";
import { kanaState, userProgress } from "@/db/schema";
import { auth } from "@/lib/session";
import { recordActivity } from "@/lib/streak";

/*
 GET  /api/kana/state?course=ja-kana        → { state, session }
 PUT  /api/kana/state?course=ja-kana        body: { state?, session?, xpDelta? }
 The engine in public/kana/app.js talks to this instead of localStorage. xpDelta is
 credited to the platform's points so the /kana tab feeds the same leaderboard and quests.
*/
const courseOf = (req: Request) => new URL(req.url).searchParams.get("course") ?? "ja-kana";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized.", { status: 401 });
  const row = await db.query.kanaState.findFirst({ where: and(eq(kanaState.userId, userId), eq(kanaState.courseId, courseOf(req))) });
  return NextResponse.json({ state: row?.state ?? null, session: row?.session ?? null, updatedAt: row?.updatedAt ?? null });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized.", { status: 401 });
  const courseId = courseOf(req);
  const body = (await req.json().catch(() => ({}))) as { state?: unknown; session?: unknown; xpDelta?: number; sessionComplete?: boolean };
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (body.state !== undefined) set.state = body.state;
  if (body.session !== undefined) set.session = body.session;
  await db
    .insert(kanaState)
    .values({ userId, courseId, state: (body.state as object) ?? {}, session: (body.session as object) ?? null })
    .onConflictDoUpdate({ target: [kanaState.userId, kanaState.courseId], set });
  const xp = body.xpDelta && Number.isFinite(body.xpDelta) ? Math.min(200, Math.round(body.xpDelta)) : 0;
  // XP alone is counter-neutral; only a finished session bumps the kana quest counter.
  if (xp > 0) {
    await recordActivity(userId, "xp", xp);
    await db.update(userProgress).set({ points: sql`${userProgress.points} + ${xp}` }).where(eq(userProgress.userId, userId));
  }
  if (body.sessionComplete) {
    await recordActivity(userId, "kana", 0);
  }
  return NextResponse.json({ ok: true });
}
