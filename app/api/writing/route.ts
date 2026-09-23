import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import db from "@/db/drizzle";
import { writingSubmissions } from "@/db/schema";
import { auth } from "@/lib/session";
import { getTask } from "@/lib/writing";
import { countChars, MAX_SUBMISSION_CHARS } from "@/lib/writing-shared";

/*
 POST /api/writing  { course, promptId, text } → { id }
 Stores one answer to a writing task. Grading happens elsewhere (scripts/writing.ts), so this only
 checks that the task exists and the answer is sane. Resubmitting is allowed: each try is a row, and
 the task page shows them newest first with whatever feedback each one got.
*/
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized.", { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { course?: unknown; promptId?: unknown; text?: unknown };
  const course = String(body.course ?? "");
  const promptId = String(body.promptId ?? "");
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "답안이 비어 있어요." }, { status: 400 });
  if (countChars(text) > MAX_SUBMISSION_CHARS) return NextResponse.json({ error: `${MAX_SUBMISSION_CHARS}자를 넘을 수 없어요.` }, { status: 400 });
  const task = getTask(course, promptId);
  if (!task) return NextResponse.json({ error: "없는 과제예요." }, { status: 404 });

  const [row] = await db.insert(writingSubmissions).values({ userId, course, promptId, text, maxScore: task.maxScore }).returning({ id: writingSubmissions.id });
  revalidatePath("/writing");
  revalidatePath(`/writing/${promptId}`);
  revalidatePath("/learn");
  return NextResponse.json({ id: row.id });
}
