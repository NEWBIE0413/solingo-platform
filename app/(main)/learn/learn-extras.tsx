import Link from "next/link";

import { countWeakChallenges } from "@/db/queries";

/*
 학습 길 위의 두 장의 카드: 히라가나 훈련(일본어 코스만)과 약점 복습.
 유닛 배너와 시각적으로 구분되게 점선 테두리를 썼다 — "진행 길"이 아니라 "또 다른 할 일".
*/
export const LearnExtras = async ({ courseTitle }: { courseTitle: string }) => {
  const isJapanese = courseTitle.includes("가나") || courseTitle.includes("JLPT");
  const weak = await countWeakChallenges();

  return (
    <div className={`mb-10 grid grid-cols-1 gap-3 ${isJapanese ? "sm:grid-cols-2" : ""}`}>
      {isJapanese && (
        <Link href="/kana" className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/50 p-4 transition-colors hover:bg-rose-50">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-rose-100 text-2xl">🈁</span>
          <span>
            <span className="block font-bold text-neutral-700">히라가나 훈련</span>
            <span className="block text-xs text-muted-foreground">문자 훈련 · 몇 번이든 써보기</span>
          </span>
        </Link>
      )}
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

