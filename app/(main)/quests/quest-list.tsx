"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import { toast } from "sonner";

import { claimQuestAction } from "@/actions/economy";
import { Button } from "@/components/ui/button";
import { useCelebrate } from "@/store/use-celebrate";
import { cn } from "@/lib/utils";

type Quest = {
  key: string;
  name: string;
  hint: string;
  gems: number;
  oneOff?: boolean;
  goal: number;
  have: number;
  claimed: boolean;
  done: boolean;
};

export const QuestList = ({
  quests,
  initialGems,
}: {
  quests: Quest[];
  initialGems: number;
}) => {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<
    Record<string, { claimed: boolean; have: number }>
  >(
    Object.fromEntries(
      quests.map((q) => [q.key, { claimed: q.claimed, have: q.have }])
    )
  );
  const [busy, setBusy] = useState<string | null>(null);
  const celebrate = useCelebrate((s) => s.fire);

  const onClaim = (key: string) => {
    if (pending) return;
    setBusy(key);
    startTransition(() => {
      claimQuestAction(key)
        .then((r) => {
          if (r.ok) {
            setState((prev) => ({
              ...prev,
              [key]: { claimed: true, have: prev[key]?.have ?? 0 },
            }));
            const reward =
              "reward" in r && typeof r.reward === "number"
                ? r.reward
                : undefined;
            const q = quests.find((x) => x.key === key);
            celebrate({
              kind: "quest",
              title: "퀘스트 달성!",
              subtitle: q?.name,
              gems: reward,
            });
          } else {
            const msg: Record<string, string> = {
              "already-claimed": "이미 받았어요.",
              "not-done": "아직 달성하지 못했어요.",
            };
            toast.error(msg[r.error ?? ""] ?? "문제가 생겼어요.");
          }
        })
        .catch(() => toast.error("문제가 생겼어요."))
        .finally(() => setBusy(null));
    });
  };

  const rows = quests.map((q) => ({
    ...q,
    ...(state[q.key] ?? { claimed: q.claimed, have: q.have }),
  }));

  return (
    <ul className="w-full space-y-3 pb-8">
      {rows.map((q) => {
        const pct = Math.min(100, (q.have / q.goal) * 100);
        const canClaim = q.done && !q.claimed;
        return (
          <li
            key={q.key}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-2xl border-2 p-3.5 shadow-[0_2px_0_0_rgba(0,0,0,0.03)] transition-all sm:p-4",
              canClaim
                ? "border-emerald-300 bg-emerald-50/40"
                : "border-slate-200 bg-white"
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 flex-none items-center justify-center rounded-2xl text-2xl shadow-inner",
                q.done ? "bg-emerald-100" : "bg-slate-100"
              )}
            >
              {q.oneOff
                ? "🔥"
                : q.key === "practice1"
                  ? "🎯"
                  : q.key === "kana1"
                    ? "🈁"
                    : q.key === "couple"
                      ? "💞"
                      : q.key === "xp50"
                        ? "⚡️"
                        : "📚"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold tracking-tight text-neutral-800 sm:text-base">
                  {q.name}
                  {q.oneOff && (
                    <span className="ml-1.5 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-600">
                      일회성
                    </span>
                  )}
                </p>
                <span className="inline-flex flex-none items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-xs font-black text-sky-600">
                  <span>💎</span>
                  <span>{q.gems}</span>
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                {q.hint} · {Math.min(q.have, q.goal)}/{q.goal}
              </p>
            </div>
            <Button
              size="sm"
              variant={canClaim ? "secondary" : q.claimed ? "ghost" : "locked"}
              disabled={pending || busy === q.key || q.claimed || !q.done}
              onClick={() => onClaim(q.key)}
              className={cn(
                "h-10 min-w-[70px] text-xs font-black",
                canClaim && "shadow-sm",
                q.claimed && "font-bold text-neutral-400"
              )}
            >
              {q.claimed ? "받음" : q.done ? "받기" : "진행 중"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
};
