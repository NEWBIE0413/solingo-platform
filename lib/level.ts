import { eq, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { PLACEMENT_UNIT_TITLE } from "@/constants";
import { units, userProgress } from "@/db/schema";

/*
 First-attempt accuracy for a course's placement unit (PLACEMENT_UNIT_TITLE), grouped by level and by tag.
 Which placement: the one in the learner's active course, else the one they have answered the most, else
 the first one found — any course can carry a placement unit, none is special-cased here.
 First attempt = the earliest row in challenge_attempts per (user, challenge); retries are ignored,
 because a retry until correct says nothing about what the learner knew.
*/
export async function levelReport(userId: string, unitTitle = PLACEMENT_UNIT_TITLE) {
  const placements = await db.query.units.findMany({ where: eq(units.title, unitTitle), with: { lessons: { with: { challenges: true } } } });
  if (!placements.length) return null;
  const progress = await db.query.userProgress.findFirst({ where: eq(userProgress.userId, userId), columns: { activeCourseId: true } });
  const answeredIn = async (u: (typeof placements)[number]) => {
    const ids = u.lessons.flatMap((l) => l.challenges.map((c) => c.id));
    if (!ids.length) return 0;
    const r = await db.execute(sql`select count(distinct challenge_id)::int as n from challenge_attempts where user_id = ${userId} and challenge_id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
    return (r.rows[0] as { n?: number } | undefined)?.n ?? 0;
  };
  let unit = placements.find((u) => u.courseId === progress?.activeCourseId);
  if (!unit) {
    const counts = await Promise.all(placements.map(answeredIn));
    unit = placements[counts.indexOf(Math.max(...counts))];
  }
  const all = unit.lessons.flatMap((l) => l.challenges);
  const ids = all.map((c) => c.id);
  if (!ids.length) return { total: 0, answered: 0, byLevel: [], byTag: [], items: [] };
  const first = await db.execute(sql`
    select distinct on (challenge_id) challenge_id, correct
    from challenge_attempts where user_id = ${userId} and challenge_id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
    order by challenge_id, created_at asc`);
  const firstMap = new Map<number, boolean>((first.rows as { challenge_id: number; correct: boolean }[]).map((r) => [Number(r.challenge_id), r.correct]));
  const items = all.map((c) => ({ id: c.id, question: c.question, level: c.level ?? 0, tag: c.tag ?? "-", first: firstMap.get(c.id) ?? null }));
  const group = (key: "level" | "tag") => {
    const m = new Map<string | number, { n: number; ok: number; answered: number }>();
    for (const it of items) { const k = it[key]; const g = m.get(k) ?? { n: 0, ok: 0, answered: 0 }; g.n++; if (it.first !== null) { g.answered++; if (it.first) g.ok++; } m.set(k, g); }
    return [...m.entries()].map(([k, v]) => ({ key: k, ...v, pct: v.answered ? Math.round((v.ok / v.answered) * 100) : null })).sort((a, b) => String(a.key).localeCompare(String(b.key)));
  };
  return { total: items.length, answered: items.filter((i) => i.first !== null).length, byLevel: group("level"), byTag: group("tag"), items };
}
