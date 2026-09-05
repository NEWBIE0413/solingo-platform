/*
 Pure definitions for the gem economy — quests, shop catalogue, helpers. No database imports,
 so client components can use them: importing lib/economy.ts (which loads pg) from a
 "use client" file pulled node built-ins into the browser bundle and broke every page that
 rendered the shop or profile.
*/
export type QuestDef = {
  key: string;
  name: string;
  hint: string;
  gems: number;
  oneOff?: boolean; // streak7/30/100: day 없이 한 번만
  goal: number;
  progress: (d: { lessons: number; xp: number; practice: number; kana: number; coupleBoth: boolean; streak: number }) => number;
  onlyCourse?: "kana"; // 일본어 코스 사용자에게만 노출
};

export const QUEST_DEFS: QuestDef[] = [
  { key: "lesson1", name: "오늘의 레슨", hint: "레슨 1개 완료", gems: 5, goal: 1, progress: (d) => d.lessons },
  { key: "lesson3", name: "성실한 하루", hint: "레슨 3개 완료", gems: 10, goal: 3, progress: (d) => d.lessons },
  { key: "xp50", name: "오늘 XP 50", hint: "하루 XP 50 모으기", gems: 10, goal: 50, progress: (d) => d.xp },
  { key: "practice1", name: "약점 복습", hint: "약점 복습 1회 완료", gems: 10, goal: 1, progress: (d) => d.practice },
  { key: "kana1", name: "가나 훈련", hint: "히라가나 세션 1회 완료", gems: 5, goal: 1, progress: (d) => d.kana, onlyCourse: "kana" },
  { key: "couple", name: "커플 출석", hint: "오늘 둘 다 출석", gems: 15, goal: 1, progress: (d) => (d.coupleBoth ? 1 : 0) },
  { key: "streak7", name: "연속 7일", hint: "연속 출석 7일 도달", gems: 50, goal: 7, oneOff: true, progress: (d) => d.streak },
  { key: "streak30", name: "연속 30일", hint: "연속 출석 30일 도달", gems: 200, goal: 30, oneOff: true, progress: (d) => d.streak },
  { key: "streak100", name: "연속 100일", hint: "연속 출석 100일 도달", gems: 500, goal: 100, oneOff: true, progress: (d) => d.streak },
];

export const SHOP_ITEMS = [
  { key: "freeze", kind: "consumable", name: "연속 출석 보호", desc: "하루 빠져도 연속 출석이 끊기지 않아요 (최대 2개 보유)", gems: 50, maxQty: 2, icon: "/shop-freeze.svg" },
  { key: "frame_sky", kind: "frame", name: "맑은 하늘 테두리", gems: 30, icon: "/frame-sky.svg", color: "#38bdf8" },
  { key: "frame_rose", kind: "frame", name: "장미 테두리", gems: 60, icon: "/frame-rose.svg", color: "#fb7185" },
  { key: "frame_gold", kind: "frame", name: "황금 테두리", gems: 100, icon: "/frame-gold.svg", color: "#f59e0b" },
  { key: "title_early", kind: "title", name: "새벽형 학습자", gems: 20 },
  { key: "title_kana", kind: "title", name: "가나 정복자", gems: 40 },
  { key: "title_couple", kind: "title", name: "커플 파워", gems: 40 },
  { key: "title_month", kind: "title", name: "한 달 여행자", gems: 60 },
  { key: "title_master", kind: "title", name: "한국어 탐험가", gems: 80 },
  { key: "mascot_spring", kind: "mascot", name: "마스코트: 봄", gems: 80, icon: "/mascot-spring.svg" },
  { key: "mascot_ocean", kind: "mascot", name: "마스코트: 바다", gems: 80, icon: "/mascot-ocean.svg" },
  { key: "mascot_sunset", kind: "mascot", name: "마스코트: 노을", gems: 80, icon: "/mascot-sunset.svg" },
] as const;

export type ShopItem = (typeof SHOP_ITEMS)[number];
export const shopItem = (key: string) => SHOP_ITEMS.find((i) => i.key === key) as ShopItem | undefined;
