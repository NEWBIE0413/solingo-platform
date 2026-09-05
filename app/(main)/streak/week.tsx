import { Check, Snowflake } from "lucide-react";

import { cn } from "@/lib/utils";
import { weekDays } from "@/lib/streak";

const LABELS = ["월", "화", "수", "목", "금", "토", "일"];

// 이번 주(월~일, KST) 7칸: 출석 ✓(초록) · 보호권 ❄(하늘) · 결석(회색 빈 원) · 오늘 미완(초록 점선).
export const WeekCalendar = async ({ userId }: { userId: string }) => {
  const days = await weekDays(userId);

  return (
    <div className="mb-6 w-full rounded-2xl border-2 border-slate-200 p-4">
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d, i) => (
          <div key={d.day} className="flex flex-col items-center gap-1.5">
            <span className={cn("text-xs font-bold", d.isToday ? "text-green-500" : "text-neutral-400")}>{LABELS[i]}</span>
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2",
                d.attended && "border-green-500 bg-green-500 text-white",
                d.frozen && "border-sky-300 bg-sky-100 text-sky-500",
                !d.attended && !d.frozen && (d.isToday ? "border-dashed border-green-500" : "border-slate-300"),
              )}
              title={`${d.day}${d.frozen ? " · 보호권" : d.attended ? " · 출석" : ""}`}
            >
              {d.attended ? <Check className="h-5 w-5" strokeWidth={3} /> : d.frozen ? <Snowflake className="h-5 w-5" /> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
