import { and, eq, inArray, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { challengeAttempts, challenges, courses, lessons, units } from "@/db/schema";

/*
 First-attempt accuracy for the 레벨 테스트 unit of a course, grouped by level and by tag.
 First attempt = the earliest row in challenge_attempts per (user, challenge); retries are ignored,
 because a retry until correct says nothing about what the learner knew.
*/
export async function levelReport(userId: string, courseTitle = "한국어 TOPIK", unitTitle = "레벨 테스트") {
  const course = await db.query.courses.findFirst({ where: eq(courses.title, courseTitle) });
  if (!course) return null;
  const unit = await db.query.units.findFirst({ where: and(eq(units.courseId, course.id), eq(units.title, unitTitle)), with: { lessons: { with: { challenges: true } } } });
  if (!unit) return null;
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
