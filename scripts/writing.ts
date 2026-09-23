/*
 Grading loop for writing tasks — the same for a human grader and an AI one.

   pnpm exec tsx scripts/writing.ts pending [--all] > batch.json   # ungraded answers (or every answer)
   # fill in "score" and "feedback" for each item, leave the rest as is
   pnpm exec tsx scripts/writing.ts grade batch.json               # writes them back

 `pending` joins each answer with its task file (title, limits, rubric), so one file carries everything a
 grader needs. `grade` reads the same file and writes only items whose score is filled in; the grader's
 name is WRITING_GRADER (default "grader"). Feedback is markdown and is shown to the learner as is.

 Environment: DATABASE_URL, and CONTENT_DIR if the tasks live outside this repo. The database account
 needs nothing but SELECT on writing_submissions and UPDATE on its score, feedback, graded_at and grader
 columns — see docs/COURSES.md for the role.
*/
import "dotenv/config";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

import { readTaskFiles } from "@/lib/writing";
import { countChars } from "@/lib/writing-shared";

type Row = { id: number; user_id: string; course: string; prompt_id: string; text: string; max_score: number; created_at: Date; score: number | null; feedback: string | null };
type Item = { id: number; score?: number | null; feedback?: string | null };

const [cmd, arg] = process.argv.slice(2);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function pending(all: boolean) {
  const { rows } = await pool.query<Row>(
    `select id, user_id, course, prompt_id, text, max_score, created_at, score, feedback
       from writing_submissions ${all ? "" : "where score is null"} order by created_at`,
  );
  const tasks = new Map<string, ReturnType<typeof readTaskFiles>>();
  const taskOf = (course: string, id: string) => {
    if (!tasks.has(course)) tasks.set(course, readTaskFiles(course));
    return tasks.get(course)!.find((t) => t.id === id);
  };
  const out = rows.map((r) => {
    const t = taskOf(r.course, r.prompt_id);
    return {
      id: r.id, user: r.user_id, course: r.course, task: r.prompt_id, number: t?.number ?? null, title: t?.title ?? "(task file missing)",
      maxScore: r.max_score, minChars: t?.minChars ?? null, maxChars: t?.maxChars ?? null, chars: countChars(r.text),
      submittedAt: r.created_at, text: r.text, rubric: t?.rubric ?? null,
      score: r.score, feedback: r.feedback,
    };
  });
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  console.error(`${out.length} ${all ? "answers" : "ungraded answers"}`);
}

async function grade(file: string) {
  const items = JSON.parse(readFileSync(file, "utf8")) as Item[];
  const grader = process.env.WRITING_GRADER || "grader";
  let done = 0;
  for (const it of items) {
    if (it.score === null || it.score === undefined) continue;
    const { rows } = await pool.query<{ max_score: number }>("select max_score from writing_submissions where id = $1", [it.id]);
    if (!rows.length) { console.error(`#${it.id}: no such submission — skipped`); continue; }
    if (!Number.isInteger(it.score) || it.score < 0 || it.score > rows[0].max_score) { console.error(`#${it.id}: score ${it.score} is not 0..${rows[0].max_score} — skipped`); continue; }
    await pool.query("update writing_submissions set score = $2, feedback = $3, graded_at = now(), grader = $4 where id = $1", [it.id, it.score, it.feedback ?? null, grader]);
    done++;
  }
  console.error(`graded ${done} of ${items.length}`);
}

(async () => {
  if (cmd === "pending") await pending(arg === "--all");
  else if (cmd === "grade" && arg) await grade(arg);
  else { console.error("usage: writing.ts pending [--all] | grade <file.json>"); process.exitCode = 1; }
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
