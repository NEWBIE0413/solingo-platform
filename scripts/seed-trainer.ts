/*
 히라가나 훈련 as a normal-looking course: units → lessons → one marker challenge each.
 The lesson itself is run by the kana engine (public/kana) in lesson mode; the marker's
 meta.focus tells the engine which characters the session is about, and completing the
 session completes the marker (lib/trainer.ts + actions/attempts.ts finishTrainerLesson).
 Idempotent: replaces the course's units. Progress on old units is dropped with them.

   npx tsx scripts/seed-trainer.ts
*/
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

import { KANA_TRAINER_TITLE } from "@/constants";
import * as schema from "@/db/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

const R = {
  a: "あいうえお", ka: "かきくけこ", sa: "さしすせそ", ta: "たちつてと", na: "なにぬねの",
  ha: "はひふへほ", ma: "まみむめも", ya: "やゆよ", ra: "らりるれろ", wa: "わをん",
  ga: "がぎぐげご", za: "ざじずぜぞ", da: "だぢづでど", ba: "ばびぶべぼ", pa: "ぱぴぷぺぽ",
};
const Y = (s: string) => s.split(" ");
const units: { title: string; description: string; rows: [string, string][] }[] = [
  { title: "あ행·か행", description: "모음 다섯과 か행. 히라가나의 첫 열 글자.", rows: [["あ행", R.a], ["か행", R.ka]] },
  { title: "さ행·た행", description: "し·ち·つ처럼 로마자와 다르게 읽는 글자에 주의.", rows: [["さ행", R.sa], ["た행", R.ta]] },
  { title: "な행·は행", description: "は는 조사로 쓰일 때 '와'로 읽는다.", rows: [["な행", R.na], ["は행", R.ha]] },
  { title: "ま행·や행", description: "닮은꼴 ま/も, や·ゆ·よ 세 글자.", rows: [["ま행", R.ma], ["や행", R.ya]] },
  { title: "ら행·わ행", description: "ら행과 わ·を·ん. 기본 46자 완성.", rows: [["ら행", R.ra], ["わ행·ん", R.wa]] },
  { title: "탁음 ①", description: "점 두 개: が행·ざ행.", rows: [["が행", R.ga], ["ざ행", R.za]] },
  { title: "탁음 ②", description: "だ행·ば행. ぢ·づ는 じ·ず와 같은 소리.", rows: [["だ행", R.da], ["ば행", R.ba]] },
  { title: "반탁음·요음 ①", description: "동그라미 ぱ행과 작은 ゃゅょ가 붙는 요음.", rows: [["ぱ행", R.pa], ["きゃ·しゃ·ちゃ", Y("きゃ きゅ きょ しゃ しゅ しょ ちゃ ちゅ ちょ").join("")]] },
  { title: "요음 ②", description: "にゃ·ひゃ·みゃ·りゃ.", rows: [["にゃ·ひゃ", Y("にゃ にゅ にょ ひゃ ひゅ ひょ").join("")], ["みゃ·りゃ", Y("みゃ みゅ みょ りゃ りゅ りょ").join("")]] },
  { title: "요음 ③", description: "탁음·반탁음이 붙는 요음. 히라가나 전체 완성.", rows: [["ぎゃ·じゃ", Y("ぎゃ ぎゅ ぎょ じゃ じゅ じょ").join("")], ["びゃ·ぴゃ", Y("びゃ びゅ びょ ぴゃ ぴゅ ぴょ").join("")]] },
];
// a "row" string may contain 2-char yōon; split on kana boundaries
const chars = (s: string) => s.match(/[ぁ-ゟ][ゃゅょ]?/g) ?? [];

async function main() {
  let course = await db.query.courses.findFirst({ where: eq(schema.courses.title, KANA_TRAINER_TITLE) });
  if (!course) [course] = await db.insert(schema.courses).values({ title: KANA_TRAINER_TITLE, imageSrc: "/kana-course.svg" }).returning();
  await db.delete(schema.units).where(eq(schema.units.courseId, course.id));
  let n = 0;
  for (const [ui, u] of units.entries()) {
    const [unit] = await db.insert(schema.units).values({ courseId: course.id, title: u.title, description: u.description, order: ui + 1 }).returning();
    const [a, b] = u.rows;
    const lessons: [string, string[]][] = [
      [a[0], chars(a[1])],
      [b[0], chars(b[1])],
      [`${a[0]}·${b[0]} 복습`, [...chars(a[1]), ...chars(b[1])]],
      [`${u.title} 종합`, [...chars(a[1]), ...chars(b[1])]],
    ];
    for (const [li, [title, focus]] of lessons.entries()) {
      const [lesson] = await db.insert(schema.lessons).values({ unitId: unit.id, title, order: li + 1 }).returning();
      const [ch] = await db.insert(schema.challenges).values({ lessonId: lesson.id, type: "SELECT", question: KANA_TRAINER_TITLE, order: 1, meta: { focus: focus.join("") } }).returning();
      await db.insert(schema.challengeOptions).values({ challengeId: ch.id, text: "시작", correct: true });
      n++;
    }
  }
  console.log(`seeded "${KANA_TRAINER_TITLE}": ${units.length} units, ${n} lessons`);
  process.exit(0);
}
main();
