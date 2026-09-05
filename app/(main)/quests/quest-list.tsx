"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import { toast } from "sonner";

import { claimQuestAction } from "@/actions/economy";
import { Button } from "@/components/ui/button";

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

export const QuestList = ({ quests, initialGems }: { quests: Quest[]; initialGems: number }) => {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<Record<string, { claimed: boolean; have: number }>>(
    Object.fromEntries(quests.map((q) => [q.key, { claimed: q.claimed, have: q.have }]))
  );
  const [busy, setBusy] = useState<string | null>(null);

  const onClaim = (key: string) => {
    if (pending) return;
    setBusy(key);
    startTransition(() => {
      claimQuestAction(key)
        .then((r) => {
          if (r.ok) {
            setState((prev) => ({ ...prev, [key]: { claimed: true, have: prev[key]?.have ?? 0 } }));
            if ("gems" in r && typeof r.gems === "number") toast.success(`젬 +${r.gems}!`);
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

  const rows = quests.map((q) => ({ ...q, ...(state[q.key] ?? { claimed: q.claimed, have: q.have }) }));

  return (
    <ul className="w-full">
      {rows.map((q) => {
        const pct = Math.min(100, (q.have / q.goal) * 100);
        return (
          <div className="flex w-full items-center gap-x-4 border-t-2 p-4" key={q.key}>
            <div className={`flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl text-2xl ${q.done ? "bg-emerald-100" : "bg-slate-100"}`}>
              {q.oneOff ? "🔥" : q.key === "practice1" ? "🎯" : q.key === "kana1" ? "🈁" : q.key === "couple" ? "💞" : q.key === "xp50" ? "⚡️" : "📚"}
            </div>
            <div className="flex w-full flex-col gap-y-1.5">
              <p className="text-lg font-bold text-neutral-700">
                {q.name} <span className="ml-2 text-sm font-semibold text-sky-600">💎 {q.gems}</span>
              </p>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{q.hint} · {Math.min(q.have, q.goal)}/{q.goal}{q.oneOff ? " (일회성)" : ""}</p>
            </div>
            <Button
              size="sm"
              variant={q.claimed ? "secondary" : q.done ? "default" : "secondary"}
              disabled={pending || busy === q.key || q.claimed || !q.done}
              onClick={() => onClaim(q.key)}
              className="h-10 min-w-[72px]"
            >
              {q.claimed ? "받음" : q.done ? "받기" : "진행 중"}
            </Button>
          </div>
        );
      })}
    </ul>
  );
};
