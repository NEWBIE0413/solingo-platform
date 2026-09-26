"use client";

import { useEffect, useRef } from "react";

import { Check, Crown, Star } from "lucide-react";
import Link from "next/link";
import { CircularProgressbarWithChildren } from "react-circular-progressbar";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import "react-circular-progressbar/dist/styles.css";

type LessonButtonProps = {
  id: number;
  index: number;
  totalCount: number;
  locked?: boolean;
  current?: boolean;
  percentage: number;
  moment?: "done" | "opened"; // just finished / just opened by that finish (learn/page.tsx)
};

export const LessonButton = ({
  id,
  index,
  totalCount,
  locked,
  current,
  percentage,
  moment,
}: LessonButtonProps) => {
  const ref = useRef<HTMLDivElement>(null);
  // The path's reward moment: bring the node into view (the opened one wins — it comes later in the
  // path) and drop ?done, so a reload or a back navigation doesn't replay it.
  useEffect(() => {
    if (!moment) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    if (moment === "done") window.history.replaceState(null, "", "/learn");
  }, [moment]);

  const cycleLength = 8;
  const cycleIndex = index % cycleLength;

  let indentationLevel;

  if (cycleIndex <= 2) indentationLevel = cycleIndex;
  else if (cycleIndex <= 4) indentationLevel = 4 - cycleIndex;
  else if (cycleIndex <= 6) indentationLevel = 4 - cycleIndex;
  else indentationLevel = cycleIndex - 8;

  const rightPosition = indentationLevel * 36;

  const isFirst = index === 0;
  const isLast = index === totalCount;
  const isCompleted = !current && !locked;

  const Icon = isCompleted ? Check : isLast ? Crown : Star;

  const href = isCompleted ? `/lesson/${id}` : "/lesson";

  const marginTop = isFirst ? (current ? 34 : 20) : 20;

  return (
    <Link
      href={href}
      prefetch
      aria-disabled={locked}
      style={{ pointerEvents: locked ? "none" : "auto" }}
    >
      <div
        ref={ref}
        className={cn(
          "relative",
          moment === "done" && "animate-[node-done_.5s_.25s_backwards] motion-reduce:animate-none",
          moment === "opened" && "animate-[node-unlock_.5s_.8s_backwards] motion-reduce:animate-none"
        )}
        style={{
          right: `${rightPosition}px`,
          marginTop: `${marginTop}px`,
        }}
      >
        {current ? (
          <div className="relative h-[96px] w-[96px]">
            <div className="absolute -top-7 left-1/2 z-10 -translate-x-1/2">
              <div className={cn(moment === "opened" && "animate-[drop-in_.35s_1.2s_cubic-bezier(0.23,1,0.32,1)_backwards] motion-reduce:animate-none")}>
                <div className="relative animate-bounce whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-green-600 shadow-sm motion-reduce:animate-none">
                  시작
                  <div
                    className="absolute -bottom-1.5 left-1/2 h-0 w-0 -translate-x-1/2 transform border-x-[5px] border-t-[6px] border-x-transparent border-t-white"
                    aria-hidden
                  />
                </div>
              </div>
            </div>
            <CircularProgressbarWithChildren
              value={Number.isNaN(percentage) ? 0 : percentage}
              styles={{
                path: {
                  stroke: "#22c55e",
                  strokeWidth: 6,
                  strokeLinecap: "round",
                },
                trail: {
                  stroke: "#e2e8f0",
                  strokeWidth: 6,
                },
              }}
            >
              <Button
                size="rounded"
                variant={locked ? "locked" : "secondary"}
                className="h-[68px] w-[68px] border-b-8 transition duration-100 ease-out active:translate-y-1.5 active:border-b-2 motion-reduce:active:translate-y-0"
              >
                <Icon
                  className={cn(
                    "h-8 w-8",
                    locked
                      ? "fill-neutral-400 stroke-neutral-400 text-neutral-400"
                      : "fill-primary-foreground text-primary-foreground",
                    isCompleted && "fill-none stroke-[3.5]"
                  )}
                />
              </Button>
            </CircularProgressbarWithChildren>
          </div>
        ) : (
          <Button
            size="rounded"
            variant={locked ? "locked" : "secondary"}
            className="h-[68px] w-[68px] border-b-8 transition duration-100 ease-out active:translate-y-1.5 active:border-b-2 motion-reduce:active:translate-y-0"
          >
            <Icon
              className={cn(
                "h-8 w-8",
                locked
                  ? "fill-neutral-400 stroke-neutral-400 text-neutral-400"
                  : "fill-primary-foreground text-primary-foreground",
                isCompleted && "fill-none stroke-[3.5]",
                moment === "done" && "animate-[stamp_.45s_.4s_backwards] motion-reduce:animate-none"
              )}
            />
          </Button>
        )}
      </div>
    </Link>
  );
};
