import { redirect } from "next/navigation";

import { auth } from "@/lib/session";
import { trainerLesson } from "@/lib/trainer";

import { TrainerFrame } from "./trainer-frame";

/*
 One 히라가나 훈련 lesson, full-screen like any other lesson. The kana engine runs the session
 for the lesson's focus characters and tells us when it is done (postMessage); we then mark
 the lesson complete and go back to the path on /learn.
*/
export default async function TrainerPage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  await auth.protect();
  const { lesson } = await searchParams;
  const id = Number(lesson);
  const t = id ? await trainerLesson(id) : null;
  if (!t) redirect("/learn");
  return <TrainerFrame lessonId={id} focus={t.focus} title={t.title} />;
}
