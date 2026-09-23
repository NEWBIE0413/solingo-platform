"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setDailyGoalAction } from "@/actions/streak";
import { DAILY_GOAL_OPTIONS } from "@/constants";
import { cn } from "@/lib/utils";

/*
 오늘 목표: how many study sessions today against a goal the learner picks. Attendance still needs one;
 the goal is the "and a bit more" a study plan asks for (e.g. two lessons a day before an exam).
*/
export const DailyGoal = ({ done, goal: initial }: { done: number; goal: number }) => {
  const [goal, setGoal] = useState(initial);
  const [pending, start] = useTransition();
  const met = done >= goal;
  const pick = (g: number) => {
    if (g === goal) return;
    const prev = goal;
    setGoal(g);
    start(async () => {
      const r = await setDailyGoalAction(g);
      if ("error" in r) { setGoal(prev); toast.error(r.error); }
    });
  };
  return (
    <div className="mb-4 w-full rounded-2xl border-2 border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-neutral-700">🎯 오늘 목표</span>
        <span className={cn("text-sm font-black tabular-nums", met ? "text-green-600" : "text-sky-600")}>
          {met ? "달성! " : ""}{done} / {goal}번
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(done, goal)}>
        <div className={cn("h-full rounded-full transition-[width] duration-500", met ? "bg-green-500" : "bg-sky-400")} style={{ width: `${Math.min(100, Math.round((100 * done) / goal))}%` }} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-400">하루</span>
        {DAILY_GOAL_OPTIONS.map((g) => (
          <button
            key={g}
            type="button"
            disabled={pending}
            onClick={() => pick(g)}
            aria-pressed={g === goal}
            className={cn(
              "h-11 min-w-11 flex-1 rounded-xl border-2 border-b-4 text-sm font-bold active:translate-y-[2px] active:border-b-2",
              g === goal ? "border-sky-400 bg-sky-50 text-sky-600" : "border-slate-200 bg-white text-neutral-500",
            )}
          >
            {g}번
          </button>
        ))}
      </div>
    </div>
  );
};
