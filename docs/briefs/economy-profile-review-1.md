# economy 브랜치 중간 검토 1 (오케스트레이터, 2026-09-05)

돈 경로부터 읽었다. 구조(quest_claims PK 뒤 지급, 트랜잭션 구매, freeze 멱등)는 브리프대로다. 아래는 고쳐야 하는 것 — 위에서부터 중요한 순서.

## A. 버그 (머지 전 필수)

1. **정답마다 레슨 수가 오른다.** `actions/attempts.ts`의 `submitAnswer`가 정답마다 `recordActivity(userId, "lesson", 10)`을 부른다. `recordActivity`는 kind가 lesson이면 `lessons +1`이므로, 정답 1개에 lesson1 달성, 3개에 lesson3 달성, 출석의 의미(레슨 1개 완료)도 무너진다.
   → kind에 `"xp"`를 추가해 카운터는 건드리지 않고 `xp`만 더하게 하고, `submitAnswer`는 그것만 쓴다. `lessons`는 `recordLessonComplete("lesson")` 한 곳에서만 오른다.

2. **커플 연속이 상대의 결석을 내 출석으로 메운다.** `getCoupleStatus`가 `streakFrom(both, userId)`로 교집합의 빈 날을 bridging하는데, `consumeFreeze(userId, day)`는 *내* 행이 있으면 소모 없이 `true`를 돌려준다. 그래서 상대만 빠진 날이 "둘 다 출석"으로 계산된다.
   → 순서를 바꿔라: 두 사람 각자 `getStreak()`(각자의 freeze로 각자의 결석을 메움) → 각자 `activeDays` 재조회(frozen 행 포함) → 교집합 → `streakFrom(both)`는 **bridging 없이**(userId 넘기지 않음).

3. **히라가나 세션이 두 번 세어진다.** 엔진 `finish()`가 `save()`(xpDelta 포함 PUT)와 `apiPut({sessionComplete:true})`를 따로 보내고, 라우트는 둘 다 `recordActivity("kana")`를 부른다 → `kana` +2.
   → 라우트에서 `xp>0`이면 kind `"xp"`, `sessionComplete`일 때만 kind `"kana"`.

4. **동시 구매·소모가 잔고를 뚫는다.** `buyItem`은 gems를 읽고 나서 `set gems = row.gems - X`로 쓴다. 두 요청이 같은 잔고를 읽으면 둘 다 통과한다. `consumeFreeze`의 qty도 같다.
   → 조건부 UPDATE로: `update user_progress set gems = gems - X where user_id=? and gems >= X returning gems` — 행이 안 돌아오면 실패. freeze는 `set qty = qty - 1 where qty >= 1 returning`.

## B. 브리프 대비 미완 (회신 전 채울 것)

5. 상점 아이콘 7개가 없다: `shop-freeze`, `frame-sky/rose/gold`, `mascot-spring/ocean/sunset`. 깨진 이미지로 뜬다. SVG를 만들거나(마스코트는 `public/mascot.svg` 색 변형이면 충분) 참조를 지워라.
6. `/learn` 상단 카드 2개(히라가나 훈련 → /kana, 활성 코스가 일본어일 때만 · 약점 복습 → /practice, 약한 문항 수 표시)가 아직 없다.
7. 리더보드 행에 장착한 테두리·칭호가 아직 안 보인다. 꾸밀 이유가 거기서 생긴다.
8. `/level` 리다이렉트가 `?user=`를 버린다 → 관리자 딥링크가 깨진다. 파라미터를 `/profile?user=`로 넘겨라.
9. 잔재: `constants.QUESTS`와 `components/quests.tsx`를 `learn/page.tsx`·`leaderboard/page.tsx`가 아직 import한다. 새 퀘스트 보드로 대체하거나 제거.
10. 상점의 "슈퍼 이용 중" 표시는 유지하기로 했다(브리프). 하트 채우기 항목만 숨긴다.

## C. 회신
성공 기준 5개는 브리프 그대로. 특히 기준 1(수령 후 재수령 불가)과 3(freeze 소모·멱등)은 DB 행으로 증명해라. 위 A 네 개는 각각 "고쳤다 / 어떻게"를 한 줄씩.
