/*
 Generic course seed: content/<id>.json (+ content/<id>/units/*.json merged in file-name order)
   { id, title, imageSrc?, units: [{ title, description, lessons: [{ title, challenges: [
       { type: "SELECT"|"ASSIST", question, level?, tag?, options: [{ text, correct, audioSrc?, imageSrc? }] } ] }] }] }
 Idempotent per course title (replaces the course). Challenge/attempt history for the old rows is dropped with them,
 so re-seeding the 레벨 테스트 after the learner took it will erase her attempts — seed before, not after.

 pnpm run db:seed:course ko-topik
*/
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

import * as schema from "@/db/schema";

type Option = { text: string; correct: boolean; audioSrc?: string | null; imageSrc?: string | null; meta?: Record<string, unknown> | null };
type ChallengeType = "SELECT" | "ASSIST" | "LISTEN" | "MATCH" | "BUILD" | "TRACE" | "SPEAK";
type Challenge = { type: ChallengeType; question: string; level?: number; tag?: string; audioSrc?: string | null; meta?: Record<string, unknown> | null; options: Option[] };
type Lesson = { title: string; challenges: Challenge[] };
type Unit = { title: string; description: string; lessons: Lesson[] };
type Course = { id: string; title: string; imageSrc?: string; units: Unit[] };

const id = process.argv[2];
if (!id) { console.error("usage: seed-course <course-id>"); process.exit(1); }
const course: Course = JSON.parse(readFileSync(`content/${id}.json`, "utf8"));
const unitsDir = join("content", id, "units");
if (existsSync(unitsDir)) {
  for (const f of readdirSync(unitsDir).filter((f) => f.endsWith(".json")).sort()) {
    const extra = JSON.parse(readFileSync(join(unitsDir, f), "utf8"));
    course.units.push(...(Array.isArray(extra) ? extra : extra.units ?? [extra]));
  }
}
const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

function validate(c: Course) {
  const problems: string[] = [];
  c.units.forEach((u, ui) => u.lessons.forEach((l, li) => l.challenges.forEach((ch, ci) => {
    const where = `unit ${ui + 1} "${u.title}" › lesson ${li + 1} "${l.title}" › #${ci + 1}`;
    if (!["SELECT", "ASSIST", "LISTEN", "MATCH", "BUILD", "TRACE", "SPEAK"].includes(ch.type)) problems.push(`${where}: type ${ch.type}`);
    if (!ch.question?.trim()) problems.push(`${where}: empty question`);
    const correct = ch.options.filter((o) => o.correct).length;
    if (["SELECT", "ASSIST", "LISTEN"].includes(ch.type) && (ch.options.length < 2 || correct !== 1)) problems.push(`${where}: ${ch.options.length} options, ${correct} correct`);
    if (ch.type === "MATCH" && (ch.options.length < 6 || ch.options.length % 2)) problems.push(`${where}: MATCH needs at least 3 pairs (got ${ch.options.length} options)`);
    if (ch.type === "BUILD" && (!ch.meta?.target || correct < 1)) problems.push(`${where}: BUILD needs meta.target and ordered correct tiles`);
    if (["SPEAK", "TRACE"].includes(ch.type) && !ch.meta?.target) problems.push(`${where}: ${ch.type} needs meta.target`);
  })));
  return problems;
}

async function main() {
  const problems = validate(course);
  if (problems.length) { console.error("content problems:\n" + problems.join("\n")); process.exit(1); }
  // Keep the course row (user_progress.active_course_id cascades on course delete — wiping points and hearts);
  // replace only its units, which cascade to lessons/challenges/options/progress/attempts.
  let c = await db.query.courses.findFirst({ where: eq(schema.courses.title, course.title) });
  if (c) { await db.delete(schema.units).where(eq(schema.units.courseId, c.id)); if (course.imageSrc) await db.update(schema.courses).set({ imageSrc: course.imageSrc }).where(eq(schema.courses.id, c.id)); }
  else [c] = await db.insert(schema.courses).values({ title: course.title, imageSrc: course.imageSrc ?? "/kr.svg" }).returning();
  let n = 0;
  for (const [ui, u] of course.units.entries()) {
    const [unit] = await db.insert(schema.units).values({ courseId: c.id, title: u.title, description: u.description, order: ui + 1 }).returning();
    for (const [li, l] of u.lessons.entries()) {
      const [lesson] = await db.insert(schema.lessons).values({ unitId: unit.id, title: l.title, order: li + 1 }).returning();
      for (const [ci, ch] of l.challenges.entries()) {
        const [row] = await db.insert(schema.challenges).values({ lessonId: lesson.id, type: ch.type, question: ch.question, order: ci + 1, level: ch.level ?? null, tag: ch.tag ?? null, audioSrc: ch.audioSrc ?? null, meta: ch.meta ?? null }).returning();
        if (ch.options.length) await db.insert(schema.challengeOptions).values(ch.options.map((o) => ({ challengeId: row.id, text: o.text, correct: o.correct, audioSrc: o.audioSrc ?? null, imageSrc: o.imageSrc ?? null, meta: o.meta ?? null })));
        n++;
      }
    }
  }
  console.log(`seeded "${course.title}": ${course.units.length} units, ${n} challenges`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
