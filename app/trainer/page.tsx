import Link from "next/link";
import { X } from "lucide-react";

import { KANA_TRAINER_TITLE } from "@/constants";
import { getUserProgress } from "@/db/queries";
import { auth } from "@/lib/session";
import { redirect } from "next/navigation";

/*
 히라가나 훈련 runs full-screen like a lesson: no platform header, no tabs — the engine has its own
 stat row and lesson chrome. The only thing we add is the ✕ that lessons also have, back to 코스.
 (Sitting inside /learn it had two stat bars stacked and the tabs over its footer.)
*/
export default async function TrainerPage() {
  await auth.protect();
  const progress = await getUserProgress();
  if (progress?.activeCourse?.title !== KANA_TRAINER_TITLE) redirect("/learn");
  return (
    <div className="fixed inset-0 bg-white">
      <iframe src="/kana/index.html?course=ja-kana&embed=1" title={KANA_TRAINER_TITLE} className="h-full w-full border-0" allow="microphone; autoplay" />
      <Link href="/courses" prefetch aria-label="코스로 돌아가기" className="absolute left-3 top-[calc(10px+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-400 shadow-sm ring-2 ring-slate-200 active:scale-95">
        <X className="h-5 w-5 stroke-[2.5]" />
      </Link>
    </div>
  );
}
