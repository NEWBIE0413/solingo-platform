/*
 XP rules, shared by the server that credits them (actions/attempts.ts, actions/streak.ts) and the
 lesson-end summary that shows them, so the number on the screen is the number on the leaderboard.
 The weights follow what helps learning: reviewing a weak item pays most, replaying a lesson that is
 already done pays least (it used to pay full, which made easy replays the best way to earn XP).
 No database imports: the lesson runner is a client component.
*/
export const XP = {
  first: 10, // a new item, right on the first try
  recovered: 5, // right after missing it earlier in the same run
  replay: 3, // an item of a lesson already completed
  practice: 15, // 약점 복습, right on the first try
  perfect: 10, // bonus: every item right on the first try
  combo: 2, // bonus: each time a run of correct answers reaches a multiple of 5
  goal: 20, // bonus: the session that meets the day's goal
} as const;

// A run that long is already rewarded enough; past this the combo bonus stops growing.
const MAX_COMBO_BONUSES = 4;

export const answerXp = ({ practice, recovered, replay }: { practice: boolean; recovered: boolean; replay: boolean }) =>
  practice ? (recovered ? XP.recovered : XP.practice) : replay ? XP.replay : recovered ? XP.recovered : XP.first;

export type Bonus = { perfect: number; combo: number; goal: number; total: number };

export const sessionBonus = ({ perfect, combos, goalMet }: { perfect: boolean; combos: number; goalMet: boolean }): Bonus => {
  const b = {
    perfect: perfect ? XP.perfect : 0,
    combo: Math.min(Math.max(0, Math.floor(combos)), MAX_COMBO_BONUSES) * XP.combo,
    goal: goalMet ? XP.goal : 0,
  };
  return { ...b, total: b.perfect + b.combo + b.goal };
};
