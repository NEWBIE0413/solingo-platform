import Link from "next/link";

import { countWeakChallenges } from "@/db/queries";

/*
 One card above the unit path: 약점 복습. It is a "different kind of thing to do" rather than a
 step on the path, hence the dashed border. (히라가나 훈련 is its own course in 언어 코스.)
*/
export const LearnExtras = async () => {
  const weak = await countWeakChallenges();
  return (
    <div className="mb-10">
      <Link href="/practice" className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-4 transition-colors hover:bg-sky-50">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-sky-100 text-2xl">🎯</span>
        <span>
          <span className="block font-bold text-neutral-700">약점 복습</span>
          <span className="block text-xs text-muted-foreground">{weak > 0 ? `틀린 문항 ${weak}개가 기다려요` : "틀린 문항이 다시 나와요"}</span>
        </span>
      </Link>
    </div>
  );
};
