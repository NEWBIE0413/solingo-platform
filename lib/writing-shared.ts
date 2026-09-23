/*
 Writing-task helpers shared by the server and the editor in the browser (no fs here).
*/

/** What the learner sees of a task. The rubric never leaves the server. */
export type WritingTask = {
  id: string;
  number?: number;   // exam item number, e.g. TOPIK 51–54 — used for the badge only
  title: string;
  prompt: string;    // markdown (tables allowed)
  maxScore: number;
  minChars?: number | null;
  maxChars?: number | null;
  order?: number;    // list position; ties fall back to id
  blanks?: string[]; // one input per blank; see blanksOf
};

/** Characters as exam graders count them: spaces count, line breaks don't. */
export const countChars = (text: string) => [...text.replace(/\r?\n/g, "")].length;

/**
 * Fill-in-the-blank tasks get one input per blank. A task may list its blanks explicitly; otherwise
 * two or more circled Hangul markers in the prompt (㉠ ㉡ …, the TOPIK convention) are the blanks.
 */
export const blanksOf = (task: Pick<WritingTask, "blanks" | "prompt">): string[] => {
  if (task.blanks?.length) return task.blanks;
  const found = [...new Set(task.prompt.match(/[㉠-㉭]/g) ?? [])];
  return found.length >= 2 ? found : [];
};

/** Blank answers are stored as one line per blank ("㉠: …") so graders read them like a written sheet. */
export const joinBlanks = (blanks: string[], answers: string[]) =>
  blanks.map((b, i) => `${b}: ${(answers[i] ?? "").trim()}`).join("\n");

export const MAX_SUBMISSION_CHARS = 5000;
