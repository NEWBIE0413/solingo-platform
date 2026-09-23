import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/*
 Where courses live. This repo's `content/` holds only the sample courses that ship with the
 platform. An instance keeps its own curriculum somewhere else — typically a private repo — and
 points CONTENT_DIR at it. Every lookup tries CONTENT_DIR first and then the bundled samples, so
 an instance only carries its own courses and the samples keep working next to them.

 A content root looks like this:
   <root>/<course>.json               course header (+ units inline, optional)
   <root>/<course>/units/*.json       more units, merged in file-name order
   <root>/audio/<course>/<clip>.mp3   pre-rendered clips (scripts/gen_course_audio.py)
*/
export const contentRoots = (): string[] => {
  const bundled = resolve(process.cwd(), "content");
  const own = process.env.CONTENT_DIR ? resolve(process.env.CONTENT_DIR) : null;
  return own && own !== bundled ? [own, bundled] : [bundled];
};

/** The root that holds `<id>.json`, or null when no root has that course. */
export const courseRoot = (id: string): string | null =>
  contentRoots().find((root) => existsSync(join(root, `${id}.json`))) ?? null;

/** Absolute path of the clip `<course>/<file>` in the first root that has it, or null. */
export const audioFile = (course: string, file: string): string | null => {
  for (const root of contentRoots()) {
    const p = join(root, "audio", course, file);
    if (existsSync(p)) return p;
  }
  return null;
};
