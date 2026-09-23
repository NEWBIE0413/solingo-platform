import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { courseRoot } from "@/lib/content";
import type { WritingTask } from "@/lib/writing-shared";

/*
 Writing tasks live next to their course: <root>/<course>/writing/<id>.json (lib/content.ts roots).
   { id, number?, title, prompt (markdown), maxScore, minChars?, maxChars?, order?, blanks?, rubric? }
 `rubric` is for whoever grades (scripts/writing.ts) and is stripped before anything reaches a page.
 Files are read per request — a handful of small JSON files; if a course grows to hundreds of tasks,
 cache by directory mtime.
*/
type TaskFile = WritingTask & { rubric?: string };

const dirOf = (course: string) => {
  const root = courseRoot(course);
  return root ? join(root, course, "writing") : null;
};

/** Every task of a course with its private fields, for graders. */
export function readTaskFiles(course: string): TaskFile[] {
  const dir = dirOf(course);
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as TaskFile)
    .sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.id.localeCompare(b.id));
}

const publicView = ({ rubric: _rubric, ...task }: TaskFile): WritingTask => task;

export const listTasks = (course: string | null | undefined): WritingTask[] =>
  course ? readTaskFiles(course).map(publicView) : [];

export const getTask = (course: string | null | undefined, id: string): WritingTask | null =>
  listTasks(course).find((t) => t.id === id) ?? null;
