import { eq } from "drizzle-orm";

import { KANA_TRAINER_TITLE } from "@/constants";
import db from "@/db/drizzle";
import { lessons } from "@/db/schema";

/** If the lesson belongs to 히라가나 훈련, the characters its engine session should focus on. */
export async function trainerLesson(lessonId: number): Promise<{ focus: string; title: string } | null> {
  const l = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: { unit: { with: { course: { columns: { title: true } } } }, challenges: { columns: { meta: true }, limit: 1 } },
  });
  if (!l || l.unit.course.title !== KANA_TRAINER_TITLE) return null;
  const focus = (l.challenges[0]?.meta as { focus?: string } | null)?.focus ?? "";
  return { focus, title: l.title };
}
