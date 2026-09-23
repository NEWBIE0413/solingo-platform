// Solingo is self-hosted for a couple of people: everyone gets the '슈퍼' plan (unlimited hearts).
// Flip to false to bring back the Stripe-gated subscription.
export const EVERYONE_IS_PRO = true;

export const POINTS_TO_REFILL = 10;

export const MAX_HEARTS = 5;

// 하루 목표로 고를 수 있는 학습 횟수(레슨·약점 복습·가나 세션). 출석은 여전히 한 번이면 된다.
export const DAILY_GOAL_OPTIONS = [1, 2, 3, 5] as const;


// A unit with this title in any course is that course's placement test: its first attempts become the
// level report (lib/level.ts, /level). Course authors opt in just by naming a unit this way.
export const PLACEMENT_UNIT_TITLE = "레벨 테스트";

// A course row with no units: selecting it turns the 학습 page into the kana trainer (public/kana engine).
export const KANA_TRAINER_TITLE = "히라가나 훈련";
