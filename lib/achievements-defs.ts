/*
 업적 정의 — DB 없는 모듈(클라이언트 컴포넌트가 import 한다).
 업적은 별도 카운터를 세지 않고 이미 있는 수치(출석·XP·학습 횟수·퀘스트·상점·커플)에서
 파생된다. 그래서 여기 한 줄을 추가하면 곧바로 모든 사용자에게 적용되고, 조건을 이미 넘긴
 사람은 다음 레슨 끝에서 한 번에 받는다(lib/achievements.ts).
*/
export type AchievementGroup = "lessons" | "streak" | "xp" | "quests" | "shop" | "couple";
export type AchievementDef = { key: string; group: AchievementGroup; goal: number; name: string; desc: string; emoji: string };
export type AchievementView = AchievementDef & { progress: number; unlocked: boolean };

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: "lessons_1", group: "lessons", goal: 1, name: "첫 걸음", desc: "첫 학습 세션을 끝냈어요", emoji: "🌱" },
  { key: "lessons_10", group: "lessons", goal: 10, name: "열 번째", desc: "학습 세션 10회", emoji: "📚" },
  { key: "lessons_50", group: "lessons", goal: 50, name: "단골 학습자", desc: "학습 세션 50회", emoji: "🎓" },
  { key: "lessons_200", group: "lessons", goal: 200, name: "학습 기계", desc: "학습 세션 200회", emoji: "🏛️" },
  { key: "streak_3", group: "streak", goal: 3, name: "사흘 연속", desc: "3일 연속 출석", emoji: "🔥" },
  { key: "streak_7", group: "streak", goal: 7, name: "일주일 연속", desc: "7일 연속 출석", emoji: "🔥" },
  { key: "streak_30", group: "streak", goal: 30, name: "한 달 연속", desc: "30일 연속 출석", emoji: "🌋" },
  { key: "xp_100", group: "xp", goal: 100, name: "XP 100", desc: "XP 100 달성", emoji: "⚡" },
  { key: "xp_500", group: "xp", goal: 500, name: "XP 500", desc: "XP 500 달성", emoji: "⚡" },
  { key: "xp_2000", group: "xp", goal: 2000, name: "XP 2000", desc: "XP 2000 달성", emoji: "🌟" },
  { key: "quests_5", group: "quests", goal: 5, name: "퀘스트 5", desc: "퀘스트 보상 5회 수령", emoji: "🏅" },
  { key: "quests_25", group: "quests", goal: 25, name: "퀘스트 25", desc: "퀘스트 보상 25회 수령", emoji: "🏆" },
  { key: "shop_1", group: "shop", goal: 1, name: "첫 쇼핑", desc: "상점에서 첫 구매", emoji: "🛍️" },
  { key: "couple_7", group: "couple", goal: 7, name: "함께 일주일", desc: "커플 연속 출석 7일", emoji: "💞" },
];
