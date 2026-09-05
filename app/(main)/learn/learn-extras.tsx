import Link from "next/link";

import { countCompletedChallenges, countWeakChallenges } from "@/db/queries";

/*
 One card above the unit path: 약점 복습. It is a "different kind of thing to do" rather than a
 step on the path, hence the dashed border. (히라가나 훈련 is its own course in 언어 코스.)
 문구는 상태를 따라간다 — 틀린 문항이 있으면 알리고, 없으면 완료 문항 복습을 안내하고,
 복습할 게 아무것도 없으면 카드가 왜 잠겨 있는지 말해준다.
*/
export const LearnExtras = async () => {
  const [weak, completed] = await Promise.all([countWeakChallenges(), countCompletedChallenges()]);
  const sub =
    weak > 0 ? `틀린 문항 ${weak}개가 기다려요` : completed > 0 ? "완료한 문항을 오래된 순으로 다시 풀어요" : "먼저 레슨 하나를 끝내면 복습이 열려요";
  return (
    <div className="mb-10">
      <Link href="/practice" className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-4 transition-colors hover:bg-sky-50">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-sky-100 text-2xl">🎯</span>
        <span>
          <span className="block font-bold text-neutral-700">약점 복습</span>
          <span className="block text-xs text-muted-foreground">{sub}</span>
        </span>
      </Link>
    </div>
  );
};
