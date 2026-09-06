import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { countCompletedChallenges, countWeakChallenges } from "@/db/queries";

/*
 One card above the unit path: 약점 복습. It is a "different kind of thing to do" rather than a
 step on the path, hence the dashed border. (히라가나 훈련 is its own course in 언어 코스.)
 문구는 상태를 따라간다 — 틀린 문항이 있으면 알리고, 없으면 완료 문항 복습을 안내하고,
 복습할 게 아무것도 없으면 카드가 왜 잠겨 있는지 말해준다.
*/
export const LearnExtras = async () => {
  const [weak, completed] = await Promise.all([countWeakChallenges(), countCompletedChallenges()]);
  const sub = weak > 0 ? `틀린 문항 ${weak}개` : completed > 0 ? "완료 문항 다시 풀기" : "레슨 하나 끝내면 열려요";
  // one row, not a card: the path below is the main event and should start near the top of the screen
  return (
    <Link href="/practice" className="mb-4 flex h-12 items-center gap-2.5 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/60 px-3 transition-colors hover:bg-sky-50 lg:mb-8">
      <span className="text-xl leading-none">🎯</span>
      <span className="font-bold text-neutral-700">약점 복습</span>
      <span className="ml-1 truncate text-sm text-muted-foreground">{sub}</span>
      <ChevronRight className="ml-auto h-5 w-5 flex-none text-sky-400" />
    </Link>
  );
};
