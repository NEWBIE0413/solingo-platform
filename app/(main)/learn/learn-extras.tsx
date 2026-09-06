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
  const [weak, completed] = await Promise.all([
    countWeakChallenges(),
    countCompletedChallenges(),
  ]);
  const sub =
    weak > 0
      ? `틀린 문항 ${weak}개`
      : completed > 0
        ? "완료 문항 다시 풀기"
        : "레슨 하나 끝내면 열려요";
  // one sleek row, tactile and compact: the unit banner and path below are the hero elements
  return (
    <Link
      href="/practice"
      prefetch
      className="group mb-3 flex h-11 items-center gap-2.5 rounded-xl border border-dashed border-sky-300 bg-sky-50/70 px-3.5 transition-all hover:border-sky-400 hover:bg-sky-50 active:scale-[0.99] active:bg-sky-100/70 motion-reduce:active:scale-100 lg:mb-6"
    >
      <span className="text-lg leading-none" aria-hidden="true">
        🎯
      </span>
      <span className="text-sm font-bold text-neutral-800">약점 복습</span>
      <span className="ml-1 truncate text-xs font-medium text-sky-700/80">
        {sub}
      </span>
      <ChevronRight className="ml-auto h-4 w-4 flex-none text-sky-400 transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
};
