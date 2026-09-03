/*
 Seeds a Solingo JSON course (content/ja-kana.json, same schema as solingo/docs/COURSE.md) into the
 clone's relational model: course → units → lessons → challenges (SELECT / ASSIST) → options.
 Rows of the kana grid become lessons; words become their own unit. Audio comes from
 public/audio/<course>/ (pre-rendered clips, index.json maps text → file).

 pnpm run db:seed:kana
*/
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

import * as schema from "@/db/schema";

type Course = {
  id: string; title: string; lang: string;
  tokenize?: { joiners?: string };
  sets: { id: string; title: string; grid: (string | null)[][]; extra?: string[] }[];
  order: string[];
  items: Record<string, { r: string; free?: boolean }>;
  words: { t: string; m: string }[];
};

const COURSE_ID = process.argv[2] ?? "ja-kana";
const course: Course = JSON.parse(readFileSync(`content/${COURSE_ID}.json`, "utf8"));
const audioIndex: Record<string, string> = JSON.parse(readFileSync(`public/audio/${COURSE_ID}/index.json`, "utf8"));
const audio = (t: string) => (audioIndex[t] ? `/audio/${COURSE_ID}/${audioIndex[t]}` : null);
const rom = (k: string) => course.items[k]?.r ?? k;
const JOIN = course.tokenize?.joiners ?? "";
const tok = (w: string) => { const o: string[] = []; for (let i = 0; i < w.length; i++) { if (i + 1 < w.length && JOIN.includes(w[i + 1])) { o.push(w[i] + w[i + 1]); i++; } else o.push(w[i]); } return o; };
const free = new Set(Object.keys(course.items).filter((k) => course.items[k].free));
const shuffle = <T,>(a: T[]) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = <T,>(a: T[], n: number) => shuffle(a).slice(0, n);

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

async function main() {
  console.log(`Seeding ${course.title}`);
  // idempotent: replace the course with the same title
  let c = await db.query.courses.findFirst({ where: eq(schema.courses.title, course.title) });
  if (c) await db.delete(schema.units).where(eq(schema.units.courseId, c.id));
  else [c] = await db.insert(schema.courses).values({ title: course.title, imageSrc: "/jp.svg" }).returning();

  let unitOrder = 0;
  // ---- symbol units: one lesson per grid row (あ행, か행 …), yōon in groups of 3 rows
  for (const set of course.sets) {
    const rows = set.grid.map((r) => r.filter((x): x is string => !!x)).filter((r) => r.length);
    const basic = rows.slice(0, 11), daku = rows.slice(11);
    const extra = set.extra ?? [];
    const yoonRows: string[][] = []; for (let i = 0; i < extra.length; i += 9) yoonRows.push(extra.slice(i, i + 9));
    const units: [string, string, string[][]][] = [
      [`${set.title} 청음`, `${set.title} 기본 46자`, basic],
      [`${set.title} 탁음·요음`, `탁점·반탁점과 작은 ゃゅょ`, [...daku, ...yoonRows]],
    ];
    for (const [title, description, lessonsRows] of units) {
      const [u] = await db.insert(schema.units).values({ courseId: c.id, title, description, order: ++unitOrder }).returning();
      let lessonOrder = 0;
      const pool = lessonsRows.flat();
      for (const row of lessonsRows) {
        const [l] = await db.insert(schema.lessons).values({ unitId: u.id, title: `${row[0]}행`, order: ++lessonOrder }).returning();
        let chOrder = 0;
        for (const k of row) {
          // SELECT: reading → pick the symbol (with audio on each option)
          const [ch1] = await db.insert(schema.challenges).values({ lessonId: l.id, type: "SELECT", question: `「${rom(k)}」 소리는 어떤 글자?`, order: ++chOrder }).returning();
          const distract = pick(pool.filter((x) => x !== k), 3);
          await db.insert(schema.challengeOptions).values(shuffle([k, ...distract]).map((x) => ({ challengeId: ch1.id, text: x, correct: x === k, audioSrc: audio(x) })));
          // ASSIST: symbol → pick the reading
          const [ch2] = await db.insert(schema.challenges).values({ lessonId: l.id, type: "ASSIST", question: k, order: ++chOrder }).returning();
          const d2 = pick(pool.filter((x) => x !== k && rom(x) !== rom(k)), 3);
          await db.insert(schema.challengeOptions).values(shuffle([k, ...d2]).map((x) => ({ challengeId: ch2.id, text: rom(x), correct: x === k, audioSrc: x === k ? audio(k) : null })));
        }
      }
    }
  }
  // ---- words unit: lessons of 6 words, in course order of availability
  const learnedAt = new Map(course.order.map((k, i) => [k, i]));
  const wordsSorted = [...course.words].sort((a, b) => Math.max(...tok(a.t).filter((k) => !free.has(k)).map((k) => learnedAt.get(k) ?? 0)) - Math.max(...tok(b.t).filter((k) => !free.has(k)).map((k) => learnedAt.get(k) ?? 0)));
  const [wu] = await db.insert(schema.units).values({ courseId: c.id, title: "단어", description: "배운 글자로 만든 단어", order: ++unitOrder }).returning();
  for (let i = 0, lo = 0; i < wordsSorted.length; i += 6) {
    const chunk = wordsSorted.slice(i, i + 6);
    const [l] = await db.insert(schema.lessons).values({ unitId: wu.id, title: `단어 ${++lo}`, order: lo }).returning();
    let chOrder = 0;
    for (const w of chunk) {
      const [ch1] = await db.insert(schema.challenges).values({ lessonId: l.id, type: "SELECT", question: `"${w.m}"은(는)?`, order: ++chOrder }).returning();
      await db.insert(schema.challengeOptions).values(shuffle([w, ...pick(course.words.filter((x) => x !== w), 3)]).map((x) => ({ challengeId: ch1.id, text: x.t, correct: x === w, audioSrc: audio(x.t) })));
      const [ch2] = await db.insert(schema.challenges).values({ lessonId: l.id, type: "ASSIST", question: w.t, order: ++chOrder }).returning();
      await db.insert(schema.challengeOptions).values(shuffle([w, ...pick(course.words.filter((x) => x !== w), 3)]).map((x) => ({ challengeId: ch2.id, text: x.m, correct: x === w, audioSrc: x === w ? audio(w.t) : null })));
    }
  }
  const n = await db.$count(schema.challenges);
  console.log(`done: ${unitOrder} units, ${n} challenges`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
